# 1. Technology Stack Decision

Date: 2026-11-09

## Status
Accepted

## Context
The Legal Assistant RAG project requires a law-agnostic, statutory retrieval-augmented generation system for Pakistani legal codes (Contract Act 1872, Pakistan Penal Code 1860). The system must run cleanly on a local Windows developer workstation with minimal operational friction, zero paid cloud hosting requirements, and an ironclad guardrail against statutory hallucination.

## Decision
We select the following architecture and stack:
- **Language**: Python 3.10+ using `pathlib` and UTF-8 encoding throughout.
- **PDF Extraction & OCR**: PyMuPDF (`pymupdf`) for text layer extraction with automatic fallback to Gemini Vision OCR for scanned image pages.
- **Cleaning**: Deterministic regex rule cleaning combined with Gemini Flash LLM cleaning guarded by length and section pattern safety checks.
- **Chunking**: Structure-aware generic section chunker (`core/chunkers/section.py`) splitting on statutory section regex patterns while keeping illustrations and explanations attached.
- **Embeddings**: `gemini-embedding-001` producing 768-dimensional L2-normalized vectors.
- **Vector Database**: Qdrant in local disk mode (`qdrant_data/`) using deterministic `uuid.uuid5` point IDs.
- **Backend API**: FastAPI + Uvicorn exposing OpenAPI endpoints (`/health`, `/laws`, `/ask`, `/chunks/...`).
- **Frontend UI**: Streamlit web interface (`ui/app.py`) with RTL Urdu rendering and citation inspection drawers.
- **Testing**: `pytest` including AST scan `tests/test_no_hardcoded_laws.py` to enforce law-agnosticism.

## Consequences
- No Docker or external daemon installation is required on the local Windows workstation.
- Ingestion CLI and FastAPI server must run sequentially due to Qdrant's local disk file locking.
- Caching on disk at all stages protects against Gemini API quota limits (100 RPM free tier).
- Citations are programmatically verified against verbatim chunk text before answers are returned.
