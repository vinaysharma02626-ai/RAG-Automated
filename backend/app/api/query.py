import logging
import time
import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.config import settings
from app.models.chunk import Chunk
from app.models.document import Document
from app.models.query_log import QueryLog
from app.models.feedback import Feedback
from app.services.retriever import retrieve
from app.services.llm import build_rag_prompt, stream_answer

router = APIRouter()
logger = logging.getLogger(__name__)


class QueryRequest(BaseModel):
    query: str
    doc_ids: Optional[List[str]] = None  # filter to specific docs
    session_id: Optional[str] = None
    answer_mode: str = "concise"  # "concise" | "detailed"
    conversation_history: Optional[List[dict]] = None


class FeedbackRequest(BaseModel):
    query_log_id: str
    rating: int  # 1 or -1
    comment: Optional[str] = None


@router.post("/")
async def query_documents(req: QueryRequest, db: AsyncSession = Depends(get_db)):
    """RAG query endpoint with streaming response."""
    if not req.query.strip():
        raise HTTPException(400, "Query cannot be empty")

    t_start = time.time()

    # 1. Retrieve chunks
    try:
        retrieved = retrieve(req.query, top_k=settings.TOP_K_RETRIEVAL, doc_ids=req.doc_ids)
    except Exception as e:
        logger.error(f"Retrieval error: {e}", exc_info=True)
        raise HTTPException(500, f"Retrieval failed: {str(e)}")

    if not retrieved:
        return StreamingResponse(
            _no_docs_stream(),
            media_type="text/event-stream",
        )

    # 2. Fetch top-N chunk details from DB
    top_n = settings.TOP_N_RERANK
    chunk_ids = [r.chunk_id for r in retrieved[:top_n]]

    chunks_result = await db.execute(
        select(Chunk, Document.original_name)
        .join(Document, Chunk.document_id == Document.id)
        .where(Chunk.id.in_(chunk_ids))
    )
    rows = chunks_result.fetchall()

    # Build context dicts, maintaining retrieval order
    id_to_chunk = {}
    for chunk, doc_name in rows:
        id_to_chunk[chunk.id] = {
            "chunk_id": chunk.id,
            "document_id": chunk.document_id,
            "document_name": doc_name,
            "text": chunk.text,
            "heading": chunk.heading,
            "section_path": chunk.section_path,
            "page_start": chunk.page_start,
            "page_end": chunk.page_end,
            "chunk_type": chunk.chunk_type,
        }

    context_chunks = [id_to_chunk[cid] for cid in chunk_ids if cid in id_to_chunk]

    # Filter by doc_ids if specified
    if req.doc_ids:
        context_chunks = [c for c in context_chunks if c["document_id"] in req.doc_ids]

    if not context_chunks:
        return StreamingResponse(
            _no_docs_stream(),
            media_type="text/event-stream",
        )

    # 3. Build prompt
    system_prompt, messages = build_rag_prompt(
        req.query,
        context_chunks,
        req.conversation_history,
        req.answer_mode,
    )

    # 4. Log query
    log_entry = QueryLog(
        session_id=req.session_id,
        query_text=req.query,
        chunks_used=len(context_chunks),
        doc_ids=req.doc_ids,
        status="success",
    )
    db.add(log_entry)
    await db.commit()
    await db.refresh(log_entry)

    # 5. Stream response with sources metadata
    async def event_stream():
        # First emit the sources as a JSON event
        sources_data = json.dumps(
            {
                "type": "sources",
                "query_log_id": log_entry.id,
                "sources": context_chunks,
            }
        )
        yield f"data: {sources_data}\n\n"

        # Stream LLM tokens
        full_answer = ""
        try:
            async for token in stream_answer(system_prompt, messages):
                full_answer += token
                token_data = json.dumps({"type": "token", "content": token})
                yield f"data: {token_data}\n\n"
        except Exception as e:
            logger.error(f"LLM streaming error: {e}", exc_info=True)
            err_data = json.dumps({"type": "error", "content": str(e)})
            yield f"data: {err_data}\n\n"

        # Emit done event
        latency = (time.time() - t_start) * 1000
        done_data = json.dumps({"type": "done", "latency_ms": latency})
        yield f"data: {done_data}\n\n"

        # Update log with answer
        log_entry.answer_text = full_answer[:2000]
        log_entry.latency_ms = latency
        await db.commit()

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/feedback")
async def submit_feedback(req: FeedbackRequest, db: AsyncSession = Depends(get_db)):
    if req.rating not in (1, -1):
        raise HTTPException(400, "Rating must be 1 (positive) or -1 (negative)")

    fb = Feedback(
        query_log_id=req.query_log_id,
        rating=req.rating,
        comment=req.comment,
    )
    db.add(fb)
    await db.commit()
    return {"status": "ok"}


async def _no_docs_stream():
    msg = json.dumps(
        {
            "type": "token",
            "content": "No relevant documents found. Please upload documents first or try a different query.",
        }
    )
    yield f"data: {msg}\n\n"
    yield f"data: {json.dumps({'type': 'done', 'latency_ms': 0})}\n\n"
