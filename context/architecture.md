# Architecture

> Generated from `docs/prd/PRD.md` (v0.1.0, profile `mvp`) by Honey's Spec Harness. This is a living document: edit it freely; the PRD stays the source for scope.

## Stack

| Layer | Required technology / standard | Why this choice | Considered and rejected |
| --- | --- | --- | --- |
| UI | Streamlit 1.30+ | Rapid interactive Python UI with native chat elements and state management. | Next.js / React (excessive setup overhead for student demo). |
| Backend | FastAPI + Uvicorn | High performance, automatic OpenAPI documentation, clean Pydantic integration. | Flask / Django (slower, heavier configuration). |
| Business logic | Python 3.10+ (`core/`) | Clean modular architecture, standard `pathlib`, cross-platform compatibility. | Node.js (team expertise is Python). |
| ORM / data access | Pydantic v2 + Local File System | Type-safe schema validation, direct JSON/JSONL serialization on disk. | SQLite / SQLAlchemy (unnecessary overhead for chunk payloads). |
| Database | Qdrant (Local disk mode: `qdrant_data`) | High-speed vector indexing, payload filtering, zero external service dependency. | ChromaDB, Pinecone (Pinecone requires paid cloud; Chroma has Windows lock quirks). |
| Migrations | n/a | Vector collections managed dynamically via `core/store.py`. | Alembic (relational database not used). |
| API | REST / OpenAPI (`api/main.py`) | Industry standard, self-documenting via Swagger `/docs`. | gRPC / GraphQL (unneeded complexity). |
| Authentication | n/a | Single-user local demo profile. | OAuth2 / JWT (out of scope for academic prototype). |
| Authorization | n/a | All endpoints locally accessible on loopback `127.0.0.1`. | Role-based RBAC (out of scope). |
| Background jobs | CLI Ingestion Pipeline (`ingest.py`) | Deterministic CLI-driven execution with progress output. | Celery / Redis (unnecessary overhead). |
| Cache / queue | Local Disk Cache (`data/extracted`, `data/clean`, `data/chunks`) | Transparent caching avoids repeated Gemini API consumption. | Redis (external daemon rejected for simplicity). |
| Search | Hybrid (Regex Shortcut + Qdrant Cosine Similarity) | Exact legal section matching combined with semantic retrieval. | Elasticsearch (too heavy for local deployment). |
| File storage | Local Filesystem (`data/raw`, `data/extracted`, etc.) | Direct transparent file manipulation and inspection. | AWS S3 / MinIO (unnecessary cloud dependency). |
| AI / agents | Gemini API (`google-genai` SDK) | Unified SDK for Gemini Flash LLM, Gemini Vision OCR, and `gemini-embedding-001`. | LangChain / LlamaIndex (black-box complexity, fragile abstractions). |
| Observability | Python standard `logging` + Streamlit Debug Expander | Clean log output with timestamp, level, and fallback notices. | Datadog / OpenTelemetry (unnecessary for local demo). |
| CI/CD | GitHub Actions (`python.yml`) | Automated pytest execution, linter check, and law-agnostic scanner. | Jenkins / GitLab CI. |
| Hosting / deployment | Local Windows workstation (`127.0.0.1`) | Specified execution environment for Nimra's evaluation. | Cloud VPS / AWS EC2. |
| Containers | n/a | Local execution natively in Python virtual environment. | Docker Desktop (excluded per SPEC.md Section 2). |
| Testing | `pytest` + `pytest-asyncio` | Standard, flexible Python test harness with unit and integration fixtures. | Unittest. |

## Considered and Deferred

| Technology | Why not now | Trigger to adopt |
| --- | --- | --- |
| Qdrant Server (Docker) | Local disk mode requires no external daemon and runs immediately on Windows. | Concurrent multi-user production deployment or web scaling. |
| Pytesseract OCR | Requires manual Windows MSI installation and binary PATH configuration; Gemini Vision is default. | Offline OCR processing requirement without internet connectivity. |
| Redis Semantic Cache | Local JSON/NumPy caching on disk satisfies rate-limiting requirements. | Multi-instance distributed API backend handling >50 RPS. |
| Relational Metadata DB | All metadata resides neatly in Qdrant payloads and YAML files. | Complex user accounts, billing, or client matter tracking requirements. |

