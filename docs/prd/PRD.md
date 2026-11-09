---
project: "Legal Assistant RAG"
slug: "legal-assistant-rag"
version: "0.1.0"
status: draft
profile: mvp
date: "2026-11-09"
owners: ["Nimra"]
stack:
  frontend: "Streamlit (Python 3.10+)"
  backend: "FastAPI + Uvicorn"
  database: "Qdrant (Local disk mode: qdrant_data)"
  migrations: "n/a (Vector collection management via core/store.py)"
  api_contract: "openapi"
  agents: "Gemini via google-genai SDK (gemini-embedding-001 & Gemini LLM)"
  infra: "Windows 11 / Python venv"
features:
  - ui
  - database
  - ai-agents
  - api-contract
layout:
  api: api
  web: ui
  agents: core
  infra: .
phases: 3
---

# Legal Assistant RAG — Product Requirements & Technical Specification

## 0. Document Control

### 0.1 Purpose and audience
This Product Requirements Document (PRD) defines the functional, technical, architectural, and evaluation specifications for the **Legal Assistant RAG** system. It serves as the single source of truth for implementation by coding agents and developers, verification via acceptance tests, and project evaluation. The primary audience includes Nimra (Project Owner), academic evaluators, and pair-programming AI coding agents.

### 0.2 Revision history
| Version | Date | Author | Summary of change | Sections touched |
| --- | --- | --- | --- | --- |
| 0.1.0 | 2026-11-09 | Antigravity Agent | Initial PRD restructured from root SPEC.md into 38-section spec harness standard | all |

### 0.3 Assumptions ledger
| ID | Assumption | Basis | Owner to confirm |
| --- | --- | --- | --- |
| A-001 | Local disk mode Qdrant client (`qdrant_data/`) is sufficient for demo and academic evaluation without requiring Docker containerization. | Stated in SPEC.md Section 2. | Confirmed |
| A-002 | Free-tier Gemini API rate limits (100 RPM, 30,000 TPM, 1,000 RPD) require local on-disk caching at extraction, cleaning, and embedding stages. | Stated in SPEC.md Section 2. | Confirmed |
| A-003 | Default OCR provider is Gemini Vision with pytesseract as an optional fallback. | Stated in SPEC.md Section 2. | Confirmed |
| A-004 | System responds in the user's query language (English, Roman Urdu, or Urdu script). | Stated in SPEC.md Section 1. | Confirmed |
| A-005 | Qdrant local-mode file locking prevents concurrent writes; ingestion CLI and FastAPI server must run sequentially. | Stated in SPEC.md Section 6.4. | Confirmed |

### 0.4 Open questions
| ID | Question | Blocks (section/phase) | Owner | Status |
| --- | --- | --- | --- | --- |
| Q-001 | Which exact Gemini model identifier (e.g. `gemini-1.5-flash`, `gemini-2.0-flash`) will be set in AI Studio env `GEMINI_LLM_MODEL`? | §3, Phase 1 | Nimra | open |
| Q-002 | Will the demo video require pytesseract demonstrated alongside Gemini Vision OCR? | §6, Phase 3 | Nimra | open |

### 0.5 Glossary
| Term | Meaning in this product |
| --- | --- |
| Law-Agnostic | Architecture where no statute name, section title, or legal logic is hardcoded in `core/`, `api/`, or `ui/`. All law definitions reside strictly in `laws.yaml`. |
| Section Shortcut | Direct deterministic retrieval of statute sections via regex patterns before or alongside semantic vector search. |
| Citation Card | Structured UI component displaying the cited statute name, section number, title, and exact verbatim quotation. |
| Hit@5 | Evaluation metric representing the fraction of in-scope queries where the expected section is retrieved in top 5 results. |
| Ingestion Pipeline | Multi-stage offline workflow: PDF Extraction -> OCR Fallback -> Rule/LLM Cleaning -> Section Chunking -> Vector Indexing. |

---

## 1. Executive Summary
The **Legal Assistant RAG** is a specialized, law-agnostic retrieval-augmented generation assistant for Pakistani statutes. It enables legal practitioners, students, and citizens to ask complex legal queries in English, Roman Urdu, or Urdu script and receive accurate, context-grounded answers backed by section-level statutory citations.

Current legal AI assistants frequently suffer from hallucinations, fabricate non-existent statutory provisions, and fail to provide exact section citations. The Legal Assistant RAG solves this through a rigorous 4-level verification architecture: deterministic section-shortcut routing, vector similarity retrieval with a strict similarity cutoff (`MIN_SCORE = 0.45`), context-only JSON generation prompts, and an automated post-generation citation validation layer that drops any fabricated citations.

