import json
import os
import re
import time
import unicodedata
from collections import Counter
from datetime import datetime
from typing import Callable

import requests
import spotipy
from dotenv import load_dotenv
from spotipy.oauth2 import SpotifyClientCredentials

load_dotenv()

CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID", "")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET", "")

OPENROUTER_API_BASE = os.getenv("OPENROUTER_API_BASE", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemma-3-27b-it:free")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MAX_RETRIES = int(os.getenv("OPENROUTER_MAX_RETRIES", "3"))
OPENROUTER_HTTP_REFERER = os.getenv("OPENROUTER_HTTP_REFERER", "http://127.0.0.1:3000")
OPENROUTER_APP_TITLE = os.getenv("OPENROUTER_APP_TITLE", "Spotify Playlist Classifier")

CLASSIFY_BATCH_SIZE = int(os.getenv("CLASSIFY_BATCH_SIZE", "20"))
CLASSIFY_DELAY_MS = int(os.getenv("CLASSIFY_DELAY_MS", "250"))
CLASSIFY_FAIL_ON_BATCH_ERROR = os.getenv("CLASSIFY_FAIL_ON_BATCH_ERROR", "1").strip().lower() in {"1", "true", "yes", "on"}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "datas")
os.makedirs(DATA_DIR, exist_ok=True)


def _log(message: str) -> None:
    now = datetime.now().strftime("%H:%M:%S")
    print(f"[{now}] [spotify.py] {message}", flush=True)


