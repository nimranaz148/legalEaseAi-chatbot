"""
Cleaning and Normalization stage: rule-based filters and guarded LLM cleaning.
Guards against summarization and statutory truncation with automatic safety fallback.
Cached at data/clean/<law_id>.json.
"""
import json
import logging
import re
from pathlib import Path
from core.schema import PageResult
from core.llm import generate_text

logger = logging.getLogger(__name__)

SECTION_NUM_REGEX = re.compile(r"^\s*(\d+[A-Z]*)\.", re.MULTILINE)

CLEANING_PROMPT = (
    "You are a legal text normalization system. Clean the following statutory text extracted from a PDF.\n"
    "Tasks:\n"
    "1. Fix OCR noise, broken line wraps, and remove duplicated header/footer fragments.\n"
    "2. CRITICAL CONSTRAINT: Do NOT paraphrase, summarize, omit, or reorder statutory text.\n"
    "3. NEVER change section numbers, words, or legal punctuation.\n"
    "4. Return ONLY the cleaned legal text. No preface, notes, or markdown fences.\n\n"
    "Input text:\n"
)


def rule_based_preclean(text: str) -> str:
    """Deterministic, fast normalization."""
    # Normalize unicode replacement characters, quotes and dashes
    t = text.replace("\ufffd", "—").replace("—", "—").replace("–", "—").replace("―", "—")
    t = t.replace("“", '"').replace("”", '"').replace("’", "'").replace("‘", "'")

    # Fix broken hyphenation across linebreaks: e.g. "compen-\nsation" -> "compensation"
    t = re.sub(r"(\b[a-zA-Z]+)-\n\s*([a-zA-Z]+\b)", r"\1\2", t)

    # Strip standalone page number lines: e.g. "Page 14 of 45" or isolated numbers
    t = re.sub(r"^\s*(?:Page\s+)?\d+(?:\s+of\s+\d+)?\s*$", "", t, flags=re.MULTILINE | re.IGNORECASE)

    # Collapse multiple blank lines
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def extract_section_numbers(text: str) -> set[str]:
    """Extracts all section number matches from text."""
    return set(SECTION_NUM_REGEX.findall(text))


def clean_page(page_result: PageResult, use_llm: bool = True) -> str:
    """Cleans a single page with rule pre-cleaning and guarded LLM normalization."""
    rule_cleaned = rule_based_preclean(page_result.text)

    if not use_llm or len(rule_cleaned) < 50:
        return rule_cleaned

    try:
        llm_cleaned = generate_text(prompt=CLEANING_PROMPT + rule_cleaned).strip()

        # Safety Check 1: Length difference > 25%
        len_diff = abs(len(llm_cleaned) - len(rule_cleaned)) / max(len(rule_cleaned), 1)
        if len_diff > 0.25:
            logger.warning(
                "Page %d: LLM cleaning rejected (length diff %.1f%% > 25%%). Falling back to rule-clean.",
                page_result.page, len_diff * 100
            )
            return rule_cleaned

        # Safety Check 2: Section numbers preservation
        input_sections = extract_section_numbers(rule_cleaned)
        output_sections = extract_section_numbers(llm_cleaned)
        if input_sections and not input_sections.issubset(output_sections):
            missing = input_sections - output_sections
            logger.warning(
                "Page %d: LLM cleaning rejected (missing sections %s). Falling back to rule-clean.",
                page_result.page, missing
            )
            return rule_cleaned

        return rule_based_preclean(llm_cleaned)
    except Exception as e:
        logger.warning("Page %d: LLM cleaning error (%s). Falling back to rule-clean.", page_result.page, e)
        return rule_cleaned


def clean_corpus(
    pages: list[PageResult],
    law_id: str,
    use_llm: bool = True,
    force: bool = False,
    cache_dir: str = "data/clean"
) -> list[PageResult]:
    """Cleans extracted pages and caches output to data/clean/<law_id>.json."""
    cache_path = Path(cache_dir) / f"{law_id}.json"
    if cache_path.is_file() and not force:
        logger.info("Loading cached clean text for law '%s' from %s", law_id, cache_path)
        with cache_path.open("r", encoding="utf-8") as f:
            raw_data = json.load(f)
        return [PageResult(**item) for item in raw_data]

    print(f"\nCleaning '{law_id}' ({len(pages)} pages)...")
    cleaned_pages: list[PageResult] = []

    for p in pages:
        cleaned_text = clean_page(p, use_llm=use_llm)
        cleaned_pages.append(
            PageResult(
                law_id=law_id,
                page=p.page,
                text=cleaned_text,
                source=p.source,
                ocr_used=p.ocr_used,
                char_count=len(cleaned_text)
            )
        )

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    with cache_path.open("w", encoding="utf-8") as f:
        json.dump([cp.model_dump() for cp in cleaned_pages], f, indent=2, ensure_ascii=False)

    print(f"Cleaning complete: {len(cleaned_pages)} pages. Cached to {cache_path}")
    return cleaned_pages
