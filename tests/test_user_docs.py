"""
Unit tests for user document chunking, indexing, and deletion.
100% Law-agnostic.
"""
import pytest
from core.schema import PageResult
from core.user_docs import chunk_user_document, get_user_documents, delete_user_document


def test_chunk_user_document_sections():
    sample_text = (
        "1. Short title and commencement.—This Act may be called the Test Agreement.\n\n"
        "2. Definitions.—In this Agreement, party means the contracting party.\n\n"
        "3. Core obligations.—Each party shall perform with due diligence."
    )
    pages = [PageResult(law_id="test_doc", page=1, text=sample_text, source="text")]
    chunks = chunk_user_document(pages, doc_id="test_doc", filename="test.pdf")

    assert len(chunks) == 3
    assert chunks[0].section == "1"
    assert "Test Agreement" in chunks[0].text
    assert chunks[1].section == "2"
    assert chunks[2].section == "3"


def test_chunk_user_document_paragraphs():
    sample_text = (
        "This is an informal legal memorandum regarding breach of warranty.\n\n"
        "The first party failed to deliver goods on the specified delivery date.\n\n"
        "As a result, damages of PKR 500,000 were sustained by the claimant."
    )
    pages = [PageResult(law_id="test_memo", page=1, text=sample_text, source="text")]
    chunks = chunk_user_document(pages, doc_id="test_memo", filename="memo.txt")

    assert len(chunks) >= 1
    assert "PKR 500,000" in chunks[0].text
    assert chunks[0].law_name == "memo.txt"
