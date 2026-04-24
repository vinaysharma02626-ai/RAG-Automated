import os
import uuid
import logging
import asyncio
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.database import get_db
from app.core.config import settings
from app.models.document import Document
from app.models.chunk import Chunk
from app.services.ingestion import ingest_document
from app.services import vector_store, bm25_index

router = APIRouter()
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".docx"}
MAX_SIZE_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


class DocumentResponse(BaseModel):
    id: str
    filename: str
    original_name: str
    file_type: str
    file_size: int
    upload_time: str
    status: str
    error_message: Optional[str]
    chunk_count: int
    page_count: int
    title: Optional[str]

    class Config:
        from_attributes = True


class ReindexRequest(BaseModel):
    chunk_size: Optional[int] = None
    chunk_overlap: Optional[int] = None


@router.get("/", response_model=List[DocumentResponse])
async def list_documents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).order_by(Document.upload_time.desc()))
    docs = result.scalars().all()
    return [
        DocumentResponse(
            id=d.id,
            filename=d.filename,
            original_name=d.original_name,
            file_type=d.file_type,
            file_size=d.file_size,
            upload_time=d.upload_time.isoformat(),
            status=d.status,
            error_message=d.error_message,
            chunk_count=d.chunk_count,
            page_count=d.page_count,
            title=d.title,
        )
        for d in docs
    ]


@router.post("/upload")
async def upload_documents(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
):
    results = []

    for file in files:
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            results.append({"filename": file.filename, "error": f"Unsupported file type: {ext}"})
            continue

        content = await file.read()
        if len(content) > MAX_SIZE_BYTES:
            results.append(
                {
                    "filename": file.filename,
                    "error": f"File too large. Max size: {settings.MAX_UPLOAD_SIZE_MB}MB",
                }
            )
            continue

        # Save file
        doc_id = str(uuid.uuid4())
        safe_name = f"{doc_id}{ext}"
        file_path = os.path.join(settings.UPLOAD_DIR, safe_name)
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

        with open(file_path, "wb") as f:
            f.write(content)

        # Create DB record
        doc = Document(
            id=doc_id,
            filename=safe_name,
            original_name=file.filename,
            file_type=ext.lstrip("."),
            file_size=len(content),
            status="pending",
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)

        # Queue ingestion
        background_tasks.add_task(ingest_document, doc_id, db)

        results.append(
            {
                "id": doc_id,
                "filename": file.filename,
                "status": "pending",
                "size": len(content),
            }
        )

    return {"uploaded": results}


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")
    return DocumentResponse(
        id=doc.id,
        filename=doc.filename,
        original_name=doc.original_name,
        file_type=doc.file_type,
        file_size=doc.file_size,
        upload_time=doc.upload_time.isoformat(),
        status=doc.status,
        error_message=doc.error_message,
        chunk_count=doc.chunk_count,
        page_count=doc.page_count,
        title=doc.title,
    )


@router.get("/{doc_id}/chunks")
async def get_chunks(doc_id: str, limit: int = 20, offset: int = 0, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Chunk)
        .where(Chunk.document_id == doc_id)
        .order_by(Chunk.chunk_index)
        .limit(limit)
        .offset(offset)
    )
    chunks = result.scalars().all()
    return [
        {
            "id": c.id,
            "chunk_index": c.chunk_index,
            "text": c.text[:500],
            "heading": c.heading,
            "section_path": c.section_path,
            "page_start": c.page_start,
            "page_end": c.page_end,
            "token_count": c.token_count,
            "chunk_type": c.chunk_type,
        }
        for c in chunks
    ]


@router.post("/{doc_id}/reindex")
async def reindex_document(
    doc_id: str,
    req: ReindexRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")

    background_tasks.add_task(ingest_document, doc_id, db)
    return {"status": "reindexing", "doc_id": doc_id}


@router.delete("/{doc_id}")
async def delete_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Document not found")

    # Get chunk IDs for index cleanup
    chunks_result = await db.execute(select(Chunk.id).where(Chunk.document_id == doc_id))
    chunk_ids = [r[0] for r in chunks_result.fetchall()]

    # Remove from indexes
    if chunk_ids:
        vector_store.remove_document_embeddings(chunk_ids)
        bm25_index.remove_chunks(chunk_ids)

    # Delete file
    file_path = os.path.join(settings.UPLOAD_DIR, doc.filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    await db.delete(doc)
    await db.commit()
    return {"deleted": doc_id}
