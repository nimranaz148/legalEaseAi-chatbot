"""
Answer Generation and Grounding Engine.
Assembles context blocks, prompts Gemini with strict JSON constraints, and validates citations.
"""
import json
import logging
import re
from typing import Optional
from core.config import get_settings
from core.schema import AskResponse, Chunk, Citation, DebugInfo
from core.llm import generate_text
from core.validate import validate_citations

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = (
    "You are a legal information assistant for Pakistani statutes.\n"
    "Answer ONLY from the provided context blocks.\n"
    "Rules:\n"
    "1. Every factual statement must be supported by a context block. Cite using the block id, e.g. [law_id:73].\n"
    "2. If the context does not contain the answer, set \"found\": false and say you do not have data on this.\n"
    "3. Never invent sections, punishments, case names, or outcomes. Never predict how a case will be decided. Never give personal legal advice.\n"
    "4. Always mention which statute each cited section belongs to.\n"
    "5. Reply in the same language the user used (English, Roman Urdu or Urdu script).\n"
    "6. When quoting statute text, quote exactly and keep quotes short.\n"
    "Return ONLY valid JSON matching this schema: "
    '{"found": bool, "answer": str, "citations": [{"id": str, "quote": str}]}'
)


def extract_json_payload(raw_text: str) -> dict:
    """Extracts JSON object from response string robustly."""
    match = re.search(r"\{.*\}", raw_text, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in response.")
    return json.loads(match.group(0))


def generate_answer(
    question: str,
    chunks: list[Chunk],
    debug_retrieved: Optional[list[dict]] = None,
    rewritten_query: Optional[str] = None
) -> AskResponse:
    """
    Constructs context, invokes Gemini, validates citations, and produces verified AskResponse.
    """
    settings = get_settings()

    # If no chunks retrieved (no-data gate)
    if not chunks:
        return AskResponse(
            answer=settings.NO_DATA_TEXT,
            citations=[],
            found=False,
            disclaimer=settings.DISCLAIMER_TEXT,
            debug=DebugInfo(
                rewritten_query=rewritten_query,
                retrieved=debug_retrieved or [],
                ocr_pages_used=0
            ) if debug_retrieved is not None else None
        )

    # Build context blocks
    context_blocks = []
    ocr_pages_count = 0
    for c in chunks:
        if c.source == "ocr":
            ocr_pages_count += 1
        block = f"[{c.id}] {c.law_name} Section {c.section}: {c.title}\n{c.text}"
        context_blocks.append(block)

    full_context = "\n\n---\n\n".join(context_blocks)
    user_prompt = f"Context:\n{full_context}\n\nQuestion: {question}"

    # LLM generation with retry
    raw_response = ""
    parsed: dict = {}
    for attempt in range(2):
        try:
            raw_response = generate_text(
                prompt=user_prompt,
                system_instruction=SYSTEM_INSTRUCTION,
                json_mode=True
            )
            parsed = extract_json_payload(raw_response)
            break
        except Exception as e:
            logger.warning("Answer parsing attempt %d failed: %s", attempt + 1, e)
            if attempt == 1:
                return AskResponse(
                    answer=settings.NO_DATA_TEXT,
                    citations=[],
                    found=False,
                    disclaimer=settings.DISCLAIMER_TEXT
                )

    found = bool(parsed.get("found", True))
    raw_citations_data = parsed.get("citations", [])

    if not found:
        return AskResponse(
            answer=parsed.get("answer") or settings.NO_DATA_TEXT,
            citations=[],
            found=False,
            disclaimer=settings.DISCLAIMER_TEXT,
            debug=DebugInfo(
                rewritten_query=rewritten_query,
                retrieved=debug_retrieved or [],
                ocr_pages_used=ocr_pages_count
            )
        )

    # Convert to Citation objects
    candidate_citations = []
    for cit in raw_citations_data:
        cid = str(cit.get("id", "")).strip("[] ")
        quote = str(cit.get("quote", "")).strip()
        if cid and quote:
            candidate_citations.append(
                Citation(
                    id=cid,
                    law_name="",
                    section="",
                    title="",
                    quote=quote
                )
            )

    # Run citation validator
    valid_citations, rejections = validate_citations(candidate_citations, chunks)

    # If answer claims found=true but has 0 valid citations, reject as ungrounded
    if not valid_citations:
        logger.warning("All citations failed verification. Reverting to refusal. Rejections: %s", rejections)
        return AskResponse(
            answer=settings.NO_DATA_TEXT,
            citations=[],
            found=False,
            disclaimer=settings.DISCLAIMER_TEXT,
            debug=DebugInfo(
                rewritten_query=rewritten_query,
                retrieved=debug_retrieved or [],
                ocr_pages_used=ocr_pages_count
            )
        )

    return AskResponse(
        answer=parsed.get("answer", ""),
        citations=valid_citations,
        found=True,
        disclaimer=settings.DISCLAIMER_TEXT,
        debug=DebugInfo(
            rewritten_query=rewritten_query,
            retrieved=debug_retrieved or [],
            ocr_pages_used=ocr_pages_count
        )
    )
