"""
Query Retrieval Pipeline: Section shortcut routing, query rewriting, and vector similarity search.
Enforces the no-data threshold gate.
"""
import logging
import re
from typing import Optional
from core.config import get_settings, get_enabled_laws
from core.schema import Chunk
from core.store import VectorStore
from core.llm import embed_texts, generate_text

logger = logging.getLogger(__name__)

# Section shortcut pattern: "section 73", "sec. 73", "s. 73", "article 25"
SECTION_REGEX = re.compile(r"\b(?:section|sec\.?|s\.|article|art\.?)\s*(\d+[A-Z]{0,2})\b", re.IGNORECASE)

REWRITE_PROMPT = (
    "You are a legal query pre-processor. Translate or rewrite the following user question "
    "(which may be in English, Urdu, or Roman Urdu) into a clear, concise English legal search query.\n"
    "Keep the query focused on statutory concepts and legal terms. Return ONLY the search query without quotes or preamble.\n\n"
    "Question: "
)


def rewrite_query(question: str) -> str:
    """Translates or normalizes vernacular queries into standard English statutory terms."""
    q = question.strip()
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        return q

    # If already pure English and brief, skip LLM call
    if all(ord(c) < 128 for c in q) and len(q.split()) <= 6:
        return q

    try:
        rewritten = generate_text(prompt=REWRITE_PROMPT + q).strip()
        return rewritten if rewritten and "not set" not in rewritten.lower() else q
    except Exception as e:
        logger.debug("Query rewriting skipped: %s", e)
        return q


def detect_section_shortcuts(question: str, law_ids: Optional[list[str]] = None, store: Optional[VectorStore] = None) -> list[Chunk]:
    """Detects explicit section numbers in question and retrieves matching chunks directly."""
    match = SECTION_REGEX.search(question)
    if not match:
        return []

    sec_num = match.group(1).upper()
    enabled_laws = get_enabled_laws()
    candidate_laws = [lid for lid in enabled_laws.keys() if (not law_ids or lid in law_ids)]

    # Check if a specific law name/short was mentioned in question
    q_lower = question.lower()
    targeted_law: Optional[str] = None
    for lid in candidate_laws:
        cfg = enabled_laws[lid]
        if cfg.name.lower() in q_lower or cfg.short.lower() in q_lower:
            targeted_law = lid
            break

    search_laws = [targeted_law] if targeted_law else candidate_laws
    shortcut_chunks: list[Chunk] = []

    if store:
        for lid in search_laws:
            chunk = store.get_chunk(lid, sec_num)
            if chunk:
                shortcut_chunks.append(chunk)

    return shortcut_chunks


def retrieve_relevant_chunks(
    question: str,
    law_ids: Optional[list[str]] = None,
    top_k: Optional[int] = None,
    min_score: Optional[float] = None
) -> tuple[list[Chunk], list[dict], Optional[str]]:
    """
    Executes hybrid retrieval:
    1. Rewrite query if needed.
    2. Check section shortcuts.
    3. Perform vector search.
    4. Enforce no-data gate.
    Returns: (chunks, retrieved_debug_info, rewritten_query)
    """
    settings = get_settings()
    k = top_k or settings.TOP_K
    cutoff = min_score if min_score is not None else settings.MIN_SCORE
    if not settings.GEMINI_API_KEY:
        cutoff = min(cutoff, 0.12)

    rewritten = rewrite_query(question)

    with VectorStore() as store:
        # 1. Section shortcut check
        shortcut_chunks = detect_section_shortcuts(question, law_ids=law_ids, store=store)

        # 2. Vector search
        query_vector = embed_texts([rewritten], task_type="RETRIEVAL_QUERY")[0].tolist()
        vector_results = store.search(
            query_vector=query_vector,
            top_k=k,
            law_ids=law_ids,
            min_score=cutoff
        )

    debug_retrieved = []
    seen_ids = set()
    final_chunks: list[Chunk] = []

    # Place shortcut chunks first
    for sc in shortcut_chunks:
        final_chunks.append(sc)
        seen_ids.add(sc.id)
        debug_retrieved.append({"id": sc.id, "score": 1.0, "shortcut": True})

    # Fill remaining slots with vector results
    for chunk, score in vector_results:
        if chunk.id not in seen_ids and len(final_chunks) < k:
            final_chunks.append(chunk)
            seen_ids.add(chunk.id)
            debug_retrieved.append({"id": chunk.id, "score": float(score), "shortcut": False})

    # No-data gate: if vector score is below threshold and no shortcut matched
    if not final_chunks:
        return [], debug_retrieved, rewritten

    return final_chunks, debug_retrieved, rewritten
