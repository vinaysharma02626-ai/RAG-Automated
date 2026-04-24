# ---- Stage 1: Build frontend ----
FROM node:20-alpine AS frontend-builder

WORKDIR /app
# Copy the frontend folder specifically
COPY frontend/ ./frontend/

# Move into the frontend folder to install and build
WORKDIR /app/frontend
RUN npm install --frozen-lockfile 2>/dev/null || npm install
RUN npm run build

# ---- Stage 2: Python backend ----
FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxext6 libxrender-dev gcc g++ \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies (using your successful requirements fix)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ .

# THE FIX: Point exactly to the frontend/dist folder we just built
COPY --from=frontend-builder /app/frontend/dist ./static

RUN mkdir -p data/uploads data/indexes

EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV UPLOAD_DIR=/app/data/uploads
ENV INDEX_DIR=/app/data/indexes
ENV DATABASE_URL=sqlite+aiosqlite:////app/data/rag.db

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