## Deployment Units

```
+-----------------------------------------------------------------------------------+
|                                STREAMLIT UI (ui/app.py)                           |
|  - Disclaimer Banner      - Multi-Law Selection      - Chat Stream                |
|  - Citation Cards         - Debug Inspector          - RTL Urdu Display           |
+-----------------------------------------------------------------------------------+
                                          | HTTP (REST)
                                          v
+-----------------------------------------------------------------------------------+
|                                FASTAPI BACKEND (api/main.py)                      |
|  - GET /health            - GET /laws                - POST /ask                  |
|  - GET /chunks/{law_id}/{section}                                                 |
+-----------------------------------------------------------------------------------+
                                          | Python Imports
                                          v
+-----------------------------------------------------------------------------------+
|                                CORE ENGINE (core/)                                |
|  - config.py (laws.yaml)   - schema.py (Pydantic)     - llm.py (Gemini API)       |
|  - retrieve.py (Shortcut) - answer.py (Context QA)   - validate.py (Hallucination)|
+-----------------------------------------------------------------------------------+
            |                                           |
            v                                           v
+---------------------------+               +---------------------------------------+
|  QDRANT LOCAL (qdrant_data)|               |        GEMINI CLOUD API               |
|  - 768-dim Vectors        |               |  - gemini-embedding-001 (Docs/Queries)|
|  - Payload Filtering      |               |  - Gemini Vision (OCR)                |
|  - Deterministic UUID5    |               |  - Gemini Flash (Cleaning & QA)       |
+---------------------------+               +---------------------------------------+
```

## Folder Structure

```
rag-project/
├── SPEC.md                         # Original project requirements specification
├── README.md                       # Setup instructions, architecture, run guide
├── laws.yaml                       # Law registry (sole location of statute metadata)
├── .env.example                    # Environment variable template
├── requirements.txt                # Pinned project dependencies
├── data/
│   ├── raw/                        # Source PDF documents (read-only)
│   ├── extracted/                  # Cached per-law PageResult JSON
│   ├── clean/                      # Cached per-law normalized text JSON
│   └── chunks/                     # Cached per-law Chunk JSONL & embeddings
├── qdrant_data/                    # Local Qdrant vector database (git-ignored)
├── evals/
│   └── contract_act.jsonl          # Benchmark evaluation questions
├── core/                           # Law-agnostic library (NO statute names allowed)
│   ├── __init__.py
│   ├── config.py                   # Pydantic settings & laws.yaml parser
│   ├── schema.py                   # Domain schemas (Chunk, PageResult, etc.)
│   ├── llm.py                      # Gemini API wrapper with backoff
│   ├── extract.py                  # PyMuPDF extractor with OCR routing
│   ├── ocr.py                      # Pluggable OCR: Gemini Vision / Tesseract
│   ├── clean.py                    # Pre-clean rules & LLM cleaner with safety guard
│   ├── chunkers/
│   │   ├── __init__.py             # Chunker registry
│   │   ├── base.py                 # Abstract BaseChunker interface
│   │   └── section.py              # Generic regex-driven statutory section chunker
│   ├── store.py                    # Qdrant client, upsert, and collection management
│   ├── retrieve.py                 # Section shortcuts, vector similarity, filters
│   ├── answer.py                   # Prompt engineering, JSON generation
│   └── validate.py                 # Citation verifier & hallucination guard
├── ingest.py                       # Unified CLI ingestion pipeline
├── api/
│   └── main.py                     # FastAPI application endpoints
├── ui/
│   └── app.py                      # Streamlit interactive web interface
└── tests/
    ├── test_chunker.py             # Section chunker regex & splitting tests
    ├── test_validate.py            # Citation verification unit tests
    ├── test_no_hardcoded_laws.py   # Codebase AST scanner enforcing abstraction
    └── test_api.py                 # FastAPI endpoint integration tests
```

## Multi-Tenancy & Scoping

This system operates in single-tenant local mode. Multi-law scoping is enforced dynamically at query time via Qdrant payload filters on `law_id`. When the user selects specific laws in the UI, requests pass `law_ids: ["contract_act"]`, ensuring search space isolation. When no law filter is specified, all enabled laws in `laws.yaml` are queried.

