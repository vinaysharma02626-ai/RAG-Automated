import logging
import numpy as np
from typing import List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

_model = None


def _get_local_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
            _model = SentenceTransformer(settings.EMBEDDING_MODEL)
            logger.info("Embedding model loaded.")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise
    return _model


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed a list of texts and return a list of float vectors."""
    provider = settings.EMBEDDING_PROVIDER

    if provider == "local":
        return _embed_local(texts)
    elif provider == "huggingface":
        return _embed_huggingface(texts)
    elif provider == "ollama":
        return _embed_ollama(texts)
    else:
        logger.warning(f"Unknown embedding provider '{provider}', falling back to local.")
        return _embed_local(texts)


def embed_query(text: str) -> List[float]:
    """Embed a single query text."""
    results = embed_texts([text])
    return results[0]


def _embed_local(texts: List[str]) -> List[List[float]]:
    model = _get_local_model()
    embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return embeddings.tolist()


def _embed_huggingface(texts: List[str]) -> List[List[float]]:
    """Use HuggingFace Inference API (free tier)."""
    import httpx

    api_url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{settings.EMBEDDING_MODEL}"
    headers = {}
    if settings.EMBEDDING_API_KEY:
        headers["Authorization"] = f"Bearer {settings.EMBEDDING_API_KEY}"

    results = []
    # HF API batch limit is small, do in batches of 8
    batch_size = 8
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        resp = httpx.post(
            api_url,
            json={"inputs": batch, "options": {"wait_for_model": True}},
            headers=headers,
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        # Normalize
        for vec in data:
            arr = np.array(vec, dtype=np.float32)
            norm = np.linalg.norm(arr)
            if norm > 0:
                arr = arr / norm
            results.append(arr.tolist())
    return results


def _embed_ollama(texts: List[str]) -> List[List[float]]:
    """Use local Ollama embedding API."""
    import httpx

    base_url = settings.LLM_BASE_URL or "http://localhost:11434"
    results = []
    for text in texts:
        resp = httpx.post(
            f"{base_url}/api/embeddings",
            json={"model": settings.EMBEDDING_MODEL, "prompt": text},
            timeout=60,
        )
        resp.raise_for_status()
        vec = resp.json()["embedding"]
        arr = np.array(vec, dtype=np.float32)
        norm = np.linalg.norm(arr)
        if norm > 0:
            arr = arr / norm
        results.append(arr.tolist())
    return results
