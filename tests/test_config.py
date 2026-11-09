"""
Test configuration loading and law registry validation.
"""
from pathlib import Path
import pytest
from core.config import load_laws, get_enabled_laws, get_settings
from core.schema import LawConfig, Chunk, PageResult, AskRequest, AskResponse


def test_settings_load():
    settings = get_settings()
    assert settings.EMBED_DIM == 768
    assert settings.COLLECTION_NAME == "legal_docs"
    assert settings.MIN_SCORE == 0.45


def test_load_laws():
    laws = load_laws("laws.yaml")
    assert len(laws) >= 2
    for law_id, cfg in laws.items():
        assert isinstance(cfg, LawConfig)
        assert cfg.name
        assert cfg.full_name
        assert cfg.year > 0
        assert cfg.pdf
        assert cfg.chunker == "section"


def test_get_enabled_laws():
    enabled = get_enabled_laws("laws.yaml")
    assert len(enabled) >= 1
    for law_id, cfg in enabled.items():
        assert cfg.enabled is True


def test_schema_models():
    page = PageResult(law_id="dummy_law", page=1, text="Sample text", source="text")
    assert page.page == 1
    assert page.ocr_used is False

    chunk = Chunk(
        id="dummy_law:1",
        law_id="dummy_law",
        law_name="Dummy Law",
        law_short="Dummy",
        year=2024,
        section="1",
        title="Short Title",
        text="This is section 1 text.",
        page_start=1,
        page_end=1,
        source="text",
        status="active"
    )
    assert chunk.id == "dummy_law:1"

    req = AskRequest(question="Test legal query?")
    assert req.question == "Test legal query?"
    assert req.debug is False

    resp = AskResponse(answer="Legal answer text", found=True, disclaimer="Notice")
    assert resp.found is True
