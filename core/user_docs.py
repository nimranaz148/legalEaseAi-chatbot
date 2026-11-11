"""
User Document Ingestion, Chunking, Vector Indexing, and Deletion.
Allows users to upload custom legal documents (PDFs, scanned docs, images),
chunk them semantically, store their embeddings in Qdrant Vector DB,
query them with RAG, and permanently delete them on demand.
100% Law-agnostic. Zero hardcoded statute names.
"""
import io
import json
import logging
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
from core.config import get_settings
from core.extract import should_use_ocr
from core.llm import embed_texts
from core.ocr import ocr_gemini_vision
from core.schema import Chunk, PageResult
from core.store import VectorStore

logger = logging.getLogger(__name__)

USER_DOCS_REGISTRY = Path("data/user_documents.json")


def _load_registry() -> list[dict]:
    """Load user documents registry from disk."""
    if not USER_DOCS_REGISTRY.is_file():
        return []
    try:
        with USER_DOCS_REGISTRY.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning("Could not read user_documents.json: %s", e)
        return []


def _save_registry(docs: list[dict]) -> None:
    """Persist user documents registry to disk."""
    USER_DOCS_REGISTRY.parent.mkdir(parents=True, exist_ok=True)
    with USER_DOCS_REGISTRY.open("w", encoding="utf-8") as f:
        json.dump(docs, f, indent=2, ensure_ascii=False)


def get_user_documents() -> list[dict]:
    """Returns list of currently indexed user documents."""
    return _load_registry()


def chunk_user_document(
    pages: list[PageResult],
    doc_id: str,
    filename: str
) -> list[Chunk]:
    """
    Chunks an uploaded document semantically.
    Tries statutory section regex first; if fewer than 2 sections found,
    splits by logical paragraph/clause blocks (~800-1200 characters).
    """
    if not pages:
        return []

    # 1. Build concatenated text and page boundary map
    full_text = ""
    page_offsets: list[tuple[int, int, int]] = []
    current_idx = 0

    for p in pages:
        ptxt = p.text + "\n\n"
        start = current_idx
        end = current_idx + len(ptxt)
        page_offsets.append((start, end, p.page))
        full_text += ptxt
        current_idx = end

    def get_page_for_offset(offset: int) -> int:
        for s, e, pno in page_offsets:
            if s <= offset < e:
                return pno
        return page_offsets[-1][2] if page_offsets else 1

    # 2. Try section-pattern matching first
    section_pattern = re.compile(
        r"^\s*(\d+[A-Z]{0,2}|(?:Section|Article|Clause)\s+\d+)\.?\s+([^\n\.\?\:\u2014]+?)(?:\.\s*[\u2014\-]|[\.\?\:\u2014\-]{1,3}|\n)",
        re.MULTILINE | re.IGNORECASE
    )
    matches = list(section_pattern.finditer(full_text))

    chunks: list[Chunk] = []

    if len(matches) >= 2:
        for idx, match in enumerate(matches):
            sec_num = match.group(1).strip()
            sec_title = match.group(2).strip().rstrip(".?:—–- ")
            start_char = match.start()
            end_char = matches[idx + 1].start() if idx + 1 < len(matches) else len(full_text)
            body_text = full_text[start_char:end_char].strip()

            p_start = get_page_for_offset(start_char)
            p_end = get_page_for_offset(max(start_char, end_char - 1))

            chunks.append(
                Chunk(
                    id=f"{doc_id}:{sec_num}",
                    law_id=doc_id,
                    law_name=filename,
                    law_short=filename[:25],
                    year=datetime.now().year,
                    section=sec_num,
                    title=sec_title or f"Section {sec_num}",
                    text=body_text,
                    page_start=p_start,
                    page_end=p_end,
                    source="ocr" if any(p.ocr_used for p in pages) else "text",
                    status="active"
                )
            )
        return chunks

    # 3. Fallback: Logical paragraph/clause block chunking
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", full_text) if p.strip()]
    target_chunk_size = 1000
    current_chunk_paras: list[str] = []
    current_len = 0
    chunk_index = 1

    char_cursor = 0

    for para in paragraphs:
        current_chunk_paras.append(para)
        current_len += len(para) + 2

        if current_len >= target_chunk_size:
            chunk_body = "\n\n".join(current_chunk_paras)
            p_start = get_page_for_offset(char_cursor)
            char_cursor += len(chunk_body)
            p_end = get_page_for_offset(char_cursor)

            first_line = chunk_body.split("\n")[0][:60].strip()
            title = first_line if len(first_line) > 5 else f"Clause {chunk_index}"

            chunks.append(
                Chunk(
                    id=f"{doc_id}:part_{chunk_index}",
                    law_id=doc_id,
                    law_name=filename,
                    law_short=filename[:25],
                    year=datetime.now().year,
                    section=f"Part {chunk_index}",
                    title=title,
                    text=chunk_body,
                    page_start=p_start,
                    page_end=p_end,
                    source="ocr" if any(p.ocr_used for p in pages) else "text",
                    status="active"
                )
            )
            chunk_index += 1
            current_chunk_paras = []
            current_len = 0

    if current_chunk_paras:
        chunk_body = "\n\n".join(current_chunk_paras)
        p_start = get_page_for_offset(char_cursor)
        p_end = get_page_for_offset(len(full_text) - 1)
        first_line = chunk_body.split("\n")[0][:60].strip()
        title = first_line if len(first_line) > 5 else f"Clause {chunk_index}"

        chunks.append(
            Chunk(
                id=f"{doc_id}:part_{chunk_index}",
                law_id=doc_id,
                law_name=filename,
                law_short=filename[:25],
                year=datetime.now().year,
                section=f"Part {chunk_index}",
                title=title,
                text=chunk_body,
                page_start=p_start,
                page_end=p_end,
                source="ocr" if any(p.ocr_used for p in pages) else "text",
                status="active"
            )
        )

    return chunks


