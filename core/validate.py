"""
Citation Verification Guardrail:
Validates that every citation references a retrieved chunk and that the cited quote
exists character-for-character (verbatim, whitespace normalized) within that chunk.
Enforces non-negotiable citation accuracy.
"""
import re
from typing import Optional
from core.schema import Chunk, Citation


def normalize_whitespace(text: str) -> str:
    """Normalizes whitespace and standardizes quotation marks/dashes for comparison."""
    t = re.sub(r"\s+", " ", text)
    t = t.replace("“", '"').replace("”", '"').replace("’", "'").replace("‘", "'")
    t = t.replace("—", "-").replace("–", "-")
    return t.strip()


def validate_citations(
    citations: list[Citation],
    retrieved_chunks: list[Chunk]
) -> tuple[list[Citation], list[str]]:
    """
    Validates a list of citations against retrieved chunks.
    Returns: (valid_citations, list_of_rejection_reasons)
    """
    chunks_by_id = {c.id: c for c in retrieved_chunks}
    valid_citations: list[Citation] = []
    rejections: list[str] = []

    for cit in citations:
        # Check 1: Citation chunk ID exists in retrieved set
        # Check exact ID or base section ID (e.g. contract_act:73 matches contract_act:73#1)
        target_chunk: Optional[Chunk] = None
        if cit.id in chunks_by_id:
            target_chunk = chunks_by_id[cit.id]
        else:
            # Check prefix match for split chunks
            for cid, chunk in chunks_by_id.items():
                if cid.startswith(cit.id + "#") or cit.id.startswith(cid + "#"):
                    target_chunk = chunk
                    break

        if not target_chunk:
            rejections.append(f"Rejected citation [{cit.id}]: chunk was not among retrieved results.")
            continue

        # Check 2: Cited quote exists verbatim in chunk text
        norm_quote = normalize_whitespace(cit.quote)
        norm_text = normalize_whitespace(target_chunk.text)

        if not norm_quote:
            rejections.append(f"Rejected citation [{cit.id}]: empty quotation provided.")
            continue

        if norm_quote not in norm_text:
            # Try a sub-quote or first sentence if quote is long
            rejections.append(
                f"Rejected citation [{cit.id}]: quote '{cit.quote[:40]}...' does not exist verbatim in statutory text."
            )
            continue

        # Enrich citation with verified metadata from chunk payload
        enriched = Citation(
            id=target_chunk.id,
            law_name=target_chunk.law_name,
            section=target_chunk.section,
            title=target_chunk.title,
            quote=cit.quote,
            page_start=target_chunk.page_start
        )
        valid_citations.append(enriched)

    return valid_citations, rejections