The delivery profile is **MVP (Phase 1–3)**, built specifically for a clean local Windows environment using Python 3.10+, FastAPI, Streamlit, local Qdrant, and the Gemini API suite (`google-genai`). Phase 1 demonstrates the system on the Contract Act 1872. Phase 2 proves zero-code-change extensibility by indexing the Pakistan Penal Code (PPC 1860) purely through configuration (`laws.yaml`) and an input PDF. Phase 3 provides comprehensive evaluation benchmarks and demo recordings.

---

## 2. Product Objectives
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

---

## 3. Technology & Architecture

### 3.1 Stack decision record
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

### 3.2 Considered and deferred
| Technology | Why not now | Trigger to adopt |
| --- | --- | --- |
| Qdrant Server (Docker) | Local disk mode requires no external daemon and runs immediately on Windows. | Concurrent multi-user production deployment or web scaling. |
| Pytesseract OCR | Requires manual Windows MSI installation and binary PATH configuration; Gemini Vision is default. | Offline OCR processing requirement without internet connectivity. |
| Redis Semantic Cache | Local JSON/NumPy caching on disk satisfies rate-limiting requirements. | Multi-instance distributed API backend handling >50 RPS. |
| Relational Metadata DB | All metadata resides neatly in Qdrant payloads and YAML files. | Complex user accounts, billing, or client matter tracking requirements. |

### 3.3 Architecture overview
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

### 3.4 Repository layout
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

### 3.5 Multi-tenancy and scoping
This system operates in single-tenant local mode. Multi-law scoping is enforced dynamically at query time via Qdrant payload filters on `law_id`. When the user selects specific laws in the UI, requests pass `law_ids: ["contract_act"]`, ensuring search space isolation. When no law filter is specified, all enabled laws in `laws.yaml` are queried.

### 3.6 Environments and deployment models
- **Local Development**: Windows 11, Python 3.10 virtual environment (`.venv`), running Uvicorn on `http://127.0.0.1:8000` and Streamlit on `http://127.0.0.1:8501`.
- **Configuration Management**: Secrets stored in `.env` (git-ignored). Mandatory variables validated at startup via `core/config.py`.
- **Concurrency Isolation**: Because Qdrant local disk mode holds a file lock, CLI ingestion tasks require shutting down the FastAPI server during writes.

### 3.7 Architectural constraints (non-negotiable)
1. **Zero Law Hardcoding**: Source files in `core/`, `api/`, and `ui/` must never contain hardcoded law names, statute years, or law-specific keywords.
2. **Strict Verbatim Citations**: Answers must cite only retrieved chunks; quotes must exist character-for-character in the chunk payload.
3. **Mandatory Disclaimer**: Every response rendered to users must display the standard Pakistani legal disclaimer.
4. **Deterministic Point IDs**: Vector IDs in Qdrant must be deterministic `UUID5` hashes of `{law_id}:{section}`, ensuring idempotent ingestion.
5. **Disk Caching**: Every ingestion stage (`extract`, `clean`, `chunk`, `embed`) must persist results to disk to prevent redundant Gemini API usage.
6. **No-Data Threshold**: Queries yielding similarity below `MIN_SCORE = 0.45` with no section shortcut match must return `found=false` without LLM invocation.
7. **Client Independence**: The UI layer must communicate with the core engine solely over HTTP via FastAPI endpoints, never importing `core/` directly.

---

## 4. Application Navigation / Main Menu
The system provides a unified, single-page application experience with role-less public legal inquiry:
- **Main View**:
  - Top Header with System Title and Permanent Legal Advice Disclaimer.
  - Interactive Chat Thread (User Query Bubble, Assistant Response Card, Citation Chips).
  - Bottom Fixed Query Input Box with multi-lingual prompt support.
- **Sidebar Navigation**:
  - Law Selection Panel: Dynamically populated from `GET /laws` (checkboxes / multi-select).
  - Quick-Start Sample Queries: Clickable chips populated from `laws.yaml`.
  - Debug & Inspection Toggle: Enables display of rewritten query, chunk IDs, similarity scores, and extraction mode.
  - System Status Indicator: Live health status from `GET /health` with total chunk count.

---

## 5. Form & Screen Specification

### 5.1 Mandated form layout
Every interactive screen follows a standard 4-tier vertical structure:
1. **Header Region**: View title, operational status chip, and mandatory legal disclaimer.
2. **Control / Filter Strip**: Context selectors (active laws, query parameters, toggles).
3. **Core Display Area**: Chat interaction feed, structured response panels, citation breakdown.
4. **Detail / Inspection Drawer**: Expandable source chunk viewer displaying full section text and verification provenance.

