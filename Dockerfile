# ---- Stage 1: Build frontend ----
FROM node:20-alpine AS frontend-builder

# Set WORKDIR to /app to keep paths simple
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --frozen-lockfile 2>/dev/null || npm install

# Copy frontend source and build
COPY frontend/ .
RUN npm run build

# ---- Stage 2: Python backend ----
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxext6 libxrender-dev gcc g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies using the CPU-only fix
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ .

# COPY FRONTEND BUILD: This matches the simplified path from Stage 1
COPY --from=frontend-builder /app/dist ./static

# Create data directories
RUN mkdir -p data/uploads data/indexes

EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV UPLOAD_DIR=/app/data/uploads
ENV INDEX_DIR=/app/data/indexes
ENV DATABASE_URL=sqlite+aiosqlite:////app/data/rag.db

# Start the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