def clean_data_dir() -> None:
    _log("Veri klasörü temizleniyor...")
    for filename in os.listdir(DATA_DIR):
        file_path = os.path.join(DATA_DIR, filename)
        if os.path.isfile(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass


def extract_playlist_id(playlist_url_or_id: str) -> str:
    value = (playlist_url_or_id or "").strip()
    if not value:
        raise ValueError("Playlist URL/ID boş olamaz")

    if "spotify.com/playlist/" in value:
        match = re.search(r"playlist/([a-zA-Z0-9]+)", value)
        if not match:
            raise ValueError("Geçersiz Spotify playlist URL")
        return match.group(1)

    if value.startswith("spotify:playlist:"):
        return value.split(":")[-1]

    if re.fullmatch(r"[a-zA-Z0-9]+", value):
        return value

    raise ValueError("Playlist URL/ID formatı tanınamadı")


def _normalize_emotions(emotions: list[str]) -> list[str]:
    normalized: list[str] = []
    for emotion in emotions:
        cleaned = (emotion or "").strip().lower()
        if cleaned and cleaned not in normalized:
            normalized.append(cleaned)
    return normalized


def _chunked(items: list[str], size: int) -> list[list[str]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def _attach_audio_features(sp: spotipy.Spotify, tracks: list[dict]) -> None:
    ids = [track.get("id") for track in tracks if track.get("id")]
    if not ids:
        return

    feature_map: dict[str, dict] = {}
    for chunk in _chunked(ids, 100):
        try:
            features = sp.audio_features(chunk) or []
            for feature in features:
                if feature and feature.get("id"):
                    feature_map[feature["id"]] = feature
        except Exception:
            continue

    for track in tracks:
        track_id = track.get("id")
        feature = feature_map.get(track_id or "")
        if not feature:
            continue

        track["audio_features"] = {
            "danceability": feature.get("danceability"),
            "energy": feature.get("energy"),
            "valence": feature.get("valence"),
            "acousticness": feature.get("acousticness"),
            "instrumentalness": feature.get("instrumentalness"),
            "speechiness": feature.get("speechiness"),
            "tempo": feature.get("tempo"),
            "liveness": feature.get("liveness"),
        }


def fetch_playlist_tracks(playlist_url_or_id: str) -> list[dict]:
    if not CLIENT_ID or not CLIENT_SECRET:
        raise ValueError("SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET .env içinde tanımlı olmalı")

    playlist_id = extract_playlist_id(playlist_url_or_id)
    _log(f"Playlist şarkıları çekiliyor... playlist_id={playlist_id}")

    auth_manager = SpotifyClientCredentials(client_id=CLIENT_ID, client_secret=CLIENT_SECRET)
    sp = spotipy.Spotify(auth_manager=auth_manager)

    results: list[dict] = []
    offset = 0
    limit = 100

    while True:
        response = sp.playlist_tracks(
            playlist_id,
            offset=offset,
            limit=limit,
            fields="items(track(id,name,artists(name),external_urls(spotify))),next,total",
        )
        items = response.get("items", [])
        if not items:
            break

        for item in items:
            track = item.get("track")
            if not track:
                continue

            artists = track.get("artists") or []
            artist_name = artists[0].get("name", "Bilinmeyen") if artists else "Bilinmeyen"

            results.append(
                {
                    "name": track.get("name", "Bilinmeyen Şarkı"),
                    "artist": artist_name,
                    "id": track.get("id"),
                    "url": (track.get("external_urls") or {}).get("spotify", ""),
                }
            )

        offset += limit

    _attach_audio_features(sp, results)
    _log(f"Playlist şarkıları alındı. toplam={len(results)}")
    return results


def _create_prompt(batch: list[dict], emotions: list[str]) -> str:
    prompt = [
        "You are an expert music mood classifier.",
        "Classify each song into exactly one allowed mood label.",
        "Accuracy is critical. Keep song order exactly the same.",
        "Never invent labels outside allowed list.",
        "",
        f"Allowed labels: {', '.join(emotions)}",
        f"You must return exactly {len(batch)} items.",
        "",
        "Return ONLY JSON in this schema:",
        '{"labels": [{"index": 1, "label": "<allowed_label>", "confidence": 0.00, "reason": "short"}]}',
        "",
        "Use title + artist + audio feature hints.",
        "Songs:",
    ]

    for i, song in enumerate(batch, 1):
        features = song.get("audio_features") or {}
        feature_text = (
            f"valence={features.get('valence')}, energy={features.get('energy')}, danceability={features.get('danceability')}, "
            f"acousticness={features.get('acousticness')}, instrumentalness={features.get('instrumentalness')}, tempo={features.get('tempo')}"
            if features
            else "no-audio-features"
        )
        prompt.append(f"{i}. {song['name']} - {song['artist']} | {feature_text}")

    return "\n".join(prompt)


def _safe_extract_json(text: str) -> str:
    text = (text or "").strip()
    if not text:
        return ""

    if text.startswith("{") and text.endswith("}"):
        return text

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start : end + 1]

    return text


def _normalize_text(value: str) -> str:
    base = (value or "").strip().lower()
    normalized = unicodedata.normalize("NFKD", base)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def _map_label_to_allowed(label: str, emotions: list[str], fallback: str) -> str:
    raw = (label or "").strip().lower()
    if not raw:
        return fallback

    allowed_exact = {emotion.lower(): emotion for emotion in emotions}
    if raw in allowed_exact:
        return allowed_exact[raw].lower()

    raw_norm = _normalize_text(raw)
    allowed_norm = {_normalize_text(emotion): emotion.lower() for emotion in emotions}

    if raw_norm in allowed_norm:
        return allowed_norm[raw_norm]

    synonym_base = {
        "happy": "mutlu",
        "joyful": "mutlu",
        "sad": "üzgün",
        "upset": "üzgün",
        "melancholic": "üzgün",
        "energetic": "enerjik",
        "energy": "enerjik",
        "calm": "sakin",
        "chill": "sakin",
        "romantic": "romantik",
        "cheerful": "neşeli",
        "neseli": "neşeli",
    }

    syn = synonym_base.get(raw_norm)
    if syn:
        syn_norm = _normalize_text(syn)
        if syn_norm in allowed_norm:
            return allowed_norm[syn_norm]

    for norm_allowed, emotion in allowed_norm.items():
        if norm_allowed in raw_norm or raw_norm in norm_allowed:
            return emotion

    return fallback


def _parse_labels(raw_text: str, emotions: list[str], expected_count: int) -> list[str]:
    fallback = emotions[0]
    parsed: list[str] = []

    try:
        maybe_json = _safe_extract_json(raw_text)
        data = json.loads(maybe_json)

        candidates: list = []
        if isinstance(data, dict):
            for key in ("labels", "results", "predictions", "output", "items"):
                value = data.get(key)
                if isinstance(value, list):
                    candidates = value
                    break
        elif isinstance(data, list):
            candidates = data

        if isinstance(candidates, list):
            for item in candidates:
                if isinstance(item, dict):
                    label = str(item.get("label") or item.get("emotion") or item.get("category") or "").strip().lower()
                    if label:
                        parsed.append(label)
                elif isinstance(item, str):
                    parsed.append(item.strip().lower())
    except Exception:
        pass

    if not parsed:
        cleaned = (raw_text or "").replace("\n", ",")
        parsed = [part.strip().lower() for part in cleaned.split(",") if part.strip()]

    normalized: list[str] = []
    for label in parsed:
        normalized.append(_map_label_to_allowed(label, emotions, fallback))

    if len(normalized) < expected_count:
        normalized.extend([fallback] * (expected_count - len(normalized)))
    elif len(normalized) > expected_count:
        normalized = normalized[:expected_count]

    return normalized


def _extract_openrouter_text(data: dict) -> str:
    choices = data.get("choices") or []
    if not choices:
        return ""

    message = (choices[0] or {}).get("message") or {}
    content = message.get("content")

    if isinstance(content, str):
        return content.strip()

    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item.get("text", ""))
            elif isinstance(item, str):
                parts.append(item)
        return "\n".join(parts).strip()

    return ""