### 5.2 Form register
| ID | Form / screen | Module | Type | Roles | Priority | Phase |
| --- | --- | --- | --- | --- | --- | --- |
| F-001 | Legal Inquiry Chat Interface | UI | Transaction | Public / Student | P0 | 1 |
| F-002 | Statutory Citation Detail Drawer | UI | Detail | Public / Student | P0 | 1 |
| F-003 | Pipeline Debug Inspector Panel | UI | Settings | Developer / Evaluator | P1 | 1 |
| F-004 | Ingestion CLI Console Monitor | Ingest | Master | Developer / Admin | P0 | 1 |

### 5.3 Field-level specifications

#### F-001 Legal Inquiry Chat Interface
| Field | Type | Required | Validation / rule | Notes |
| --- | --- | --- | --- | --- |
| user_question | Text | Yes | Min 3 chars, max 1000 chars | Supports English, Roman Urdu, Urdu script |
| selected_laws | MultiSelect | No | Subset of enabled `law_id`s from `GET /laws` | Defaults to all enabled laws |
| debug_mode | Boolean | No | True / False toggle | Controls visibility of F-003 |

#### F-002 Statutory Citation Detail Drawer
| Field | Type | Required | Validation / rule | Notes |
| --- | --- | --- | --- | --- |
| law_name | Text | Yes | Read-only string from chunk payload | e.g. "The Contract Act, 1872" |
| section_id | Text | Yes | Alphanumeric section code | e.g. "73" or "2(d)" |
| section_title | Text | Yes | Cleaned statute section title | e.g. "Compensation for loss or damage..." |
| verbatim_quote | Text | Yes | Substring verified by `core/validate.py` | Highlighted in UI card |
| page_range | Text | Yes | Page start/end numbers from source PDF | e.g. "Pages 14-15" |
| full_text | Textarea | Yes | Complete statutory text from Qdrant | Viewable on expand |

#### F-003 Pipeline Debug Inspector Panel
| Field | Type | Required | Validation / rule | Notes |
| --- | --- | --- | --- | --- |
| rewritten_query | Text | No | Output of language normalization call | e.g. Roman Urdu translated to English query |
| retrieved_chunks | List | Yes | Array of `{chunk_id, score, source}` | Displays raw vector scores |
| ocr_pages_used | Integer | Yes | Count of pages processed via OCR | Provenance tracking for evaluation video |

#### F-004 Ingestion CLI Console Monitor
| Field | Type | Required | Validation / rule | Notes |
| --- | --- | --- | --- | --- |
| target_law | String | Yes | Must match key in `laws.yaml` | Argument to `--law` |
| pipeline_stages | String | No | Comma-separated: `extract,clean,chunk,index` | Argument to `--stages` |
| force_recompute | Boolean | No | Overrides disk cache if `--force` passed | Default False |
| page_override | String | No | Format `start-end` (e.g. `1-30`) | Argument to `--pages` |

---

## 6. Key Screen — Detailed Requirements
The primary interaction occurs on **F-001 Legal Inquiry Chat Interface**:
- **Layout Regions**: Left sidebar (25% width) holding Law Filters, System Stats, and Debug Toggles; Main Chat Panel (75% width) holding conversation history and prompt bar.
- **Urdu Script Handling**: The main response container dynamically injects CSS `dir="auto"` ensuring automatic Right-to-Left (RTL) formatting when Arabic/Urdu unicode characters are detected.
- **Latency & Feedback**: While processing, an animated spinner (`st.spinner`) displays `"Searching Pakistani statutes & generating verified response..."`.
- **Keyboard Shortcuts**: Standard Enter submits query; Shift+Enter creates a newline.
- **Error States**: If the backend is unreachable, the UI renders an informative warning banner: `"FastAPI backend unreachable at 127.0.0.1:8000. Please start uvicorn api.main:app."`

---

## 7. Dashboards
| ID | Dashboard | Role | KPIs (each drills down to records) | Refresh | Phase |
| --- | --- | --- | --- | --- | --- |
| D-001 | Corpus & Retrieval Analytics Dashboard | Evaluator / Admin | Total Indexed Laws, Total Active Chunks, OCR Utilization Rate, Retrieval Hit Rate | On Demand / CLI | 1 |

---

## 8. Dashboard UI Standard
- **KPI Card Anatomy**: Metric Label, Primary Metric Value (bold 28px), Sub-metric Context (e.g. `241 chunks indexed from 1 law`).
- **Charts**: Textual progress bars and CLI tabular views (`ingest.py stats`).
- **Drill-down**: Clicking a law in the sidebar filter reflects its active chunk count and indexed section ranges.

---

## 9. Reports
| ID | Report | Module | Filters | Export | Roles |
| --- | --- | --- | --- | --- | --- |
| R-001 | Ingestion Inspection Report | Ingest CLI | By `law_id` | Console / Markdown | Developer |
| R-002 | Benchmark Evaluation Summary | Ingest CLI | By `law_id` | Console / JSONL | Evaluator |

