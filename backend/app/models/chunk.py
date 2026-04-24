import uuid
from sqlalchemy import Column, String, Integer, Text, ForeignKey, Float, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    heading = Column(String, nullable=True)
    section_path = Column(String, nullable=True)
    page_start = Column(Integer, nullable=True)
    page_end = Column(Integer, nullable=True)
    token_count = Column(Integer, default=0)
    chunk_type = Column(String, default="text")  # text, table, list
    metadata_json = Column(JSON, nullable=True)

    document = relationship("Document", back_populates="chunks")