def _openrouter_request(prompt: str) -> tuple[str, dict, str]:
    if not OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY eksik")

    url = f"{OPENROUTER_API_BASE}/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    if OPENROUTER_HTTP_REFERER:
        headers["HTTP-Referer"] = OPENROUTER_HTTP_REFERER
    if OPENROUTER_APP_TITLE:
        headers["X-Title"] = OPENROUTER_APP_TITLE

    payload = {
        "model": OPENROUTER_MODEL,
        "temperature": 0.0,
        "messages": [{"role": "user", "content": prompt}],
    }

    response = requests.post(url, headers=headers, json=payload, timeout=90)
    if response.status_code >= 400:
        raise RuntimeError(f"OpenRouter API error {response.status_code}: {response.text}")

    raw_http_text = response.text
    data = response.json()
    text = _extract_openrouter_text(data)
    if not text:
        raise RuntimeError(f"OpenRouter boş içerik döndü: {data}")

    return text, data, raw_http_text


def _openrouter_generate_json(prompt: str) -> tuple[str, dict, str, int, str]:
    last_error = ""

    for attempt in range(1, OPENROUTER_MAX_RETRIES + 1):
        try:
            _log(f"OpenRouter isteği gönderiliyor attempt={attempt} model={OPENROUTER_MODEL}")
            text, raw_data, raw_http_text = _openrouter_request(prompt)
            return text, raw_data, "openrouter", attempt, raw_http_text
        except Exception as exc:
            last_error = str(exc)
            _log(f"OpenRouter hata attempt={attempt}: {last_error}")
            if attempt < OPENROUTER_MAX_RETRIES:
                lowered = last_error.lower()
                if "429" in lowered or "rate-limit" in lowered or "rate limit" in lowered:
                    wait_sec = min(10 * attempt, 30)
                    _log(f"Rate limit algılandı, tekrar denenmeden önce {wait_sec}s bekleniyor")
                    time.sleep(wait_sec)
                else:
                    time.sleep(min(2**attempt, 8))

    raise RuntimeError(last_error or "OpenRouter isteği başarısız")


def _classify_batch(batch: list[dict], emotions: list[str]) -> tuple[list[str], str, str, dict, str, int, str, str]:
    prompt = _create_prompt(batch, emotions)
    raw_content, raw_api_response, mode, attempt, raw_http_text = _openrouter_generate_json(prompt)
    labels = _parse_labels(raw_content, emotions, len(batch))
    return labels, raw_content, prompt, raw_api_response, mode, attempt, raw_http_text, "openrouter"


