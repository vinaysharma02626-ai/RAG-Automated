import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.document import Document
from app.models.query_log import QueryLog
from app.models.feedback import Feedback

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    doc_count = await db.scalar(select(func.count(Document.id)))
    ready_count = await db.scalar(
        select(func.count(Document.id)).where(Document.status == "ready")
    )
    query_count = await db.scalar(select(func.count(QueryLog.id)))
    avg_latency = await db.scalar(select(func.avg(QueryLog.latency_ms)))
    avg_chunks = await db.scalar(select(func.avg(QueryLog.chunks_used)))
    feedback_positive = await db.scalar(
        select(func.count(Feedback.id)).where(Feedback.rating == 1)
    )
    feedback_negative = await db.scalar(
        select(func.count(Feedback.id)).where(Feedback.rating == -1)
    )

    return {
        "documents": {
            "total": doc_count or 0,
            "ready": ready_count or 0,
        },
        "queries": {
            "total": query_count or 0,
            "avg_latency_ms": round(avg_latency or 0, 1),
            "avg_chunks_used": round(avg_chunks or 0, 1),
        },
        "feedback": {
            "positive": feedback_positive or 0,
            "negative": feedback_negative or 0,
        },
    }


@router.get("/logs")
async def get_recent_logs(limit: int = 20, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(QueryLog).order_by(QueryLog.created_at.desc()).limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": l.id,
            "session_id": l.session_id,
            "query_text": l.query_text[:200],
            "chunks_used": l.chunks_used,
            "latency_ms": l.latency_ms,
            "status": l.status,
            "created_at": l.created_at.isoformat(),
        }
        for l in logs
    ]