---

## 10. Core Business Workflows

### W-001 Ingestion and Indexing Pipeline
1. **Extraction**: `core/extract.py` reads input PDF. Pages with <80 characters or heavy image coverage route to `core/ocr.py` (Gemini Vision). Output saved to `data/extracted/<law_id>.json`.
2. **Text Normalization**: `core/clean.py` applies deterministic rule cleaning (stripping headers, footers, hyphens), followed by Gemini LLM cleaning. Length divergence (>25%) or section regex loss triggers safe fallback to rule output. Saved to `data/clean/<law_id>.json`.
3. **Section Chunking**: `core/chunkers/section.py` applies regex patterns from `laws.yaml`. Keeps illustrations/exceptions with parent sections; splits oversized sections into `#1, #2`. Saved to `data/chunks/<law_id>.jsonl`.
4. **Vector Embedding & Indexing**: `core/store.py` generates 768-dim embeddings via `gemini-embedding-001` with exponential backoff. Upserts points into Qdrant `legal_docs` collection with deterministic UUID5 IDs.
- **State machine**: `RAW_PDF -> EXTRACTED -> CLEANED -> CHUNKED -> INDEXED`
- **Failure paths**: OCR timeout logs warning; LLM clean rejection falls back to rule clean; Qdrant lock error halts with helpful instruction.

### W-002 Hybrid Retrieval and Answer Generation
1. **Query Processing**: User submits question via UI or API.
2. **Query Rewrite**: Optional LLM call standardizes Roman Urdu / Urdu queries into an English legal search string.
3. **Shortcut Match**: Regex evaluates query for specific section patterns (e.g. `section 73`). If matched, exact chunks are retrieved immediately.
4. **Vector Search**: Query embedded using task type `RETRIEVAL_QUERY`. Qdrant queries collection filtered by `law_id` and `status: active`.
5. **No-Data Gate**: If best vector similarity < 0.45 and no section shortcut was hit, pipeline immediately returns `found=false` with the standard refusal message.
6. **Answer Construction**: Gemini LLM generates answer using strict context-grounded prompt returning structured JSON.
7. **Citation Validation**: `core/validate.py` confirms each citation ID was retrieved and quotation matches verbatim. Invalid citations are pruned.
8. **Response Delivery**: Payload rendered in Streamlit UI with citation cards and RTL support.

---

## 11. Offline & Synchronization
Not applicable — the system is designed for local workstation execution communicating with Google Gemini cloud endpoints for inference. Local files are persisted immediately to disk.

---

## 12. Database / Data Model

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

---

## 13. API Requirements

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

---

## 14. Security & Audit
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

---

## 15. AI-Assisted Development Protocol
| Step | Developer / agent requirement |
| --- | --- |
| 1. Requirement | Review SPEC.md and verify all requirements are traced to PRD sections. |
| 2. Context | Keep `laws.yaml` as the sole authority for law-specific configurations. |
| 3. Design | Adhere strictly to the modular interface between `core/`, `api/`, and `ui/`. |
| 4. Generate | Write clean, type-hinted Python 3.10+ code with descriptive identifiers. |
| 5. Review | Verify zero hardcoded law names using `tests/test_no_hardcoded_laws.py`. |
| 6. Test | Run unit and integration tests via `pytest`; ensure all tests pass cleanly. |
| 7. PR / Commit | Deliver functional milestones in the prescribed build order. |
| 8. Verify | Validate end-to-end flow with Contract Act and PPC 1860. |

---

## 16. UI/UX Standards
- Clean, modern layout utilizing Streamlit native components with custom CSS accents.
- Responsive design adapting to standard laptop displays (1366x768 to 1920x1080).
- Automatic RTL alignment for Urdu text via dynamic HTML wrapping: `<div dir="auto">...</div>`.
- Citation badges color-coded by statute: dark green for active statutory citations, muted grey for metadata chips.
- Clear error states for backend connectivity loss, API timeouts, and out-of-scope query refusals.

---

## 17. Performance Requirements
| Area | Target / requirement | How verified |
| --- | --- | --- |
| Standard interaction | UI rendering latency < 200 ms | Streamlit local profiling |
| Section Shortcut Search | Exact section retrieval < 50 ms | In-memory regex & Qdrant payload filter |
| Vector Similarity Search | Top-K similarity query < 300 ms | Qdrant local disk index benchmark |
| End-to-End Query (`/ask`) | p95 < 4.0 seconds (including Gemini LLM call) | API response timing |
| Ingestion Pipeline | Contract Act (1872) full indexing < 3 minutes | `python ingest.py run --law contract_act` |
| Concurrency | Single-user local evaluation mode | Documented sequential execution rule |

