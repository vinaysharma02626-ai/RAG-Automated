import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Enum, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String, nullable=False)
    original_name = Column(String, nullable=False)
    file_type = Column(Enum("pdf", "docx", name="file_type_enum"), nullable=False)
    file_size = Column(Integer, nullable=False)
    upload_time = Column(DateTime, default=datetime.utcnow)
    status = Column(
        Enum("pending", "indexing", "ready", "failed", name="doc_status_enum"),
        default="pending",
    )
    error_message = Column(Text, nullable=True)
    chunk_count = Column(Integer, default=0)
    page_count = Column(Integer, default=0)
    title = Column(String, nullable=True)

    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")
