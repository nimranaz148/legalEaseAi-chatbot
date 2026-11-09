# Project Overview

> Generated from `docs/prd/PRD.md` (v0.1.0, profile `mvp`) by Honey's Spec Harness. This is a living document: edit it freely; the PRD stays the source for scope.

## About the Project

The **Legal Assistant RAG** is a specialized, law-agnostic retrieval-augmented generation assistant for Pakistani statutes. It enables legal practitioners, students, and citizens to ask complex legal queries in English, Roman Urdu, or Urdu script and receive accurate, context-grounded answers backed by section-level statutory citations.

Current legal AI assistants frequently suffer from hallucinations, fabricate non-existent statutory provisions, and fail to provide exact section citations. The Legal Assistant RAG solves this through a rigorous 4-level verification architecture: deterministic section-shortcut routing, vector similarity retrieval with a strict similarity cutoff (`MIN_SCORE = 0.45`), context-only JSON generation prompts, and an automated post-generation citation validation layer that drops any fabricated citations.

The delivery profile is **MVP (Phase 1–3)**, built specifically for a clean local Windows environment using Python 3.10+, FastAPI, Streamlit, local Qdrant, and the Gemini API suite (`google-genai`). Phase 1 demonstrates the system on the Contract Act 1872. Phase 2 proves zero-code-change extensibility by indexing the Pakistan Penal Code (PPC 1860) purely through configuration (`laws.yaml`) and an input PDF. Phase 3 provides comprehensive evaluation benchmarks and demo recordings.

## Product Objectives

- **OBJ-001**: Deliver high-fidelity text extraction from statutory PDFs using PyMuPDF with automated fallback to Gemini Vision OCR for image/scanned pages.
- **OBJ-002**: Normalize statutory text via rule-based filters and Gemini LLM cleaning while enforcing strict length and section preservation safety guards.
- **OBJ-003**: Implement structure-aware section chunking (`N. Title.— text`) preserving illustrations, explanations, and exceptions within parent sections.
- **OBJ-004**: Store normalized 768-dimensional embeddings (`gemini-embedding-001`) in local Qdrant vector database using deterministic UUID5 point IDs.
- **OBJ-005**: Provide hybrid query retrieval combining regex section shortcuts and cosine vector search with metadata filtering (`law_id`, `status: active`).
- **OBJ-006**: Generate answers strictly from retrieved context blocks using structured JSON schemas with zero tolerance for ungrounded claims.
- **OBJ-007**: Validate every generated citation against retrieved text; reject answers with zero valid citations.
- **OBJ-008**: Serve search and QA capabilities via a clean FastAPI backend with full CORS support and health/law inspection endpoints.
- **OBJ-009**: Deliver an interactive Streamlit UI with multi-law selection, conversation history, citation expanders, RTL Urdu rendering, and debug views.
- **OBJ-010**: Guarantee 100% law-agnostic core libraries verified by an automated scanner test (`test_no_hardcoded_laws.py`).

### 2.1 Success metrics
| Metric | Baseline | Target | How measured |
| --- | --- | --- | --- |
| In-Scope Hit@5 | 0.0 | >= 85% | `python ingest.py eval --law <id>` on benchmark test suite |
| Citation Accuracy | 0.0 | 100% | Verified by `core/validate.py` (verbatim substring match) |
| Refusal Accuracy (Out of Scope) | 0.0 | >= 90% | Ratio of out-of-scope queries returning `found=false` |
| Query Latency (p95) | n/a | < 4.0 seconds | End-to-end response time measured across 20 sample queries |
| Multi-law Extensibility | Manual coding required | 0 core code changes | Addition of PPC 1860 verified purely via `laws.yaml` |

### 2.2 Out of scope
- Arbitrary legal counsel or case outcome predictions (system is purely informational).
- Cloud-hosted Docker / Kubernetes deployments (local single-node Windows deployment only).
- Dynamic multi-user authentication, login sessions, and tenant isolation (single-user demo environment).
- Non-statutory legal sources such as case law, judicial precedents, and court transcripts.
- Direct write operations or schema migrations through user chat interface.

