"""
Unit tests for citation validation guardrail (core/validate.py).
Guarantees verbatim quotes and drops ungrounded/hallucinated citations.
"""
from core.schema import Chunk, Citation
from core.validate import validate_citations


def test_validate_citations_success():
    chunk = Chunk(
        id="sample_law:73",
        law_id="sample_law",
        law_name="Sample Statute",
        law_short="Sample",
        year=2024,
        section="73",
        title="Compensation for breach",
        text="When a contract has been broken, the party who suffers is entitled to compensation.",
        page_start=14,
        page_end=15,
        source="text",
        status="active"
    )

    cit = Citation(
        id="sample_law:73",
        law_name="",
        section="",
        title="",
        quote="When a contract has been broken, the party who suffers is entitled to compensation."
    )

    valid, rejections = validate_citations([cit], [chunk])
    assert len(valid) == 1
    assert valid[0].section == "73"
    assert valid[0].page_start == 14
    assert len(rejections) == 0


def test_validate_citations_reject_hallucinated_id():
    chunk = Chunk(
        id="sample_law:73",
        law_id="sample_law",
        law_name="Sample Statute",
        law_short="Sample",
        year=2024,
        section="73",
        title="Compensation",
        text="Sample text.",
        page_start=1,
        page_end=1,
        source="text",
        status="active"
    )

    # Citation references non-retrieved section 420
    cit = Citation(
        id="sample_law:420",
        law_name="",
        section="",
        title="",
        quote="Sample text."
    )

    valid, rejections = validate_citations([cit], [chunk])
    assert len(valid) == 0
    assert len(rejections) == 1
    assert "not among retrieved" in rejections[0]


def test_validate_citations_reject_fabricated_quote():
    chunk = Chunk(
        id="sample_law:73",
        law_id="sample_law",
        law_name="Sample Statute",
        law_short="Sample",
        year=2024,
        section="73",
        title="Compensation",
        text="When a contract has been broken, party gets compensation.",
        page_start=1,
        page_end=1,
        source="text",
        status="active"
    )

    # Citation has fabricated quotation not found in text
    cit = Citation(
        id="sample_law:73",
        law_name="",
        section="",
        title="",
        quote="Every person who commits theft shall be imprisoned for ten years."
    )

    valid, rejections = validate_citations([cit], [chunk])
    assert len(valid) == 0
    assert len(rejections) == 1
    assert "does not exist verbatim" in rejections[0]
