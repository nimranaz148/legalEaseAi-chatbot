"""
Integration tests for FastAPI endpoints (api/main.py).
"""
import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)


def test_api_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "collection_exists" in data


def test_api_laws():
    response = client.get("/laws")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    for law in data:
        assert "law_id" in law
        assert "name" in law
        assert "year" in law
        assert "chunk_count" in law


def test_api_ask_empty_question():
    response = client.post("/ask", json={"question": ""})
    assert response.status_code == 400
    data = response.json()
    assert "detail" in data


def test_api_get_chunk_detail():
    response = client.get("/chunks/contract_act/73")
    # If indexed, returns 200 with chunk details, else 404
    if response.status_code == 200:
        data = response.json()
        assert data["section"] == "73"
        assert "law_name" in data
        assert "text" in data
    else:
        assert response.status_code == 404


def test_api_get_chunk_not_found():
    response = client.get("/chunks/contract_act/999999")
    assert response.status_code == 404


def test_api_ask_section_query():
    response = client.post("/ask", json={"question": "What is Section 73 of the Contract Act?", "debug": True})
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "found" in data
    assert "citations" in data
    assert "debug" in data