def _fallback_label_from_audio(song: dict, emotions: list[str], default_label: str) -> str:
    features = song.get("audio_features") or {}
    valence = features.get("valence")
    energy = features.get("energy")

    if valence is None or energy is None:
        return default_label

    lowered = [emotion.lower() for emotion in emotions]

    if "enerjik" in lowered and energy >= 0.72:
        return "enerjik"

    if ("üzgün" in lowered or "uzgun" in lowered) and valence <= 0.35 and energy <= 0.55:
        return "üzgün"

    if "sakin" in lowered and energy <= 0.40:
        return "sakin"

    if "mutlu" in lowered and valence >= 0.65:
        return "mutlu"

    if "romantik" in lowered and 0.45 <= valence <= 0.75 and energy <= 0.60:
        return "romantik"

    if "neşeli" in lowered and valence >= 0.58 and energy >= 0.45:
        return "neşeli"

    return default_label


def _adjust_label_with_audio_hint(song: dict, label: str, emotions: list[str]) -> str:
    features = song.get("audio_features") or {}
    valence = features.get("valence")
    energy = features.get("energy")

    if valence is None or energy is None:
        return label

    lowered = [emotion.lower() for emotion in emotions]
    has_happy = "mutlu" in lowered
    has_sad = "üzgün" in lowered or "uzgun" in lowered
    has_energetic = "enerjik" in lowered
    has_calm = "sakin" in lowered

    if label == "mutlu" and valence < 0.35 and energy < 0.45:
        if has_sad:
            return "üzgün"
        if has_calm:
            return "sakin"

    if (label == "üzgün" or label == "uzgun") and valence > 0.65 and energy > 0.55:
        if has_happy:
            return "mutlu"
        if has_energetic:
            return "enerjik"

    return label


