# 🎧 Spotify Playlist Classification

Full-stack application for analyzing and classifying Spotify playlists
by emotion or theme using AI.

------------------------------------------------------------------------

## 🚀 Overview

-   **Backend:** FastAPI + Spotify Web API integration\
-   **Frontend:** Next.js (App Router) + TypeScript + TailwindCSS\
-   **AI:** Provider-agnostic (OpenAI, OpenRouter, Gemini, etc.)\
-   **Docker-ready** deployment support

------------------------------------------------------------------------

## 📁 Project Structure

    Spotify_Playlist_Classification/
    │
    ├── frontend/
    │   ├── app/
    │   │   ├── login/
    │   │   ├── callback/
    │   │   ├── classify/
    │   │   ├── emotions/
    │   │   ├── save/
    │   │   ├── success/
    │   │   ├── health/
    │   │   ├── layout.tsx
    │   │   └── page.tsx
    │   ├── components/
    │   ├── hooks/
    │   └── lib/
    │
    ├── main.py
    ├── spotify.py
    ├── requirements.txt
    ├── Dockerfile
    └── run_dev.bat

------------------------------------------------------------------------

## 🧠 How It Works

1.  User authenticates via Spotify OAuth.
2.  Playlist tracks are fetched using Spotify Web API.
3.  Tracks are processed in batches.
4.  AI model classifies songs (emotion/mood).
5.  Results are displayed and can optionally be saved as new playlists.

------------------------------------------------------------------------

## 🛠 Tech Stack

**Backend** - Python - FastAPI - Spotify Web API

**Frontend** - Next.js - TypeScript - TailwindCSS

**Dev / Deploy** - Docker - Node.js

------------------------------------------------------------------------

## ⚙️ Local Setup

### Clone

    git clone https://github.com/samil07kocakavuk/Spotify_Playlist_Classification.git
    cd Spotify_Playlist_Classification

### Backend

    pip install -r requirements.txt
    uvicorn main:app --reload --host 0.0.0.0 --port 8000

API: http://localhost:8000

### Frontend

    npm install
    npm run dev

App: http://localhost:3000

------------------------------------------------------------------------

## 🔐 Environment Variables

Create a `.env` file in the project root:

    SPOTIFY_CLIENT_ID=your_spotify_client_id
    SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
    SPOTIFY_REDIRECT_URI=http://localhost:3000/callback

    CORS_ORIGINS=http://localhost:3000

    AI_API_BASE=https://api.your-provider.com/v1
    AI_API_KEY=your_ai_api_key
    AI_MODEL=your_model_name
    AI_MAX_RETRIES=5

    CLASSIFY_BATCH_SIZE=10
    CLASSIFY_DELAY_MS=1000
    CLASSIFY_FAIL_ON_BATCH_ERROR=1

------------------------------------------------------------------------

## ⭐ Support

If you find this project useful, consider giving it a star.
