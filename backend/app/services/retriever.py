import logging
from typing import List, Optional, Dict, Any
from dataclasses import dataclass

from app.services import vector_store, bm25_index
from app.services.embedder import embed_query
from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class RetrievedChunk:
    chunk_id: str
    score: float
    vector_rank: Optional[int] = None
    bm25_rank: Optional[int] = None
    rrf_score: float = 0.0


def reciprocal_rank_fusion(
    vector_results: List[tuple],
    bm25_results: List[tuple],
    k: int = 60,
    vector_weight: float = None,
    bm25_weight: float = None,
) -> List[RetrievedChunk]:
    """Merge vector and BM25 results using Reciprocal Rank Fusion."""
    vw = vector_weight if vector_weight is not None else settings.VECTOR_WEIGHT
    bw = bm25_weight if bm25_weight is not None else settings.BM25_WEIGHT

    rrf_scores: Dict[str, RetrievedChunk] = {}

    # Vector results
    for rank, (chunk_id, score) in enumerate(vector_results, start=1):
        if chunk_id not in rrf_scores:
            rrf_scores[chunk_id] = RetrievedChunk(chunk_id=chunk_id, score=score)
        rrf_scores[chunk_id].vector_rank = rank
        rrf_scores[chunk_id].rrf_score += vw * (1.0 / (k + rank))

    # BM25 results
    for rank, (chunk_id, score) in enumerate(bm25_results, start=1):
        if chunk_id not in rrf_scores:
            rrf_scores[chunk_id] = RetrievedChunk(chunk_id=chunk_id, score=score)
        rrf_scores[chunk_id].bm25_rank = rank
        rrf_scores[chunk_id].rrf_score += bw * (1.0 / (k + rank))

    merged = sorted(rrf_scores.values(), key=lambda x: x.rrf_score, reverse=True)
    return merged


def retrieve(
    query: str,
    top_k: int = None,
    doc_ids: Optional[List[str]] = None,
) -> List[RetrievedChunk]:
    """
    Perform hybrid retrieval for a query.
    Returns top_k chunks sorted by RRF score.
    """
    top_k = top_k or settings.TOP_K_RETRIEVAL

    # Embed query
    q_embedding = embed_query(query)

    # Vector search
    vector_results = vector_store.search_vectors(q_embedding, top_k=top_k * 2)

    # BM25 search
    bm25_results = bm25_index.search_bm25(query, top_k=top_k * 2)

    # Merge
    merged = reciprocal_rank_fusion(vector_results, bm25_results)

    logger.debug(
        f"Retrieved {len(vector_results)} vector + {len(bm25_results)} BM25 → {len(merged)} merged."
    )

    return merged[:top_k]
