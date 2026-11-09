# Library Docs

Project-specific usage patterns for every third-party library in this project. This file covers how *we* use each library in Legal Assistant RAG — rules, patterns and constraints specific to this project. It is not a substitute for the official docs.

---

## Before Using Any Library

1. **Check `AGENTS.md`** at the project root for installed skills.
2. **Fetch current API documentation** — library APIs change and training data goes stale. This is required for any new library usage.
3. **Read this file** for project-specific patterns that override general library knowledge.

Order of authority:
```
Current official docs -> Skills via AGENTS.md -> This file (project rules) -> General knowledge
```

---

## PyMuPDF (`pymupdf`)
- **Where it is used**: `core/extract.py`
- **Project rules**:
  - Open PDFs with `fitz.open(pdf_path)`.
  - Iterate pages sequentially; extract text using `page.get_text()`.
  - Check `len(text.strip()) < 80` to determine `needs_ocr`.
  - For OCR pages, render image using `page.get_pixmap(dpi=200)` and pass bytes to `core/ocr.py`.
- **Gotchas**:
  - Always close document handles cleanly.

## Google GenAI SDK (`google-genai`)
- **Where it is used**: `core/llm.py`, `core/ocr.py`, `core/clean.py`, `core/answer.py`
- **Project rules**:
  - Initialize client with `genai.Client(api_key=settings.GEMINI_API_KEY)`.
  - Use `client.models.embed_content` with model `gemini-embedding-001`, `output_dimensionality=768`.
  - Task type `RETRIEVAL_DOCUMENT` for chunk indexing; `RETRIEVAL_QUERY` for user search queries.
  - L2-normalize vectors with `vec / np.linalg.norm(vec)`.
  - Answering prompt must require strictly structured JSON response.
- **Gotchas**:
  - Free-tier rate limit (100 RPM) -> Wrap with exponential backoff on 429 status.

## Qdrant Client (`qdrant-client`)
- **Where it is used**: `core/store.py`
- **Project rules**:
  - Initialize local disk mode: `QdrantClient(path="qdrant_data")`.
  - Ensure collection `legal_docs` uses vector size `768` with `Distance.COSINE`.
  - Point IDs must be deterministic UUID5: `uuid.uuid5(uuid.NAMESPACE_DNS, chunk_id)`.
  - Store full chunk metadata in payload.
  - Filter queries using `Filter(must=[FieldCondition(key="law_id", match=MatchValue(value=law_id)), FieldCondition(key="status", match=MatchValue(value="active"))])`.
- **Gotchas**:
  - Local mode lock: Only one process can open `qdrant_data/` at a time. Do not run `ingest.py` while the FastAPI server is running.

## FastAPI (`fastapi`, `uvicorn`)
- **Where it is used**: `api/main.py`
- **Project rules**:
  - Expose `/health`, `/laws`, `/ask`, `/chunks/{law_id}/{section}`.
  - Pydantic models for request (`AskRequest`) and response (`AskResponse`).
  - Enable CORS middleware for local frontend on loopback.
- **Gotchas**:
  - Never crash the server on Gemini errors; return HTTP 503 with helpful retry message.

## Streamlit (`streamlit`)
- **Where it is used**: `ui/app.py`
- **Project rules**:
  - Connect to FastAPI over HTTP (`requests.get/post`), never importing `core/` directly.
  - Keep conversation history in `st.session_state.messages`.
  - Wrap responses in `<div dir="auto">` for automatic Urdu RTL rendering.
  - Render expandable citation cards for each verified citation.