## Security, Authentication & Authorization

- All credentials (`GEMINI_API_KEY`) loaded strictly from `.env` via `core/config.py`; never logged or echoed to API responses.
- API endpoints run on loopback interface (`127.0.0.1`) preventing unauthorized network exposure.
- Standard legal advice disclaimer injected into every response payload.

### 14.1 Audited actions
- Every CLI pipeline execution logs timestamp, processed pages, OCR invocation count, generated chunks, and indexing results.
- Failed LLM cleaning attempts trigger audit warnings detailing input vs output character discrepancies.

### 14.2 Roles and permission matrix
| Role | Modules / screens | Actions |
| --- | --- | --- |
| Public User | F-001, F-002 | View, submit query, inspect citations |
| Evaluator / Admin | F-003, F-004 | Execute CLI commands, inspect debug metrics, run evaluations |

### 14.3 Data protection and privacy
No personally identifiable information (PII) is stored. Queries are processed transiently in memory without being written to persistent audit logs.

### 14.4 Threat notes
1. **Prompt Injection**: Mitigated by strict system prompts enforcing JSON output and limiting answers strictly to context blocks.
2. **Hallucinated Statutes**: Mitigated by `core/validate.py` requiring verbatim quote substring matching.
3. **API Key Exposure**: Mitigated by `.gitignore` rules covering `.env` and disk log files.
4. **Denial of Service via 429 Quota Exhaustion**: Mitigated by aggressive disk-based caching across all pipeline stages.

## Agentic AI Architecture

### 36.1 Agentic AI Product Vision
The Legal Assistant RAG employs a structured, deterministic AI architecture designed to eliminate statutory hallucinations and guarantee answer ground truth. The AI operates not as an autonomous free-form agent, but as a constrained retrieval-augmented reasoning system.

### 36.2 Agentic AI Architecture
```
User Query ---> [Language / Query Normalizer]
                       |
                       +---> [Section Shortcut Matcher] ---+
                       |                                   | (Exact Section Chunks)
                       +---> [Vector Similarity Search] ---+
                                       |
                                       v
                             [Context Assembler]
                                       |
                                       v
                       [Constrained Gemini LLM Generator]
                         (Prompt: Context-Only, JSON)
                                       |
                                       v
                         [Citation Verifier Guard]
                         (Verbatim Substring Check)
                                       |
                                       v
                             [Structured Answer]
```

### 36.3 AI Must Not Have Direct Database Authority
The AI model has zero direct execution permissions over the vector database or local filesystem. It interacts exclusively via typed functional interfaces:
1. Embedding Generation: `core/llm.py:embed_texts()`.
2. Vector Retrieval: `core/retrieve.py:retrieve_chunks()`.
3. Question Answering: `core/answer.py:generate_answer()`.
The model receives immutable context blocks and produces structured JSON parsed and validated by deterministic Python code before reaching the user.

### 36.4 AI Tool / Function Layer
| Tool | Purpose | Read/Write | Required permission | Approval level |
| --- | --- | --- | --- | --- |
| `embed_query` | Convert query string to 768-dim normalized vector | Read | Internal Engine | Autonomous (L4) |
| `search_vector_store` | Query Qdrant with filter and similarity cutoff | Read | Internal Engine | Autonomous (L4) |
| `validate_citations` | Verify cited quotes exist verbatim in chunk text | Read | Internal Engine | Autonomous (L4) |
| `generate_answer_json` | Produce context-grounded response JSON | Read | Internal Engine | Autonomous (L4) |

### 36.5 Specialized Agents
| Agent | Responsibility | Tools it may call | Autonomy level |
| --- | --- | --- | --- |
| Query Rewriter | Translates Roman Urdu/Urdu to English legal search query | `generate()` | L4 |
| Document OCR Transcriber | Transcribes scanned pages without summarization | `generate_vision()` | L4 |
| Text Normalizer | Cleans OCR errors while preserving statutory numbers | `generate_clean()` | L4 |
| Legal QA Synthesizer | Formulates answer strictly from provided context blocks | `generate_answer()` | L3 (Validated) |

