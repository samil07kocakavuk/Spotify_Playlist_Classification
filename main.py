import os
from datetime import datetime

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

from spotify import (
    extract_playlist_id,
    fetch_playlist_tracks,
    process_playlist,
    save_grouped_tracks_to_spotify,
)

CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")
REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI", "http://127.0.0.1:3000/callback")

origins_env = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
ALLOWED_ORIGINS = [origin.strip() for origin in origins_env.split(",") if origin.strip()]

# Mobil/LAN erişimi için (örn. 192.168.x.x) varsayılan regex.
origin_regex_env = os.getenv(
    "CORS_ORIGIN_REGEX",
    r"https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$",
)

app = FastAPI(title="Spotify Playlist Classifier API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=origin_regex_env or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _log(message: str) -> None:
    now = datetime.now().strftime("%H:%M:%S")
    print(f"[{now}] [main.py] {message}", flush=True)


class CodeRequest(BaseModel):
    code: str
    redirect_uri: str | None = None


class PlaylistInfoRequest(BaseModel):
    playlist_url: str


class ClassifyRequest(BaseModel):
    playlist_url: str
    emotions: list[str]


class TrackPayload(BaseModel):
    id: str | None = None
    name: str | None = None
    artist: str | None = None
    url: str | None = None


class SavePlaylistsRequest(BaseModel):
    access_token: str
    grouped_tracks: dict[str, list[TrackPayload]]
    playlist_names: dict[str, str] = Field(default_factory=dict)
    public: bool = False

@app.get("/")
def root() -> dict:
    return {"ok": True}

@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/playlist_info")
def playlist_info(data: PlaylistInfoRequest) -> dict:
    _log(f"/playlist_info çağrıldı. url={data.playlist_url}")
    try:
        playlist_id = extract_playlist_id(data.playlist_url)
        songs = fetch_playlist_tracks(playlist_id)
        _log(f"/playlist_info başarılı. playlist_id={playlist_id}, total_songs={len(songs)}")
        return {
            "playlist_id": playlist_id,
            "total_songs": len(songs),
            "example_batch": songs[:10],
        }
    except ValueError as exc:
        _log(f"/playlist_info hata (400): {exc}")
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        _log(f"/playlist_info hata (500): {exc}")
        raise HTTPException(status_code=500, detail=f"Playlist okunamadı: {exc}")


@app.post("/classify")
def classify(data: ClassifyRequest) -> dict:
    _log(f"/classify çağrıldı. url={data.playlist_url}, emotions={data.emotions}")
    try:
        result = process_playlist(data.playlist_url, data.emotions)
        _log(
            f"/classify başarılı. playlist_id={result.get('playlist_id')}, "
            f"total_songs={result.get('total_songs')}, total_batches={result.get('total_batches')}, "
            f"failed_batches={len(result.get('failed_batches', []))}"
        )
        return result
    except ValueError as exc:
        _log(f"/classify hata (400): {exc}")
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        message = str(exc)
        lowered = message.lower()

        if "429" in lowered or "rate-limit" in lowered or "rate limit" in lowered:
            _log(f"/classify hata (503-rate-limit): {message}")
            raise HTTPException(status_code=503, detail=f"AI servisinde geçici yoğunluk var, lütfen 20-60 sn sonra tekrar deneyin. Detay: {message}")

        _log(f"/classify hata (500): {message}")
        raise HTTPException(status_code=500, detail=f"Sınıflandırma başarısız: {message}")


@app.post("/spotify/token")
def get_token(data: CodeRequest) -> dict:
    redirect_uri = (data.redirect_uri or REDIRECT_URI).strip()
    _log(f"/spotify/token çağrıldı. redirect_uri={redirect_uri}")

    if not CLIENT_ID or not CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET .env içinde tanımlı olmalı")

    response = requests.post(
        "https://accounts.spotify.com/api/token",
        data={
            "grant_type": "authorization_code",
            "code": data.code,
            "redirect_uri": redirect_uri,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )

    if response.status_code != 200:
        try:
            detail = response.json()
        except Exception:
            detail = response.text
        _log(f"/spotify/token hata: status={response.status_code}, detail={detail}")
        raise HTTPException(status_code=response.status_code, detail=detail)

    _log("/spotify/token başarılı")
    return response.json()


@app.post("/save_playlists")
def save_playlists(data: SavePlaylistsRequest) -> dict:
    _log(f"/save_playlists çağrıldı. categories={len(data.grouped_tracks)}")

    grouped_tracks = {
        emotion: [track.model_dump() for track in tracks]
        for emotion, tracks in data.grouped_tracks.items()
    }

    try:
        result = save_grouped_tracks_to_spotify(
            access_token=data.access_token,
            grouped_tracks=grouped_tracks,
            playlist_names=data.playlist_names,
            public=data.public,
        )
        _log(
            f"/save_playlists başarılı. created={len(result.get('created_playlists', []))}, "
            f"skipped={len(result.get('skipped', []))}"
        )
        return result
    except RuntimeError as exc:
        message = str(exc)
        if "(401)" in message or "invalid access token" in message.lower() or "token expired" in message.lower():
            _log(f"/save_playlists hata (401): {message}")
            raise HTTPException(status_code=401, detail=message)

        _log(f"/save_playlists hata (400): {message}")
        raise HTTPException(status_code=400, detail=message)
    except Exception as exc:
        _log(f"/save_playlists hata (500): {exc}")
        raise HTTPException(status_code=500, detail=f"Playlist kaydetme başarısız: {exc}")