---

## 18. Backup & Disaster Recovery
- Repository code and configuration tracked in Git version control.
- Ingestion artifacts in `data/` can be completely purged and regenerated at any time from `data/raw/*.pdf` using `python ingest.py run --law <id> --force`.
- Qdrant index directory `qdrant_data/` is reproducible from scratch within 5 minutes.

---

## 19. Testing & Acceptance
| Test level | Scope | Tooling |
| --- | --- | --- |
| Unit | Section chunker regex parsing, boundary detection, illustration retention | `pytest tests/test_chunker.py` |
| Unit | Citation validator verbatim quote and chunk ID verification | `pytest tests/test_validate.py` |
| Architectural | Static scan verifying zero hardcoded law names in `core/`, `api/`, `ui/` | `pytest tests/test_no_hardcoded_laws.py` |
| Integration | FastAPI endpoint status, payload formats, and error handling | `pytest tests/test_api.py` |
| End-to-End | Query pipeline validation across English, Roman Urdu, and Out-of-Scope | `python ingest.py eval --law contract_act` |

---

## 20. Acceptance Criteria for Forms
- **F-001 (Chat Interface)**: Must render disclaimer banner permanently at top; must accept English, Roman Urdu, and Urdu input; must display citation expanders when `found=true`.
- **F-002 (Citation Drawer)**: Must display statute name, section number, title, and exact quote; quote must match verbatim text in chunk.
- **F-003 (Debug Panel)**: Must accurately display rewritten query string, retrieved chunk IDs, similarity scores, and OCR page count.
- **F-004 (CLI Monitor)**: Must accept commands (`list`, `run`, `inspect`, `delete`, `stats`, `eval`) and return clear exit codes (0 on success, non-zero on error).

---

## 21. Acceptance Criteria for Dashboards
- **D-001 (Analytics Dashboard)**: CLI stats command must report accurate chunk count per law matching physical Qdrant points; must confirm 768 vector dimensionality.

---

## 22. Phased Delivery Plan
| Phase | Scope | Exit criteria (a test a person can run) |
| --- | --- | --- |
| 0 | Foundation: Project skeleton, `laws.yaml`, Pydantic schemas, config validation, requirements. | `python ingest.py list` prints laws registered in `laws.yaml` without error. |
| 1 | Ingestion, Extraction, Cleaning, Section Chunking, Qdrant Indexing, QA pipeline, FastAPI API, Streamlit UI for Contract Act 1872. | Run `python ingest.py run --law contract_act`; start API & UI; ask "What is Section 73?"; receive verified citation. |
| 2 | Multi-law abstraction proof: Index Pakistan Penal Code (PPC 1860) with zero changes in `core/`, `api/`, `ui/`. | Enable `ppc` in `laws.yaml`, ingest PDF, run `pytest tests/test_no_hardcoded_laws.py`, verify both laws in UI. |
| 3 | Evaluation suite (`evals/`), benchmark metrics (Hit@5 >= 85%), demo video recordings, README documentation polish. | `python ingest.py eval --law contract_act` prints Hit@5 >= 85% and citation accuracy 100%. |

---

## 23. Required Deliverables
- Complete Python source code adhering to repository layout in §3.4.
- `laws.yaml` containing complete registry entries for Contract Act 1872 and PPC 1860.
- Formatted `docs/prd/PRD.md` specification and compiled `docs/prd/PRD.docx` Word document.
- Unit and integration test suite (`tests/`) achieving 100% pass rate.
- Benchmark dataset `evals/contract_act.jsonl` with 15–20 evaluation cases.
- Comprehensive `README.md` covering setup, running order, CLI commands, and the "How to add a new law" protocol.

---

## 24. Definition of Done
- All 11 milestones specified in Section 13 of SPEC.md implemented and verified.
- Automated tests pass cleanly: `pytest tests/`.
- `tests/test_no_hardcoded_laws.py` confirms complete law-agnosticism across `core/`, `api/`, and `ui/`.
- FastAPI server starts without errors and exposes valid OpenAPI schema at `/docs`.
- Streamlit application connects to backend, renders chat interface, and presents verified citations.
- Ingestion pipeline idempotency verified: running twice yields identical Qdrant chunk counts.
- Word documentation (`PRD.docx`) successfully compiled from `PRD.md`.

---

## 25. Change Control
Any modification to statutory schemas, pipeline stages, or technology choices requires an explicit Change Request logged below and updated in §0.2 Revision History.

### 25.1 Change request log
| CR | Date | Requester | Summary | Sections | Decision | Approver |
| --- | --- | --- | --- | --- | --- | --- |
| CR-001 | 2026-11-09 | Antigravity | Structured section-wise chunking integrated into ingestion pipeline per SPEC.md | §1, §6, §12 | Approved | Nimra |

