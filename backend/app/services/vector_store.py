import os
import json
import logging
import numpy as np
from typing import List, Tuple, Dict, Optional
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)

_index = None
_chunk_id_map: List[str] = []  # position -> chunk_id
_index_path = None
_map_path = None


def _get_paths():
    idx_dir = Path(settings.INDEX_DIR)
    idx_dir.mkdir(parents=True, exist_ok=True)
    return idx_dir / "faiss.index", idx_dir / "chunk_map.json"


def _load_index():
    global _index, _chunk_id_map, _index_path, _map_path
    import faiss

    _index_path, _map_path = _get_paths()

    if _index_path.exists() and _map_path.exists():
        logger.info("Loading existing FAISS index...")
        _index = faiss.read_index(str(_index_path))
        with open(_map_path, "r") as f:
            _chunk_id_map = json.load(f)
        logger.info(f"Loaded FAISS index with {_index.ntotal} vectors.")
    else:
        logger.info("Creating new FAISS index...")
        _index = faiss.IndexFlatIP(settings.EMBEDDING_DIM)  # Inner Product (cosine with normalized vecs)
        _chunk_id_map = []


def get_index():
    global _index
    if _index is None:
        _load_index()
    return _index


def save_index():
    import faiss

    if _index is None:
        return
    _index_path, _map_path = _get_paths()
    faiss.write_index(_index, str(_index_path))
    with open(_map_path, "w") as f:
        json.dump(_chunk_id_map, f)
    logger.debug("FAISS index saved.")


def add_embeddings(chunk_ids: List[str], embeddings: List[List[float]]):
    """Add embeddings to the index."""
    get_index()  # ensure loaded
    vectors = np.array(embeddings, dtype=np.float32)
    _index.add(vectors)
    _chunk_id_map.extend(chunk_ids)
    save_index()
    logger.info(f"Added {len(chunk_ids)} vectors. Total: {_index.ntotal}")


def search_vectors(
    query_embedding: List[float], top_k: int = 10, doc_ids: Optional[List[str]] = None
) -> List[Tuple[str, float]]:
    """Search for nearest neighbors. Returns list of (chunk_id, score)."""
    idx = get_index()
    if idx.ntotal == 0:
        return []

    query = np.array([query_embedding], dtype=np.float32)
    k = min(top_k * 3, idx.ntotal)  # over-fetch to allow filtering
    scores, indices = idx.search(query, k)

    results = []
    for score, i in zip(scores[0], indices[0]):
        if i < 0 or i >= len(_chunk_id_map):
            continue
        chunk_id = _chunk_id_map[i]
        results.append((chunk_id, float(score)))

    return results[:top_k]


def remove_document_embeddings(chunk_ids: List[str]):
    """Remove embeddings for a set of chunk IDs (rebuild index without them)."""
    global _index, _chunk_id_map
    import faiss

    if _index is None or _index.ntotal == 0:
        return

    remove_set = set(chunk_ids)
    keep_positions = [i for i, cid in enumerate(_chunk_id_map) if cid not in remove_set]

    if not keep_positions:
        _index = faiss.IndexFlatIP(settings.EMBEDDING_DIM)
        _chunk_id_map = []
        save_index()
        return

    # Reconstruct index keeping only valid vectors
    # FAISS flat index supports reconstruct
    kept_vecs = np.zeros((len(keep_positions), settings.EMBEDDING_DIM), dtype=np.float32)
    for new_pos, old_pos in enumerate(keep_positions):
        _index.reconstruct(old_pos, kept_vecs[new_pos])

    new_index = faiss.IndexFlatIP(settings.EMBEDDING_DIM)
    new_index.add(kept_vecs)
    _index = new_index
    _chunk_id_map = [_chunk_id_map[i] for i in keep_positions]
    save_index()
    logger.info(f"Removed {len(chunk_ids)} vectors. Remaining: {_index.ntotal}")