def index_user_document(
    content_bytes: bytes,
    filename: str,
    max_ocr_pages: int = 6
) -> dict:
    """
    Parses, extracts/OCRs, chunks, embeds, and stores a user document in Qdrant.
    """
    if len(content_bytes) == 0:
        raise ValueError("Uploaded file is empty.")

    doc_id = f"userdoc_{uuid.uuid4().hex[:10]}"
    is_pdf = filename.lower().endswith(".pdf")
    is_image = any(filename.lower().endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp"])

    pages: list[PageResult] = []

    if is_image:
        ocr_text = ocr_gemini_vision(content_bytes)
        pages.append(
            PageResult(
                law_id=doc_id,
                page=1,
                text=ocr_text,
                source="ocr",
                ocr_used=True,
                char_count=len(ocr_text)
            )
        )
    elif is_pdf:
        doc = fitz.open(stream=content_bytes, filetype="pdf")
        total_pdf_pages = len(doc)
        max_web_pages = 25
        pages_to_process = min(total_pdf_pages, max_web_pages)
        if total_pdf_pages > max_web_pages:
            logger.info("PDF has %d pages. Processing first %d pages to maintain Gemini Free Tier rate limits.", total_pdf_pages, max_web_pages)

        ocr_count = 0
        for idx in range(pages_to_process):
            pno = idx + 1
            page = doc[idx]
            raw_text = page.get_text()
            if should_use_ocr(page, raw_text):
                if ocr_count < max_ocr_pages:
                    try:
                        pix = page.get_pixmap(dpi=100)
                        img_bytes = pix.tobytes("jpeg")
                        ocr_txt = ocr_gemini_vision(img_bytes, mime_type="image/jpeg")
                        pages.append(
                            PageResult(
                                law_id=doc_id,
                                page=pno,
                                text=ocr_txt,
                                source="ocr",
                                ocr_used=True,
                                char_count=len(ocr_txt)
                            )
                        )
                        ocr_count += 1
                    except Exception as e:
                        pages.append(
                            PageResult(
                                law_id=doc_id,
                                page=pno,
                                text=f"[OCR error on page {pno}: {e}]",
                                source="ocr",
                                ocr_used=True,
                                char_count=0
                            )
                        )
                else:
                    pages.append(
                        PageResult(
                            law_id=doc_id,
                            page=pno,
                            text=f"[Page {pno} skipped to maintain response speed limit]",
                            source="text",
                            ocr_used=False,
                            char_count=0
                        )
                    )
            else:
                pages.append(
                    PageResult(
                        law_id=doc_id,
                        page=pno,
                        text=raw_text,
                        source="text",
                        ocr_used=False,
                        char_count=len(raw_text)
                    )
                )
        doc.close()
    else:
        text = content_bytes.decode("utf-8", errors="replace")
        pages.append(
            PageResult(
                law_id=doc_id,
                page=1,
                text=text,
                source="text",
                ocr_used=False,
                char_count=len(text)
            )
        )

    # Chunk the pages
    chunks = chunk_user_document(pages, doc_id=doc_id, filename=filename)
    if not chunks:
        raise ValueError("Could not extract any readable chunks from this document.")

    # Safeguard against huge chunk volumes on web uploads (Gemini Free Tier RPM)
    max_chunks = 60
    if len(chunks) > max_chunks:
        logger.info("Document '%s' produced %d chunks; capping to %d chunks for optimal interactive indexing.", filename, len(chunks), max_chunks)
        chunks = chunks[:max_chunks]

    # Embed and upsert to Qdrant
    chunk_texts = [c.text for c in chunks]
    embeddings = embed_texts(chunk_texts, task_type="RETRIEVAL_DOCUMENT")

    with VectorStore() as store:
        store.upsert_chunks(chunks, embeddings)

    # Record in registry
    doc_record = {
        "doc_id": doc_id,
        "filename": filename,
        "page_count": len(pages),
        "total_pdf_pages": total_pdf_pages if is_pdf else len(pages),
        "chunk_count": len(chunks),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    registry = _load_registry()
    registry.append(doc_record)
    _save_registry(registry)

    logger.info("Successfully indexed user document '%s' (%s) with %d chunks.", filename, doc_id, len(chunks))
    return doc_record


def delete_user_document(doc_id: str) -> bool:
    """
    Deletes all chunks for the given doc_id from Qdrant Vector DB
    and removes the document from the registry.
    """
    with VectorStore() as store:
        store.delete_by_law(doc_id)

    registry = _load_registry()
    updated_registry = [d for d in registry if d.get("doc_id") != doc_id]
    _save_registry(updated_registry)

    logger.info("Permanently deleted user document '%s' from Qdrant.", doc_id)
    return True