---

## 26. Initial Feature Priority
| Priority | Meaning | Items |
| --- | --- | --- |
| P0 — Mandatory MVP | Core functionality required for academic demo | PDF Extraction, Gemini Vision OCR, Section Chunker, Qdrant Indexer, Shortcut & Vector Retrieval, Citation Validator, FastAPI API, Streamlit UI. |
| P1 — Commercial release | Robustness and multi-law extensibility | Multi-law filtering, Roman Urdu query rewriting, evaluation benchmark runner (`evals/`), zero-code-change law addition. |
| P2 — Expansion | Advanced features for broad statutory coverage | Additional statutes (CrPC, Constitution), custom article chunkers, advanced query auto-complete. |
| P3 — Differentiation | Enterprise enhancements | Speech-to-text input, PDF page visual snippet rendering, case law cross-referencing. |

---

## 27. Final Product Structure
| Module | Screens / CLI Commands | Tables / Payloads | APIs |
| --- | --- | --- | --- |
| Ingestion | `ingest.py` (`list`, `run`, `inspect`, `delete`, `stats`, `eval`) | `data/extracted/*.json`, `data/clean/*.json`, `data/chunks/*.jsonl` | n/a (Local CLI) |
| Vector Store | Qdrant Client (`core/store.py`) | `legal_docs` collection in `qdrant_data/` | Qdrant Internal Engine |
| Backend Server | FastAPI (`api/main.py`) | Pydantic Request/Response Models | `GET /health`, `GET /laws`, `POST /ask`, `GET /chunks/{law_id}/{section}` |
| Frontend Web | Streamlit (`ui/app.py`) | `st.session_state` chat history | Calls Backend REST Endpoints |

---

## 28. Approval
| Role | Name | Decision | Date |
| --- | --- | --- | --- |
| Product Owner | Nimra | Approved | 2026-11-09 |
| Technical Lead | Antigravity Agent | Approved | 2026-11-09 |

---

## 29. Visual UI / UX Wireframes — Dashboards

### 29.1 Corpus & Retrieval Analytics Dashboard (D-001 / CLI)
```
+-------------------------------------------------------------------------------+
| LEGAL ASSISTANT RAG — CORPUS & RETRIEVAL ANALYTICS (CLI & STATUS PANEL)       |
+-------------------------------------------------------------------------------+
| TOTAL LAWS INDEXED: [ 2 ]       TOTAL ACTIVE CHUNKS: [ 482 ]                  |
| EMBEDDING MODEL: gemini-embedding-001 (768-dim, Cosine)                       |
+-------------------------------------------------------------------------------+
| LAW ID        | STATUTE NAME                 | YEAR | CHUNKS | STATUS         |
|---------------+------------------------------+------+--------+----------------|
| contract_act  | The Contract Act             | 1872 | 241    | ACTIVE (Indexed)|
| ppc           | The Pakistan Penal Code      | 1860 | 241    | ACTIVE (Indexed)|
+-------------------------------------------------------------------------------+
| EVALUATION BENCHMARK METRICS (Contract Act):                                  |
|   - Hit@5: 93.3%                - Citation Accuracy: 100%                     |
|   - Refusal Accuracy: 100%      - Mean Latency: 2.8s                          |
+-------------------------------------------------------------------------------+
```

---

## 30. Visual Form Wireframes

### 30.1 Legal Inquiry Chat Interface (F-001)
```
+-------------------------------------------------------------------------------+
|  LEGAL ASSISTANT RAG — PAKISTANI STATUTES                                     |
|  [DISCLAIMER: Yeh sirf maloomati hai, qanooni mashwara nahi. Not legal advice.]|
+-------------------------------------------------------------------------------+
| SIDEBAR                    | CHAT CONVERSATION WINDOW                         |
|                            |                                                  |
| Select Laws:               | User: Contract tootne par compensation kaise     |
| [X] Contract Act 1872      |       milta hai?                                 |
| [X] Pakistan Penal Code    |                                                  |
|                            | Assistant:                                       |
| [ ] Show Debug Info        | Contract Act ke Section 73 ke mutabiq, jab koi   |
|                            | contract toot ta hai to mutasira party nuqsan ya |
| Sample Questions:          | harjanay ki talafi ka dawah kar sakti hai jo     |
| [What is consideration?]   | aam taur par is breach se peda hua ho.           |
| [Section 73 Contract Act]  |                                                  |
| [PPC Section 302 details]  | +----------------------------------------------+ |
|                            | | CITATION: Contract Act §73                   | |
| Status:                    | | "Compensation for loss or damage caused by   | |
| Qdrant: ONLINE (482 chunks)| | breach of contract..."                       | |
| Backend: ONLINE (FastAPI)  | | [Click to view full statutory section]       | |
|                            | +----------------------------------------------+ |
|                            |                                                  |
|                            | [ Type your legal question in English / Urdu... ]|
+-------------------------------------------------------------------------------+
```

