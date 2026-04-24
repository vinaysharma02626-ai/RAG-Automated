# ---- Stage 1: Build frontend ----
FROM node:20-alpine AS frontend-builder

# FIX: Set WORKDIR to the frontend folder, not the dist folder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install

COPY frontend/ .
RUN npm run build

# ---- Stage 2: Python backend ----
FROM python:3.11-slim

WORKDIR /app

# System deps for pdfplumber and faiss
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY backend/requirements.txt .
# FIX: Use no-cache to save memory during build
RUN pip install --no-cache-dir -r requirements.txt

# Backend source
COPY backend/ .

# FIX: Correct the path to match the WORKDIR above
COPY --from=frontend-builder /app/frontend/dist ./static

# Serve static files from FastAPI
RUN mkdir -p data/uploads data/indexes

EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV UPLOAD_DIR=/app/data/uploads
ENV INDEX_DIR=/app/data/indexes
ENV DATABASE_URL=sqlite+aiosqlite:////app/data/rag.db

# Ensure the app path matches your backend structure
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
