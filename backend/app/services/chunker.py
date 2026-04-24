import logging
from typing import List, Optional
from dataclasses import dataclass, field

from app.services.parser import ParsedDocument, ParsedBlock
from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class TextChunk:
    text: str
    chunk_index: int
    heading: Optional[str] = None
    section_path: Optional[str] = None
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    token_count: int = 0
    chunk_type: str = "text"


def simple_token_count(text: str) -> int:
    """Rough token estimate: ~4 chars per token."""
    return max(1, len(text) // 4)


def chunk_document(
    doc: ParsedDocument,
    chunk_size: int = None,
    chunk_overlap: int = None,
    max_chunks: int = None,
) -> List[TextChunk]:
    chunk_size = chunk_size or settings.CHUNK_SIZE
    chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP
    max_chunks = max_chunks or settings.MAX_CHUNKS_PER_DOC

    chunks: List[TextChunk] = []
    current_heading: Optional[str] = None
    section_stack: List[str] = []
    current_texts: List[str] = []
    current_pages: List[int] = []
    chunk_index = 0

    def flush_chunk(chunk_type: str = "text") -> Optional[TextChunk]:
        nonlocal chunk_index
        if not current_texts:
            return None
        text = " ".join(current_texts).strip()
        if not text:
            return None
        tokens = simple_token_count(text)
        chunk = TextChunk(
            text=text,
            chunk_index=chunk_index,
            heading=current_heading,
            section_path=" > ".join(section_stack) if section_stack else None,
            page_start=min(current_pages) if current_pages else None,
            page_end=max(current_pages) if current_pages else None,
            token_count=tokens,
            chunk_type=chunk_type,
        )
        chunk_index += 1
        current_texts.clear()
        current_pages.clear()
        return chunk

    def split_large_text(text: str, chunk_type: str, page: Optional[int]) -> List[TextChunk]:
        nonlocal chunk_index
        result = []
        words = text.split()
        step = chunk_size - chunk_overlap
        i = 0
        while i < len(words):
            window = words[i : i + chunk_size]
            piece = " ".join(window)
            tokens = simple_token_count(piece)
            c = TextChunk(
                text=piece,
                chunk_index=chunk_index,
                heading=current_heading,
                section_path=" > ".join(section_stack) if section_stack else None,
                page_start=page,
                page_end=page,
                token_count=tokens,
                chunk_type=chunk_type,
            )
            chunk_index += 1
            result.append(c)
            i += step
        return result

    for block in doc.blocks:
        if len(chunks) >= max_chunks:
            break

        if block.block_type == "table":
            # Flush current buffer first
            ch = flush_chunk()
            if ch:
                chunks.append(ch)
            # Tables become their own chunks
            if simple_token_count(block.text) > chunk_size * 2:
                for sc in split_large_text(block.text, "table", block.page_num):
                    chunks.append(sc)
            else:
                chunks.append(
                    TextChunk(
                        text=block.text,
                        chunk_index=chunk_index,
                        heading=current_heading,
                        section_path=" > ".join(section_stack) if section_stack else None,
                        page_start=block.page_num,
                        page_end=block.page_num,
                        token_count=simple_token_count(block.text),
                        chunk_type="table",
                    )
                )
                chunk_index += 1
            continue

        if block.heading_level > 0:
            # Flush current buffer
            ch = flush_chunk()
            if ch:
                chunks.append(ch)

            # Update section stack
            level = block.heading_level
            while len(section_stack) >= level:
                section_stack.pop()
            section_stack.append(block.text)
            current_heading = block.text

            # Headings themselves also seed the next chunk
            current_texts.append(block.text)
            if block.page_num:
                current_pages.append(block.page_num)
            continue

        # Regular text block
        block_tokens = simple_token_count(block.text)
        current_tokens = simple_token_count(" ".join(current_texts))

        if current_tokens + block_tokens > chunk_size and current_texts:
            ch = flush_chunk()
            if ch:
                chunks.append(ch)
            # Overlap: carry last sentence if possible
            if current_heading:
                current_texts.append(current_heading)

        if block_tokens > chunk_size * 2:
            # Very large block: split it
            ch = flush_chunk()
            if ch:
                chunks.append(ch)
            for sc in split_large_text(block.text, block.block_type, block.page_num):
                chunks.append(sc)
        else:
            current_texts.append(block.text)
            if block.page_num:
                current_pages.append(block.page_num)

    # Flush remainder
    ch = flush_chunk()
    if ch:
        chunks.append(ch)

    logger.info(f"Chunked document into {len(chunks)} chunks.")
    return chunks[: max_chunks]
