# RAG Automation

> **Turn your documents into a question-answering engine.**  
> Upload PDFs and DOCX files, build a hybrid RAG pipeline, and ask deep questions with cited answers — 100% free, open-source, self-hostable.

![RAG Automation](https://img.shields.io/badge/RAG-Automation-7c6aff?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-green?style=flat-square) ![Python](https://img.shields.io/badge/python-3.11+-blue?style=flat-square) ![Node](https://img.shields.io/badge/node-20+-green?style=flat-square)

---

## Features

- **Multi-document upload** — PDF and DOCX, up to 50 MB each
- **Structure-aware chunking** — heading boundaries, paragraph grouping, table detection
- **Hybrid retrieval** — vector (FAISS) + lexical (BM25) fused with Reciprocal Rank Fusion
- **Streaming answers** — token-by-token streaming for smooth UX
- **Cited sources** — every answer references exact chunks with page/section info
- **Multi-turn chat** — conversation history per session
- **Feedback system** — thumbs up/down per answer
- **Analytics dashboard** — query logs, latency, chunk stats
- **100% free** — Groq / OpenRouter / Ollama for LLM; local sentence-transformers for embeddings
- **Self-hostable** — SQLite + FAISS + BM25, single Docker container

---

## Quick Start (Docker — Recommended)

### 1. Clone the repo
```bash
git clone https://github.com/your-username/rag-automation.git
cd rag-automation
```

### 2. Set your API key
```bash
cp backend/.env.example backend/.env
# Edit backend/.env and set LLM_API_KEY to your Groq key
# Get a FREE key at https://console.groq.com (no credit card)
```

### 3. Run with Docker Compose
```bash
docker-compose up --build
```

Open **http://localhost:8000** — the frontend is served from the same port.

---

## Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 20+

### One-command startup
```bash
./start.sh
```

This will:
1. Create a Python venv and install backend dependencies
2. Install frontend npm packages
3. Start both servers (backend: 8000, frontend: 3000)

Then open **http://localhost:3000**

### Manual setup

**Backend:**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # Edit and add your LLM_API_KEY
mkdir -p data/uploads data/indexes
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Configuration

All settings are in `backend/.env`. Copy from `.env.example` to get started.

### LLM Providers (choose one)

| Provider | Free Tier | Setup |
|----------|-----------|-------|
| **Groq** ⭐ | ✅ Generous free tier, very fast | [console.groq.com](https://console.groq.com) |
| **OpenRouter** | ✅ Many free models | [openrouter.ai](https://openrouter.ai) |
| **Ollama** | ✅ Fully local, no key needed | [ollama.ai](https://ollama.ai) |
| **HuggingFace** | ✅ Free inference API | [huggingface.co](https://huggingface.co) |

**Groq (default, recommended):**
```env
LLM_PROVIDER=groq
LLM_MODEL=llama-3.1-8b-instant
LLM_API_KEY=gsk_your_key_here
```

**OpenRouter (free models):**
```env
LLM_PROVIDER=openrouter
LLM_MODEL=mistralai/mistral-7b-instruct:free
LLM_API_KEY=sk-or-your_key_here
```

**Ollama (fully local):**
```bash
ollama pull llama3.1
```
```env
LLM_PROVIDER=ollama
LLM_MODEL=llama3.1
LLM_BASE_URL=http://localhost:11434
```

### Embedding Providers

| Provider | Notes |
|----------|-------|
| **local** ⭐ | Default. Downloads `all-MiniLM-L6-v2` (~90MB) on first run. No API key. |
| **huggingface** | Uses HF inference API |
| **ollama** | Uses local Ollama (`nomic-embed-text`) |

```env
EMBEDDING_PROVIDER=local
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
EMBEDDING_DIM=384
```

### Other Key Settings

```env
MAX_UPLOAD_SIZE_MB=50       # Max file size per upload
CHUNK_SIZE=512              # Target tokens per chunk
CHUNK_OVERLAP=64            # Token overlap between chunks
TOP_K_RETRIEVAL=20          # Candidates from hybrid search
TOP_N_RERANK=5              # Final chunks sent to LLM
VECTOR_WEIGHT=0.6           # Weight for vector scores in RRF
BM25_WEIGHT=0.4             # Weight for BM25 scores in RRF
LLM_MAX_TOKENS=1024         # Max tokens in LLM response
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    React Frontend                    │
│  Home · Documents · Chat · Analytics                │
└────────────────────┬────────────────────────────────┘
                     │ REST + SSE streaming
┌────────────────────▼────────────────────────────────┐
│              FastAPI Backend                         │
│                                                      │
│  /api/documents  ──► Ingestion Pipeline             │
│  /api/query      ──► RAG Pipeline                   │
│  /api/admin      ──► Stats & Logs                   │
└──────┬──────────────────────┬───────────────────────┘
       │                      │
┌──────▼──────┐    ┌──────────▼──────────┐
│   SQLite    │    │   Retrieval Engine   │
│  documents  │    │                      │
│  chunks     │    │  FAISS (vectors)     │
│  query_logs │    │  BM25 (lexical)      │
│  feedback   │    │  RRF fusion          │
└─────────────┘    └──────────┬───────────┘
                              │
                   ┌──────────▼───────────┐
                   │   LLM Provider       │
                   │  Groq / OpenRouter / │
                   │  Ollama / HuggingFace│
                   └──────────────────────┘
```

### RAG Pipeline

1. **Upload** → file saved to disk, DB record created
2. **Parse** → pdfplumber (PDF) or python-docx (DOCX), extract blocks with structure
3. **Chunk** → structure-aware: heading boundaries → paragraph grouping → token-size fallback
4. **Embed** → sentence-transformers (local) or API, stored in FAISS
5. **Index** → BM25 inverted index built in-memory, persisted to JSON
6. **Query** → embed query → vector search + BM25 → RRF fusion → top-N chunks → LLM prompt
7. **Stream** → LLM streams tokens via SSE, sources returned as first event

---

## Deployment

### Render.com (Free Tier)
1. Fork this repo on GitHub
2. New Web Service → connect your repo
3. **Build command:** `cd frontend && npm install && npm run build && cd ../backend && pip install -r requirements.txt`
4. **Start command:** `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables in Render dashboard

### Railway.app
1. New project → Deploy from GitHub repo
2. Set `RAILWAY_DOCKERFILE_PATH=Dockerfile`
3. Add env vars via Railway dashboard

### Fly.io
```bash
fly launch --dockerfile Dockerfile
fly secrets set LLM_API_KEY=your_key_here
fly deploy
```

### VPS / Self-hosted
```bash
git clone https://github.com/your-username/rag-automation.git
cd rag-automation
cp backend/.env.example backend/.env
# Edit .env
docker-compose up -d --build
```

---

## Project Structure

```
rag-automation/
├── backend/
│   ├── app/
│   │   ├── api/           # FastAPI routers (documents, query, admin)
│   │   ├── core/          # Config, database, logging
│   │   ├── models/        # SQLAlchemy models
│   │   ├── services/      # Parser, chunker, embedder, retriever, LLM, indexes
│   │   └── main.py        # FastAPI app entry point
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/    # React components (chat, documents, layout, ui)
│   │   ├── pages/         # Page components (Home, Documents, Chat, Admin)
│   │   ├── utils/         # API client, formatters
│   │   └── styles/        # Global CSS
│   ├── package.json
│   └── vite.config.ts
├── Dockerfile
├── docker-compose.yml
├── start.sh
└── README.md
```

---

## License

MIT — free to use, modify, and deploy.
