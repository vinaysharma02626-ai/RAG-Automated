#!/usr/bin/env bash
# Local development startup script
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "========================================"
echo "  RAG Automation - Local Dev Startup"
echo "========================================"

# Check .env
if [ ! -f "$ROOT/backend/.env" ]; then
  echo "[!] backend/.env not found. Copying from .env.example..."
  cp "$ROOT/backend/.env.example" "$ROOT/backend/.env"
  echo "[!] Please edit backend/.env and add your LLM_API_KEY, then re-run."
  exit 1
fi

# Backend
echo ""
echo "[1/2] Starting FastAPI backend on http://localhost:8000 ..."
cd "$ROOT/backend"
if [ ! -d ".venv" ]; then
  echo "  Creating virtual environment..."
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt
mkdir -p data/uploads data/indexes

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Frontend
echo ""
echo "[2/2] Starting Vite frontend on http://localhost:3000 ..."
cd "$ROOT/frontend"
if [ ! -d "node_modules" ]; then
  npm install
fi
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================"
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:3000"
echo "  API docs: http://localhost:8000/docs"
echo "========================================"
echo "Press Ctrl+C to stop both servers."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