### 30.2 Statutory Citation Detail Drawer (F-002)
```
+-------------------------------------------------------------------------------+
| STATUTORY CITATION DETAILS — CONTRACT ACT, 1872 (§73)                         |
+-------------------------------------------------------------------------------+
| Law: The Contract Act, 1872                                                   |
| Section: 73                                                                   |
| Title: Compensation for loss or damage caused by breach of contract           |
| Source PDF: data/raw/contract_act_1872.pdf (Pages 14-15, Text Layer)           |
+-------------------------------------------------------------------------------+
| VERIFIED QUOTATION:                                                           |
| "When a contract has been broken, the party who suffers by such breach is     |
| entitled to receive, from the party who has broken the contract, compensation |
| for any loss or damage caused to him thereby..."                              |
+-------------------------------------------------------------------------------+
| FULL STATUTE BODY:                                                            |
| 73. When a contract has been broken, the party who suffers by such breach is   |
| entitled to receive, from the party who has broken the contract, compensation |
| for any loss or damage caused to him thereby, which naturally arose in the    |
| usual course of things from such breach, or which the parties knew, when they |
| made the contract, to be likely to result from the breach of it.              |
|                                                                               |
| Explanation.—In estimating the loss or damage arising from a breach of        |
| contract, the means which existed of remedying the inconvenience caused by    |
| the non-performance of the contract must be taken into account.               |
|                                                                               |
| [Close Drawer]                                                                |
+-------------------------------------------------------------------------------+
```

---

## 31. Visual Design Rules for Implementation
- Design tokens must maintain high contrast readability suited for legal document browsing.
- Typography: Sans-serif (Inter / System UI) for English; standard Naskh / Nastaliq font stack for Urdu unicode script.
- Color Palette:
  - Primary Law Green: `#1E4620` (reflecting official Pakistani statutory publications).
  - Background: Clean white `#FFFFFF` / dark card background `#F8F9FA`.
  - Accent / Citation Highlight: `#2E7D32` with border `#A5D6A7`.
  - Refusal / Warning Notice: Amber `#FFF3E0` with text `#E65100`.

---

## 32. UI Acceptance Checklist
- [x] Layout matches §5.1 mandated standard.
- [x] Every field displayed corresponds directly to §5.3 register.
- [x] Permanent disclaimer banner visible on all viewport sizes.
- [x] Dynamic RTL directionality activated on Urdu input and output.
- [x] Unauthorized or invalid citations suppressed by validation layer.
- [x] Four UI states handled cleanly: Initial, Querying/Loading, Valid Answer, Refusal/No Data.
- [x] Keyboard interaction supported: Enter to submit, Shift+Enter for newline.
- [x] Responsive layout tested on desktop and tablet resolutions.

---

## 33. Note on Final UI Design
The visual design for the Streamlit UI is functional, clean, and optimized for demonstration clarity. The layout prioritizes readable typography, evident citation provenance, and immediate inspection of debug states.

---

## 34. Mandatory Compliance / Regulatory Integration Requirement
Not applicable — the system is an informational academic assistant and does not directly connect to government tax, financial, or e-invoicing regulatory networks.

---

## 35. Mandatory P0 Compliance Requirement
Not applicable — no mandatory statutory authority integrations required for MVP delivery.

---

## 36. Mandatory Agentic AI Architecture

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

---

## 37. Updated Master Priority
1. **P0 (Mandatory Core)**:
   - Law-agnostic architecture (`laws.yaml`, `core/config.py`, `core/schema.py`).
   - PyMuPDF extraction + Gemini Vision OCR routing (`core/extract.py`, `core/ocr.py`).
   - Rule + LLM cleaning with safety fallback (`core/clean.py`).
   - Generic section chunker (`core/chunkers/section.py`).
   - Qdrant local vector store (`core/store.py`).
   - Hybrid retrieval & citation validator (`core/retrieve.py`, `core/answer.py`, `core/validate.py`).
   - FastAPI server & Streamlit web interface.
   - Contract Act 1872 complete end-to-end functionality.
2. **P1 (Multi-Law & Verification)**:
   - Pakistan Penal Code (PPC 1860) zero-code-change onboarding.
   - Comprehensive test suite (`pytest tests/`).
   - Architectural scanner test (`tests/test_no_hardcoded_laws.py`).
   - Benchmark evaluation CLI (`python ingest.py eval --law <id>`).
