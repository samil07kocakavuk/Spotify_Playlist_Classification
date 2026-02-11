# Spotify Playlist Classifier (Tek Proje)

Yapı:
- `main.py` + `spotify.py` => FastAPI backend
- `frontend/` => Next.js frontend

## Backend

```bash
cd Sonuc
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend `.env` dosyasını otomatik okur. Gerekli alanlar:
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL` (free model önerilir)

## Frontend

```bash
cd Sonuc/frontend
npm install
npm run dev
```

Frontend `frontend/.env.local` dosyasını kullanır. Gerekli alanlar:
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`
- `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI`

## Akış

1. Spotify login
2. Playlist URL girme
3. Duygu seçimi
4. `/classify` -> şarkılar batch batch OpenRouter'a gider
5. Sonuçlar:
   - `datas/merged.json`
   - `datas/batch_logs.json`
   - `datas/ai_raw_responses.json` (AI ham cevabı)
6. `/save_playlists` ile Spotify'a yeni listeler oluşturulur

## API

- `GET /health`
- `POST /spotify/token`
- `POST /playlist_info`
- `POST /classify`
- `POST /save_playlists`
