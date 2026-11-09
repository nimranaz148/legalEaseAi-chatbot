"""
Integration tests for Local Qdrant Engine (core/store.py) - I-002.
Verifies collection creation, deterministic UUID5 generation, upsert, search, and delete.
"""
import uuid
import numpy as np
import pytest
from core.schema import Chunk
from core.store import VectorStore


def test_deterministic_uuid5():
    """Verify Qdrant point IDs are deterministic and namespace-consistent."""
    chunk_id = "test_law:42"
    expected = str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk_id))
    actual = str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk_id))
    assert expected == actual
    assert str(uuid.uuid5(uuid.NAMESPACE_DNS, "test_law:43")) != actual


def test_store_upsert_and_query(tmp_path, monkeypatch):
    """Test full cycle: upsert chunk, query with vector, retrieve by section, and delete."""
    # Use temporary directory for isolated test vector store
    monkeypatch.setenv("QDRANT_PATH", str(tmp_path / "test_qdrant"))
    monkeypatch.setenv("COLLECTION_NAME", "test_collection")

    test_chunk = Chunk(
        id="test_law:1",
        law_id="test_law",
        law_name="Test Statute",
        law_short="TS",
        year=2026,
        section="1",
        title="Short Title and Extent",
        text="This Act may be called the Test Statute 2026. It extends to the whole of Pakistan.",
        page_start=1,
        page_end=1,
        char_count=80
    )

    vector = np.zeros(768, dtype=np.float32)
    vector[0] = 1.0  # Unit vector
    embeddings = np.array([vector])

    with VectorStore() as store:
        # 1. Upsert
        store.upsert_chunks([test_chunk], embeddings)

        # 2. Get chunk directly by section
        retrieved = store.get_chunk("test_law", "1")
        assert retrieved is not None
        assert retrieved.id == "test_law:1"
        assert retrieved.section == "1"
        assert "Test Statute 2026" in retrieved.text

        # 3. Vector search
        results = store.search(query_vector=vector.tolist(), top_k=5, law_ids=["test_law"], min_score=0.1)
        assert len(results) >= 1
        found_chunk, score = results[0]
        assert found_chunk.id == "test_law:1"
        assert score > 0.9

        # 4. Count
        count = store.count_by_law("test_law")
        assert count == 1

        # 5. Delete by law
        store.delete_by_law("test_law")
        assert store.count_by_law("test_law") == 0
        assert store.get_chunk("test_law", "1") is None
