import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer
from app.core.database import Base


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    query_log_id = Column(String, nullable=True)
    rating = Column(Integer, nullable=False)  # 1 = thumbs up, -1 = thumbs down
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
