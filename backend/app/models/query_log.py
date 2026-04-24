import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, Float, JSON
from app.core.database import Base


class QueryLog(Base):
    __tablename__ = "query_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String, nullable=True)
    query_text = Column(Text, nullable=False)
    answer_text = Column(Text, nullable=True)
    chunks_used = Column(Integer, default=0)
    latency_ms = Column(Float, nullable=True)
    doc_ids = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="success")
    error_message = Column(Text, nullable=True)