def process_playlist(
    playlist_url: str,
    emotions: list[str],
    progress_callback: Callable[[int, int, list[dict]], None] | None = None,
) -> dict:
    clean_data_dir()

    normalized_emotions = _normalize_emotions(emotions)
    if not normalized_emotions:
        raise ValueError("En az bir duygu seçmelisiniz")

    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY bulunamadı. .env dosyasına ekleyin.")

    playlist_id = extract_playlist_id(playlist_url)
    _log(f"Sınıflandırma başlatıldı. provider=openrouter, playlist_id={playlist_id}, emotions={normalized_emotions}")

    songs = fetch_playlist_tracks(playlist_id)

    json_path = os.path.join(DATA_DIR, f"playlist_{playlist_id}.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(songs, f, ensure_ascii=False, indent=2)

    batch_size = max(1, CLASSIFY_BATCH_SIZE)
    batches = [songs[i : i + batch_size] for i in range(0, len(songs), batch_size)]
    total_batches = len(batches)

    _log(f"Batch planı hazırlandı. batch_size={batch_size}, total_batches={total_batches}")

    merged: list[dict] = []
    failed_batches: list[dict] = []
    batch_logs: list[dict] = []
    ai_raw_logs: list[dict] = []

    for i, batch in enumerate(batches):
        batch_no = i + 1
        _log(f"Batch {batch_no}/{total_batches} hazırlanıyor... song_count={len(batch)}")

        if progress_callback:
            try:
                progress_callback(batch_no, total_batches, batch)
            except Exception:
                pass

        started = time.time()
        try:
            _log(f"Batch {batch_no}/{total_batches} AI servisine gönderildi (provider=openrouter)")
            (
                labels,
                raw_content,
                prompt_used,
                raw_api_response,
                used_mode,
                used_attempt,
                raw_http_text,
                used_provider,
            ) = _classify_batch(batch, normalized_emotions)

            elapsed = round(time.time() - started, 2)
            _log(
                f"Batch {batch_no}/{total_batches} cevabı geldi ({elapsed}s) provider={used_provider} mode={used_mode}"
            )

            unique_labels = sorted(set(labels))
            if len(unique_labels) == 1:
                _log(f"UYARI: Batch {batch_no} tek etiket döndürdü -> {unique_labels[0]}")

            batch_logs.append(
                {
                    "batch": batch_no,
                    "status": "ok",
                    "duration_sec": elapsed,
                    "provider": used_provider,
                    "mode": used_mode,
                    "attempt": used_attempt,
                    "songs": [f"{song['name']} - {song['artist']}" for song in batch],
                    "labels": labels,
                    "unique_labels": unique_labels,
                    "raw_response_text": raw_content,
                }
            )

            ai_raw_logs.append(
                {
                    "batch": batch_no,
                    "provider": used_provider,
                    "mode": used_mode,
                    "attempt": used_attempt,
                    "duration_sec": elapsed,
                    "prompt": prompt_used,
                    "model_response_text": raw_content,
                    "model_response_json": raw_api_response,
                    "raw_http_response": raw_http_text,
                }
            )

        except Exception as exc:
            reason = str(exc)
            failed_batches.append({"batch": batch_no, "reason": reason})
            labels = [_fallback_label_from_audio(song, normalized_emotions, normalized_emotions[0]) for song in batch]
            elapsed = round(time.time() - started, 2)
            _log(f"Batch {batch_no}/{total_batches} HATA ({elapsed}s): {reason}")
            _log(f"Batch {batch_no} için audio-feature fallback etiketleri kullanıldı")

            batch_logs.append(
                {
                    "batch": batch_no,
                    "provider": "openrouter",
                    "status": "fallback",
                    "duration_sec": elapsed,
                    "reason": reason,
                    "songs": [f"{song['name']} - {song['artist']}" for song in batch],
                    "labels": labels,
                }
            )

            ai_raw_logs.append(
                {
                    "batch": batch_no,
                    "provider": "openrouter",
                    "status": "fallback",
                    "duration_sec": elapsed,
                    "reason": reason,
                    "prompt": _create_prompt(batch, normalized_emotions),
                    "model_response_text": "",
                    "model_response_json": None,
                    "raw_http_response": "",
                }
            )

        for song, label in zip(batch, labels):
            adjusted_label = _adjust_label_with_audio_hint(song, label, normalized_emotions)
            if adjusted_label != label:
                _log(
                    f"Etiket düzeltildi: {song.get('name')} - {song.get('artist')} | {label} -> {adjusted_label} (audio hint)"
                )

            merged.append(
                {
                    "id": song.get("id"),
                    "name": song.get("name", ""),
                    "artist": song.get("artist", ""),
                    "url": song.get("url", ""),
                    "emotion": adjusted_label,
                }
            )

        _log(f"Batch {batch_no}/{total_batches} işlendi. merged_count={len(merged)}")

        if CLASSIFY_DELAY_MS > 0 and i < total_batches - 1:
            time.sleep(CLASSIFY_DELAY_MS / 1000)

    merged_path = os.path.join(DATA_DIR, "merged.json")
    with open(merged_path, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    batch_log_path = os.path.join(DATA_DIR, "batch_logs.json")
    with open(batch_log_path, "w", encoding="utf-8") as f:
        json.dump(batch_logs, f, ensure_ascii=False, indent=2)

    raw_ai_log_path = os.path.join(DATA_DIR, "ai_raw_responses.json")
    with open(raw_ai_log_path, "w", encoding="utf-8") as f:
        json.dump(ai_raw_logs, f, ensure_ascii=False, indent=2)

    if failed_batches and CLASSIFY_FAIL_ON_BATCH_ERROR:
        reasons = "; ".join([f"batch {item['batch']}: {item['reason']}" for item in failed_batches])
        raise RuntimeError(
            "Bazı batch'ler AI servisinde başarısız oldu. Sonuçlar güvenilir değil, lütfen tekrar deneyin. "
            f"Detay: {reasons}"
        )

    grouped_tracks: dict[str, list[dict]] = {emotion: [] for emotion in normalized_emotions}
    for song in merged:
        emotion = song["emotion"]
        grouped_tracks.setdefault(emotion, []).append(
            {
                "id": song.get("id"),
                "name": song.get("name"),
                "artist": song.get("artist"),
                "url": song.get("url"),
            }
        )

    emotion_counts = Counter(song["emotion"] for song in merged)
    total = len(merged)
    emotion_stats = {
        emotion: {
            "count": emotion_counts.get(emotion, 0),
            "percentage": round((emotion_counts.get(emotion, 0) / total) * 100, 2) if total else 0,
        }
        for emotion in grouped_tracks.keys()
    }

    _log(
        f"Sınıflandırma tamamlandı. playlist_id={playlist_id}, total_songs={len(songs)}, failed_batches={len(failed_batches)}"
    )
    _log("AI ham cevapları kaydedildi: datas/ai_raw_responses.json")

    return {
        "playlist_id": playlist_id,
        "total_songs": len(songs),
        "total_batches": total_batches,
        "emotion_stats": emotion_stats,
        "grouped_tracks": grouped_tracks,
        "failed_batches": failed_batches,
    }


def _spotify_request(method: str, url: str, token: str, **kwargs) -> dict:
    headers = kwargs.pop("headers", {})
    headers["Authorization"] = f"Bearer {token}"
    if "json" in kwargs:
        headers.setdefault("Content-Type", "application/json")

    response = requests.request(method, url, headers=headers, timeout=30, **kwargs)
    if response.status_code >= 400:
        try:
            detail = response.json()
        except Exception:
            detail = response.text
        raise RuntimeError(f"Spotify API hatası ({response.status_code}): {detail}")

    if not response.text:
        return {}

    try:
        return response.json()
    except Exception:
        return {}


def save_grouped_tracks_to_spotify(
    access_token: str,
    grouped_tracks: dict[str, list[dict]],
    playlist_names: dict[str, str] | None = None,
    public: bool = False,
) -> dict:
    playlist_names = playlist_names or {}
    _log("Spotify'a playlist kaydetme süreci başladı")

    me = _spotify_request("GET", "https://api.spotify.com/v1/me", access_token)
    user_id = me.get("id")
    if not user_id:
        raise RuntimeError("Spotify kullanıcı bilgisi alınamadı")

    created_playlists: list[dict] = []
    skipped: list[dict] = []

    for emotion, tracks in grouped_tracks.items():
        valid_tracks = [track for track in tracks if track.get("id")]
        _log(f"Kategori işleniyor: {emotion}, track_count={len(valid_tracks)}")

        if not valid_tracks:
            skipped.append({"emotion": emotion, "reason": "Bu kategori için şarkı bulunamadı"})
            continue

        playlist_name = (playlist_names.get(emotion) or f"{emotion.capitalize()} Şarkılar").strip()
        if not playlist_name:
            playlist_name = f"{emotion.capitalize()} Şarkılar"

        created = _spotify_request(
            "POST",
            f"https://api.spotify.com/v1/users/{user_id}/playlists",
            access_token,
            json={
                "name": playlist_name,
                "description": f"Playlist Classifier tarafından '{emotion}' kategorisinde oluşturuldu.",
                "public": public,
            },
        )

        playlist_id = created.get("id")
        playlist_url = (created.get("external_urls") or {}).get("spotify", "")
        if not playlist_id:
            skipped.append({"emotion": emotion, "reason": "Playlist oluşturulamadı"})
            continue

        uris = [f"spotify:track:{track['id']}" for track in valid_tracks if track.get("id")]
        for chunk in _chunked(uris, 100):
            _spotify_request(
                "POST",
                f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks",
                access_token,
                json={"uris": chunk},
            )

        created_playlists.append(
            {
                "emotion": emotion,
                "playlist_id": playlist_id,
                "playlist_name": playlist_name,
                "playlist_url": playlist_url,
                "added_tracks": len(uris),
            }
        )
        _log(f"Playlist oluşturuldu: {playlist_name} ({len(uris)} şarkı)")

    _log(f"Spotify kayıt süreci bitti. created={len(created_playlists)}, skipped={len(skipped)}")
    return {
        "created_playlists": created_playlists,
        "skipped": skipped,
    }
