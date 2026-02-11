@echo off
setlocal

echo Starting backend on http://localhost:8000 ...
start "backend" cmd /k "cd /d %~dp0 && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo Starting frontend on http://localhost:3000 ...
start "frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

endlocal