## Modules & Primary Screens

| Module | Screens / CLI Commands | Tables / Payloads | APIs |
| --- | --- | --- | --- |
| Ingestion | `ingest.py` (`list`, `run`, `inspect`, `delete`, `stats`, `eval`) | `data/extracted/*.json`, `data/clean/*.json`, `data/chunks/*.jsonl` | n/a (Local CLI) |
| Vector Store | Qdrant Client (`core/store.py`) | `legal_docs` collection in `qdrant_data/` | Qdrant Internal Engine |
| Backend Server | FastAPI (`api/main.py`) | Pydantic Request/Response Models | `GET /health`, `GET /laws`, `POST /ask`, `GET /chunks/{law_id}/{section}` |
| Frontend Web | Streamlit (`ui/app.py`) | `st.session_state` chat history | Calls Backend REST Endpoints |

## Feature Priority

| Priority | Meaning | Items |
| --- | --- | --- |
| P0 — Mandatory MVP | Core functionality required for academic demo | PDF Extraction, Gemini Vision OCR, Section Chunker, Qdrant Indexer, Shortcut & Vector Retrieval, Citation Validator, FastAPI API, Streamlit UI. |
| P1 — Commercial release | Robustness and multi-law extensibility | Multi-law filtering, Roman Urdu query rewriting, evaluation benchmark runner (`evals/`), zero-code-change law addition. |
| P2 — Expansion | Advanced features for broad statutory coverage | Additional statutes (CrPC, Constitution), custom article chunkers, advanced query auto-complete. |
| P3 — Differentiation | Enterprise enhancements | Speech-to-text input, PDF page visual snippet rendering, case law cross-referencing. |

## Non-Negotiable Architectural Constraints

1. **Zero Law Hardcoding**: Source files in `core/`, `api/`, and `ui/` must never contain hardcoded law names, statute years, or law-specific keywords.
2. **Strict Verbatim Citations**: Answers must cite only retrieved chunks; quotes must exist character-for-character in the chunk payload.
3. **Mandatory Disclaimer**: Every response rendered to users must display the standard Pakistani legal disclaimer.
4. **Deterministic Point IDs**: Vector IDs in Qdrant must be deterministic `UUID5` hashes of `{law_id}:{section}`, ensuring idempotent ingestion.
5. **Disk Caching**: Every ingestion stage (`extract`, `clean`, `chunk`, `embed`) must persist results to disk to prevent redundant Gemini API usage.
6. **No-Data Threshold**: Queries yielding similarity below `MIN_SCORE = 0.45` with no section shortcut match must return `found=false` without LLM invocation.
7. **Client Independence**: The UI layer must communicate with the core engine solely over HTTP via FastAPI endpoints, never importing `core/` directly.

---

## Deployment Models

- **Local Development**: Windows 11, Python 3.10 virtual environment (`.venv`), running Uvicorn on `http://127.0.0.1:8000` and Streamlit on `http://127.0.0.1:8501`.
- **Configuration Management**: Secrets stored in `.env` (git-ignored). Mandatory variables validated at startup via `core/config.py`.
- **Concurrency Isolation**: Because Qdrant local disk mode holds a file lock, CLI ingestion tasks require shutting down the FastAPI server during writes.

## Definition of Done

- All 11 milestones specified in Section 13 of SPEC.md implemented and verified.
- Automated tests pass cleanly: `pytest tests/`.
- `tests/test_no_hardcoded_laws.py` confirms complete law-agnosticism across `core/`, `api/`, and `ui/`.
- FastAPI server starts without errors and exposes valid OpenAPI schema at `/docs`.
- Streamlit application connects to backend, renders chat interface, and presents verified citations.
- Ingestion pipeline idempotency verified: running twice yields identical Qdrant chunk counts.
- Word documentation (`PRD.docx`) successfully compiled from `PRD.md`.