### 36.6 AI Autonomy Levels
All AI agents in this system operate at **Level 3 (Draft with Deterministic Validation)** or **Level 4 (Constrained Utility)**. No agent is permitted Level 5 autonomy. Generated answers are subjected to the programmatic `core/validate.py` guardrail before display.

### 36.7 AI Approval Center
Not applicable — queries are read-only statutory retrieval operations.

### 36.8 AI Command Center Dashboard
Provided via Streamlit Debug Expander (F-003) and CLI evaluation metrics (D-001).

### 36.9 AI Agent Activity / Audit Form
Recorded during ingestion and evaluation in `data/extracted/`, `data/clean/`, and console logs.

### 36.10 Agent Requirements — Document OCR Transcriber
Shall transcribe scanned statutory pages exactly as rendered without paraphrasing, correcting archaic English spelling, or omitting section numbers.

### 36.11 Agent Requirements — Statutory Text Cleaner
Shall normalize OCR artifacts and line-wrap breaks. If character length diverges >25% or section header patterns are altered, output is discarded in favor of rule-based cleaning.

### 36.12 Agent Requirements — Query Rewriter
Shall transform conversational or vernacular questions into concise statutory terminology while preserving the original intent.

### 36.13 Agent Requirements — Legal QA Synthesizer
Shall respond exclusively using provided context blocks; shall output valid JSON containing `found`, `answer`, and `citations`.

### 36.14 Agent Requirements — Citation Verifier Guard
Deterministic Python module (not an LLM) verifying that every citation matches a retrieved chunk ID and contains a character-exact quotation.

### 36.15 Agent Requirements — Anomaly Detection
Monitors Gemini API rate limit responses (HTTP 429) and initiates exponential backoff sleeping to prevent job aborts.

### 36.16 Anomaly Detection Agent
Integrated in `core/llm.py` with exponential backoff on HTTP 429 / RESOURCE_EXHAUSTED status codes.

### 36.17 Daily Autonomous Business Brief
Not applicable.

### 36.18 Agent Guardrails
- Model constrained to output strictly valid JSON: `{"found": bool, "answer": str, "citations": [{"id": str, "quote": str}]}`.
- Refusal Rule: If context lacks required facts, `found` must be set to `false`.
- Quote Grounding: Quotes failing substring match are dropped; if zero citations remain, response reverts to refusal.

### 36.19 AI Security & Privacy
No user queries are transmitted to third parties other than Google Gemini API over TLS 1.3.

### 36.20 AI Testing Requirements
- Verification that hallucinated citations are stripped by `validate.py`.
- Benchmark evaluation suite run across 15–20 queries assessing Hit@5, citation accuracy, and refusal fidelity.

### 36.21 AI-Assisted Development of the AI Layer
Development agents follow the protocol in §15 with verification against `tests/test_no_hardcoded_laws.py`.

### 36.22 Recommended AI Technology Integration
- Model: Gemini Flash (`GEMINI_LLM_MODEL`) via official `google-genai` SDK.
- Embeddings: `gemini-embedding-001` (768 dimensions, L2-normalized).
- Vector DB: Qdrant local disk client.

### 36.23 AI Phase Roadmap
- Phase 1: Contract Act 1872 ingestion and single-law RAG.
- Phase 2: Pakistan Penal Code 1860 addition and multi-law routing.
- Phase 3: Benchmark evaluation, parameter tuning (`MIN_SCORE`), and demo polish.

### 36.24 Agentic AI Acceptance Criteria
- 100% of generated answers with `found=true` contain at least one verified citation.
- 100% of out-of-scope queries (unrelated to loaded statutes) return `found=false`.

## Database Conventions & Domains

### 12.1 Domains and representative tables
| Domain | Representative tables / payloads |
| --- | --- |
| Statutory Registry | `laws.yaml` (top-level statute registry and chunker configs) |
| Extraction Artifacts | `data/extracted/<law_id>.json` (`PageResult` records) |
| Cleaned Corpus | `data/clean/<law_id>.json` (`CleanPageResult` records) |
| Chunk Payloads | `data/chunks/<law_id>.jsonl` (`Chunk` records) |
| Vector Index | Qdrant Collection `legal_docs` (`PointStruct` with 768-dim vector & Chunk payload) |

