"""
Unit tests for structure-aware SectionChunker.
Tests header detection, illustration retention, and subsection splitting.
"""
from core.chunkers.section import SectionChunker
from core.schema import LawConfig, PageResult

SAMPLE_STATUTE_TEXT = """
1. Short title.— This Act may be called the Example Act.
It extends to the whole territory.

2. Interpretation-clause.— In this Act the following words and expressions are used:
"Agreement": every promise and every set of promises.
"Contract": an agreement enforceable by law.

73. Compensation for loss or damage caused by breach of contract.—
When a contract has been broken, the party who suffers by such breach is entitled to receive, from the party who has broken the contract, compensation for any loss or damage caused to him thereby.

Illustration
(a) A contracts to sell and deliver 50 mounds of saltpetre to B, at a certain price. A breaks his promise. B is entitled to receive compensation.

Explanation.— In estimating the loss or damage, the means of remedying inconvenience must be considered.
"""


def test_section_chunker():
    cfg = LawConfig(
        name="Example Act",
        full_name="The Example Act, 2024",
        short="Example",
        year=2024,
        pdf="dummy.pdf",
        version_date="2026-11",
        source_url="http://example.com",
        chunker_options={
            "section_pattern": r"^\s*(\d+[A-Z]{0,2})\.\s+(.+?)\.\s*[\u2014\-]",
            "max_chunk_tokens": 600,
            "keep_with_parent": ["Illustration", "Explanation"]
        }
    )

    pages = [PageResult(law_id="example_law", page=1, text=SAMPLE_STATUTE_TEXT, source="text")]
    chunker = SectionChunker()
    chunks = chunker.chunk(pages, cfg, "example_law")

    assert len(chunks) == 3
    sec_ids = [c.section for c in chunks]
    assert "1" in sec_ids
    assert "2" in sec_ids
    assert "73" in sec_ids

    # Verify section 73 keeps Illustration and Explanation
    sec73 = next(c for c in chunks if c.section == "73")
    assert "Illustration" in sec73.text
    assert "Explanation" in sec73.text
    assert "saltpetre" in sec73.text
    assert sec73.title == "Compensation for loss or damage caused by breach of contract"
    assert sec73.status == "active"