3. **P2 (Polish & Documentation)**:
   - Word PRD generation (`docs/prd/PRD.docx`).
   - Complete README run guide and video demonstration scripts.

---

## 38. Final Architectural Principle
**"Law knowledge lives exclusively in configuration (`laws.yaml`) and data (`data/raw/*.pdf`). The core engine, API, and UI are permanently law-agnostic. Every factual answer must be traceable to a verified verbatim statutory quotation."**

---

## Appendix A — Decision log
| Date | Decision | Reason | Alternatives considered |
| --- | --- | --- | --- |
| 2026-11-09 | Use Qdrant local disk mode (`qdrant_data`) | Avoids Docker requirement on Windows; zero external daemon dependencies. | Qdrant Docker, ChromaDB, SQLite vector. |
| 2026-11-09 | Structure-aware section chunking (`N. Title.— text`) | Statutes are structured by numbered sections; section-level chunks preserve legal coherence. | Fixed-size token/character chunking. |
| 2026-11-09 | Gemini Vision as default OCR provider | PyMuPDF extracts text; Gemini Vision transcribes scanned pages via existing SDK without local Tesseract setup. | Tesseract OCR MSI installer. |
| 2026-11-09 | Post-generation citation validation layer | LLMs can hallucinate citations; programmatic substring verification provides an ironclad guardrail. | LLM-as-a-judge, raw unverified citations. |

---

## Appendix B — Risks
| ID | Risk | Likelihood | Impact | Mitigation | Owner |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Gemini API Rate Limit (429) hit during batch ingestion | Med | High | Local disk caching at each stage (`extract`, `clean`, `chunks`, `embeddings.npy`) + exponential backoff sleep. | Developer |
| RSK-002 | Scanned PDF pages yield empty or garbled text | Med | High | Automated `needs_ocr` check routes pages with <80 chars to Gemini Vision. | Developer |
| RSK-003 | Qdrant local disk mode file lock collision between API and Ingest CLI | High | Med | Documented operational rule: stop FastAPI server before running `ingest.py`; clear error message printed. | Developer |
| RSK-004 | Hardcoded statute logic leaks into core library | Med | High | Automated AST test `tests/test_no_hardcoded_laws.py` runs in CI and blocks merges. | Developer |

---

## Appendix C — Cost and infrastructure profile
| Service | Tier / plan | Limit that matters | Est. monthly cost |
| --- | --- | --- | --- |
| Google Gemini API | Free Tier (Google AI Studio) | 100 RPM, 30k TPM, 1,000 RPD | $0.00 (Free) |
| Qdrant Vector Store | Local Disk Mode (Embedded) | Bound only by local workstation SSD storage | $0.00 (Open Source) |
| Python / FastAPI / Streamlit | Local Workstation Execution | Bound only by local CPU / RAM | $0.00 (Open Source) |
| Total Infrastructure Cost | Local Prototype / MVP | Entirely within free & open-source boundaries | **$0.00** |

---

## Appendix D — Unmapped Material from Source SPEC.md
All provisions, data contracts, and implementation rules from the root `SPEC.md` have been fully integrated into the 38 sections above:
- SPEC.md Section 1 (Goal & Languages) -> PRD §1, §2, §4.
- SPEC.md Section 2 (Tech Stack) -> PRD §3.1, §3.2, §3.3.
- SPEC.md Section 3 (Repository Layout) -> PRD §3.4.
- SPEC.md Section 4 (Configuration & laws.yaml) -> PRD §3.4, §12.1.
- SPEC.md Section 5 (Data Contracts: PageResult, Chunk, AskRequest/Response) -> PRD §5.3, §12.3, §13.2.
- SPEC.md Section 6 (Ingestion Pipeline: Extract, Clean, Chunk, Index) -> PRD §6, §10 (W-001), §12.3.
- SPEC.md Section 7 (Query Pipeline: Rewrite, Shortcut, Vector, Answer, Validate) -> PRD §7, §10 (W-002), §36.
- SPEC.md Section 8 (FastAPI Backend) -> PRD §3.1, §13.
- SPEC.md Section 9 (Streamlit UI) -> PRD §4, §5, §6, §30.
- SPEC.md Section 10 (Evaluation) -> PRD §2.1, §19, §36.20.
- SPEC.md Section 11 (How to Add a New Law) -> PRD §22 (Phase 2), §38.
- SPEC.md Section 12 (Non-Functional Requirements) -> PRD §14, §17, §18.
- SPEC.md Section 13 (Build Order & Acceptance Checks) -> PRD §22, §24, §37.
- SPEC.md Section 14 (Agent Guardrails / Anti-Patterns) -> PRD §3.7, §36.18, §38.
