import json
import logging
import math
import re
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from app.core.config import settings

logger = logging.getLogger(__name__)

# In-memory BM25 index
_inverted_index: Dict[str, Dict[str, int]] = defaultdict(dict)  # term -> {chunk_id: freq}
_doc_lengths: Dict[str, int] = {}  # chunk_id -> token count
_chunk_texts: Dict[str, str] = {}  # chunk_id -> text (for preview)
_total_docs = 0
_avg_doc_len = 0.0

BM25_K1 = 1.5
BM25_B = 0.75

_bm25_path: Optional[Path] = None


def _get_path():
    global _bm25_path
    if _bm25_path is None:
        _bm25_path = Path(settings.INDEX_DIR) / "bm25.json"
    return _bm25_path


def _tokenize(text: str) -> List[str]:
    tokens = re.findall(r"\b[a-zA-Z0-9]+\b", text.lower())
    return tokens


def load_bm25():
    global _inverted_index, _doc_lengths, _total_docs, _avg_doc_len, _chunk_texts
    path = _get_path()
    if path.exists():
        with open(path, "r") as f:
            data = json.load(f)
        _inverted_index = defaultdict(dict, data.get("inverted_index", {}))
        _doc_lengths = data.get("doc_lengths", {})
        _chunk_texts = data.get("chunk_texts", {})
        _total_docs = data.get("total_docs", 0)
        _avg_doc_len = data.get("avg_doc_len", 0.0)
        logger.info(f"BM25 index loaded: {_total_docs} docs.")


def save_bm25():
    path = _get_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(
            {
                "inverted_index": dict(_inverted_index),
                "doc_lengths": _doc_lengths,
                "chunk_texts": _chunk_texts,
                "total_docs": _total_docs,
                "avg_doc_len": _avg_doc_len,
            },
            f,
        )


def add_chunks(chunk_ids: List[str], texts: List[str]):
    global _total_docs, _avg_doc_len

    for chunk_id, text in zip(chunk_ids, texts):
        tokens = _tokenize(text)
        _doc_lengths[chunk_id] = len(tokens)
        _chunk_texts[chunk_id] = text[:500]  # store preview

        freq: Dict[str, int] = defaultdict(int)
        for t in tokens:
            freq[t] += 1
        for term, cnt in freq.items():
            _inverted_index[term][chunk_id] = cnt

    _total_docs = len(_doc_lengths)
    if _total_docs > 0:
        _avg_doc_len = sum(_doc_lengths.values()) / _total_docs
    save_bm25()
    logger.debug(f"BM25 index now has {_total_docs} docs.")


def remove_chunks(chunk_ids: List[str]):
    global _total_docs, _avg_doc_len
    remove_set = set(chunk_ids)

    for chunk_id in remove_set:
        _doc_lengths.pop(chunk_id, None)
        _chunk_texts.pop(chunk_id, None)

    for term in list(_inverted_index.keys()):
        for chunk_id in remove_set:
            _inverted_index[term].pop(chunk_id, None)
        if not _inverted_index[term]:
            del _inverted_index[term]

    _total_docs = len(_doc_lengths)
    if _total_docs > 0:
        _avg_doc_len = sum(_doc_lengths.values()) / _total_docs
    else:
        _avg_doc_len = 0.0
    save_bm25()


def search_bm25(query: str, top_k: int = 10) -> List[Tuple[str, float]]:
    """Return list of (chunk_id, bm25_score) sorted descending."""
    if _total_docs == 0:
        load_bm25()
    if _total_docs == 0:
        return []

    tokens = _tokenize(query)
    scores: Dict[str, float] = defaultdict(float)

    for term in tokens:
        if term not in _inverted_index:
            continue
        posting = _inverted_index[term]
        df = len(posting)
        idf = math.log(((_total_docs - df + 0.5) / (df + 0.5)) + 1)

        for chunk_id, tf in posting.items():
            dl = _doc_lengths.get(chunk_id, _avg_doc_len)
            tf_norm = (tf * (BM25_K1 + 1)) / (
                tf + BM25_K1 * (1 - BM25_B + BM25_B * (dl / max(_avg_doc_len, 1)))
            )
            scores[chunk_id] += idf * tf_norm

    sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return sorted_scores[:top_k]
