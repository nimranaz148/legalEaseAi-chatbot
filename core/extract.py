"""
PDF Extraction stage: extracts text layer with PyMuPDF and falls back to OCR for scanned pages.
Results cached on disk at data/extracted/<law_id>.json.
"""
import json
import logging
from pathlib import Path
from typing import Optional
import fitz  # PyMuPDF
from core.schema import PageResult
from core.ocr import transcribe_page_image

logger = logging.getLogger(__name__)


def should_use_ocr(page: fitz.Page, text: str) -> bool:
    """
    Determines if page requires OCR:
    - Extracted text has fewer than 80 characters, OR
    - Page contains large images covering most of page with very little text.
    """
    clean_text = text.strip()
    if len(clean_text) < 80:
        return True

    # Check images on page
    image_list = page.get_images()
    if image_list and len(clean_text) < 200:
        return True

    return False


def extract_pdf(
    pdf_path: str,
    law_id: str,
    page_range: Optional[list[int]] = None,
    ocr_provider: str = "",
    force: bool = False,
    cache_dir: str = "data/extracted"
) -> list[PageResult]:
    """
    Extracts text page-by-page from a statutory PDF.
    Caches output to data/extracted/<law_id>.json.
    """
    cache_path = Path(cache_dir) / f"{law_id}.json"
    if cache_path.is_file() and not force:
        logger.info("Loading cached extraction for law '%s' from %s", law_id, cache_path)
        with cache_path.open("r", encoding="utf-8") as f:
            raw_data = json.load(f)
        return [PageResult(**item) for item in raw_data]

    p = Path(pdf_path)
    if not p.is_file():
        raise FileNotFoundError(f"Source PDF for law '{law_id}' not found at: {pdf_path}")

    doc = fitz.open(p)
    total_pages = len(doc)
    start_page = 1
    end_page = total_pages

    if page_range and len(page_range) == 2:
        start_page = max(1, page_range[0])
        end_page = min(total_pages, page_range[1])

    results: list[PageResult] = []
    text_count = 0
    ocr_count = 0

    print(f"\nExtracting '{law_id}' ({start_page} to {end_page} of {total_pages} pages)...")

    for pno in range(start_page - 1, end_page):
        page = doc[pno]
        raw_text = page.get_text()
        page_num = pno + 1

        if should_use_ocr(page, raw_text):
            logger.info("Page %d has low text density (<80 chars); routing to OCR...", page_num)
            pix = page.get_pixmap(dpi=200)
            img_bytes = pix.tobytes("png")
            extracted_text = transcribe_page_image(img_bytes, provider=ocr_provider)
            source_type = "ocr"
            ocr_count += 1
        else:
            extracted_text = raw_text
            source_type = "text"
            text_count += 1

        results.append(
            PageResult(
                law_id=law_id,
                page=page_num,
                text=extracted_text,
                source=source_type,
                ocr_used=(source_type == "ocr"),
                char_count=len(extracted_text)
            )
        )

    doc.close()

    # Cache results
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    with cache_path.open("w", encoding="utf-8") as f:
        json.dump([r.model_dump() for r in results], f, indent=2, ensure_ascii=False)

    print(f"Extraction summary: {len(results)} pages ({text_count} text, {ocr_count} OCR). Cached to {cache_path}")
    return results
