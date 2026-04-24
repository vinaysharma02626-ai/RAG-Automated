import logging
import time
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.document import Document
from app.models.chunk import Chunk
from app.services.parser import parse_pdf, parse_docx
from app.services.chunker import chunk_document
from app.services.embedder import embed_texts
from app.services import vector_store, bm25_index
from app.core.config import settings

logger = logging.getLogger(__name__)


async def ingest_document(doc_id: str, db: AsyncSession):
    """Full ingestion pipeline for a document."""
    # Mark as indexing
    await db.execute(
        update(Document)
        .where(Document.id == doc_id)
        .values(status="indexing", error_message=None)
    )
    await db.commit()

    try:
        # Fetch document
        result = await db.execute(select(Document).where(Document.id == doc_id))
        doc = result.scalar_one_or_none()
        if not doc:
            raise ValueError(f"Document {doc_id} not found")

        file_path = f"{settings.UPLOAD_DIR}/{doc.filename}"

        # Parse
        logger.info(f"Parsing {doc.file_type} document: {doc.original_name}")
        t0 = time.time()
        if doc.file_type == "pdf":
            parsed = parse_pdf(file_path)
        elif doc.file_type == "docx":
            parsed = parse_docx(file_path)
        else:
            raise ValueError(f"Unsupported file type: {doc.file_type}")
        logger.info(f"Parsed in {time.time()-t0:.2f}s, {len(parsed.blocks)} blocks")

        # Chunk
        chunks = chunk_document(parsed)
        logger.info(f"Created {len(chunks)} chunks")

        # Delete old chunks if re-indexing
        old_chunks_result = await db.execute(
            select(Chunk.id).where(Chunk.document_id == doc_id)
        )
        old_ids = [r[0] for r in old_chunks_result.fetchall()]
        if old_ids:
            vector_store.remove_document_embeddings(old_ids)
            bm25_index.remove_chunks(old_ids)
            for old_id in old_ids:
                await db.execute(
                    Chunk.__table__.delete().where(Chunk.id == old_id)
                )
            await db.commit()

        # Save chunks to DB
        db_chunks = []
        for ch in chunks:
            db_chunk = Chunk(
                document_id=doc_id,
                chunk_index=ch.chunk_index,
                text=ch.text,
                heading=ch.heading,
                section_path=ch.section_path,
                page_start=ch.page_start,
                page_end=ch.page_end,
                token_count=ch.token_count,
                chunk_type=ch.chunk_type,
            )
            db.add(db_chunk)
            db_chunks.append(db_chunk)

        await db.flush()  # get IDs

        # Embed in batches
        batch_size = 32
        all_chunk_ids = [c.id for c in db_chunks]
        all_texts = [c.text for c in chunks]

        for i in range(0, len(all_chunk_ids), batch_size):
            batch_ids = all_chunk_ids[i : i + batch_size]
            batch_texts = all_texts[i : i + batch_size]
            embeddings = embed_texts(batch_texts)
            vector_store.add_embeddings(batch_ids, embeddings)
            bm25_index.add_chunks(batch_ids, batch_texts)

        # Mark ready
        await db.execute(
            update(Document)
            .where(Document.id == doc_id)
            .values(
                status="ready",
                chunk_count=len(chunks),
                page_count=parsed.page_count,
                title=parsed.title or doc.original_name,
            )
        )
        await db.commit()
        logger.info(f"Document {doc_id} ingested successfully in {time.time()-t0:.2f}s")

    except Exception as e:
        logger.error(f"Ingestion failed for {doc_id}: {e}", exc_info=True)
        await db.execute(
            update(Document)
            .where(Document.id == doc_id)
            .values(status="failed", error_message=str(e)[:500])
        )
        await db.commit()