### 12.2 Conventions
- Vector points are indexed using deterministic `uuid.uuid5(uuid.NAMESPACE_DNS, chunk.id)`.
- Chunks use readable primary identifiers formatted as `{law_id}:{section}` (e.g. `contract_act:73` or `contract_act:73#2`).
- Vector dimensionality is strictly 768 using Cosine distance. Vectors are L2-normalized prior to insertion.
- Text payload is embedded with the structured prefix: `f"{law_name} Section {section}: {title}\n{text}"`.

### 12.3 Entity detail

#### Chunk Entity (Stored in Qdrant Payload)
- `id` (String): Unique identifier `{law_id}:{section}`.
- `law_id` (String): Foreign key matching `laws.yaml` entry.
- `law_name` (String): Full statute title.
- `law_short` (String): Standard abbreviation (e.g. `Contract Act`, `PPC`).
- `year` (Integer): Year of enactment.
- `section` (String): Statutory section number or symbol.
- `title` (String): Section heading/caption.
- `text` (String): Full section body including attached illustrations.
- `page_start` (Integer): Starting page in source PDF.
- `page_end` (Integer): Ending page in source PDF.
- `source` (String): Extraction mode (`text` or `ocr`).
- `status` (String): Lifecycle state (`active`, `omitted`, `repealed`).
- `version_date` (String): Statute amendment version timestamp.
- `source_url` (String): Source reference portal URL.

### 12.4 Migration policy
Not applicable — Qdrant local collections are checked at startup by `core/store.py:ensure_collection()`. If an existing collection has a vector dimension mismatch, execution halts with an actionable error. Re-indexing a law replaces points idempotently.

### 12.5 Data retention, seed data, sample data
Seed PDFs reside in `data/raw/` (e.g. `data/raw/contract_act_1872.pdf`). Caches in `data/extracted`, `data/clean`, and `data/chunks` are preserved across runs unless `--force` is specified.

## API Surface

### 13.1 Conventions
- Base path: `/` (root endpoints with standard REST design).
- Request and response validation powered by Pydantic schemas.
- OpenAPI specification exposed interactively at `/docs`.
- Error format: `{ "detail": "Human readable error description" }`.
- Local CORS enabled for all origins on localhost ports.

### 13.2 Endpoint register
| Area | Endpoint | Methods | Permission | Notes |
| --- | --- | --- | --- | --- |
| Health | `/health` | GET | public | Returns collection status and total indexed chunk count. |
| Metadata | `/laws` | GET | public | Lists enabled laws with chunk counts; powers UI filter. |
| Query | `/ask` | POST | public | Accepts `AskRequest`, executes QA pipeline, returns `AskResponse`. |
| Inspection | `/chunks/{law_id}/{section}` | GET | public | Retrieves full chunk payload for citation drawers. |

### 13.3 Integrations (external)
| ID | System | Direction | Protocol | Auth | Failure handling | Phase |
| --- | --- | --- | --- | --- | --- | --- |
| I-001 | Google Gemini API | Outbound | HTTPS / gRPC | API Key (`GEMINI_API_KEY`) | Exponential backoff on 429; graceful 503 response | 1 |
| I-002 | Local Qdrant Engine | Bidirectional | Local Disk I/O | File Lock | Informative lock diagnostic on collision | 1 |

## Performance Targets

| Area | Target / requirement | How verified |
| --- | --- | --- |
| Standard interaction | UI rendering latency < 200 ms | Streamlit local profiling |
| Section Shortcut Search | Exact section retrieval < 50 ms | In-memory regex & Qdrant payload filter |
| Vector Similarity Search | Top-K similarity query < 300 ms | Qdrant local disk index benchmark |
| End-to-End Query (`/ask`) | p95 < 4.0 seconds (including Gemini LLM call) | API response timing |
| Ingestion Pipeline | Contract Act (1872) full indexing < 3 minutes | `python ingest.py run --law contract_act` |
| Concurrency | Single-user local evaluation mode | Documented sequential execution rule |

## Backup & Disaster Recovery

- Repository code and configuration tracked in Git version control.
- Ingestion artifacts in `data/` can be completely purged and regenerated at any time from `data/raw/*.pdf` using `python ingest.py run --law <id> --force`.
- Qdrant index directory `qdrant_data/` is reproducible from scratch within 5 minutes.

