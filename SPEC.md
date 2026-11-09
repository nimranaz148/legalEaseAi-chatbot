# Legal Assistant RAG: Project Specification

Audience: a CLI coding agent (e.g. Claude Code) that will build this project step by step.
Owner: Nimra (student project, demo + screen-recorded video, deadline is tight).
Language of code/comments: English. Language of the end-user chat: English, Roman Urdu, Urdu (answer in the language the user asked in).

---

## 1. Goal

Build a **law-agnostic Legal Assistant** for Pakistani statutes using RAG. Users ask questions and get answers grounded in retrieved statute text, with section-level citations.

- **Phase 1 (build first):** Contract Act 1872 only.
- **Phase 2 (must be possible with ZERO code changes in `core/`, `api/`, `ui/`):** add Pakistan Penal Code (PPC), later CrPC and Constitution, just by adding a PDF and a config entry.

The central design requirement: **the code must never contain a law's name or law-specific logic. Law-specific knowledge lives only in `laws.yaml` and in optional pluggable chunkers.**

The ingestion pipeline mirrors what the teacher taught:

```
PDF -> pages -> per page: text extraction (PyMuPDF) OR OCR if page is image/scanned
    -> LLM cleaning/normalization (remove mess + duplicates) -> embed -> vector DB (Qdrant)
Query: user question -> embed -> similarity search -> LLM answer with citations
```

Our own addition to the teacher's pipeline: **structure-aware (section-wise) chunking** between cleaning and embedding.

---

## 2. Tech stack (fixed, do not substitute)

| Part | Choice |
|---|---|
| Language | Python 3.10+ |
| PDF text | PyMuPDF (`pymupdf`) |
| OCR | Pluggable provider. Default: Gemini Vision. Alternative: pytesseract (needs the Tesseract .exe on Windows) |
| LLM (cleaning, query rewrite, answers) | Gemini via `google-genai` SDK. Model name read from env `GEMINI_LLM_MODEL` (user checks the current free model in Google AI Studio) |
| Embeddings | `gemini-embedding-001` via `google-genai`, `output_dimensionality=768`, L2-normalize vectors after generation. Use task type `RETRIEVAL_DOCUMENT` for chunks and `RETRIEVAL_QUERY` for questions. Model name from env `GEMINI_EMBED_MODEL` (default `gemini-embedding-001`) |
| Vector DB | Qdrant, **local disk mode**: `QdrantClient(path="qdrant_data")`. No Docker |
| Backend | FastAPI + uvicorn |
| Frontend | Streamlit (talks to the backend over HTTP) |
| Config | `laws.yaml` (laws registry) + `.env` (secrets/settings) |
| Tests | pytest |
| OS | Developer is on **Windows**. Use `pathlib`, avoid shell-specific tricks, UTF-8 everywhere (`encoding="utf-8"`) |

Dependencies (`requirements.txt`): `pymupdf`, `google-genai`, `qdrant-client`, `fastapi`, `uvicorn`, `streamlit`, `pyyaml`, `python-dotenv`, `numpy`, `requests`, `pytest`, `pydantic`, and optionally `pytesseract` + `pillow`.

Gemini free-tier limits for embeddings (approx.): 100 requests/min, 30,000 tokens/min, 1,000 requests/day. Therefore: batch embedding calls, add a small sleep + exponential backoff on 429 errors, and **cache every stage's output to disk** so nothing is recomputed needlessly.

---

## 3. Repository layout

```
legal-rag/
├── SPEC.md
├── README.md
├── laws.yaml                  # law registry (the ONLY place laws are described)
├── .env.example               # GEMINI_API_KEY=, GEMINI_LLM_MODEL=, GEMINI_EMBED_MODEL=, ...
├── requirements.txt
├── data/
│   ├── raw/                   # input PDFs (never modified)
│   ├── extracted/             # per-law page-level extraction output (json)
│   ├── clean/                 # per-law cleaned text (json/txt)
│   └── chunks/                # per-law chunks.jsonl
├── qdrant_data/               # local Qdrant storage (auto-created, git-ignored)
├── evals/
│   └── <law_id>.jsonl         # eval questions per law
├── core/                      # LAW-AGNOSTIC library. No law names allowed here.
│   ├── __init__.py
│   ├── config.py              # load .env + laws.yaml, validate with pydantic
│   ├── schema.py              # Chunk, PageResult, AskRequest/Response models
│   ├── llm.py                 # Gemini wrapper: generate(), embed(), retry/backoff
│   ├── extract.py             # PDF -> PageResult list (text or OCR)
│   ├── ocr.py                 # OCR providers: gemini_vision, pytesseract
│   ├── clean.py               # LLM cleaning with safety checks
│   ├── chunkers/
│   │   ├── __init__.py        # registry: name -> chunker function
│   │   ├── base.py            # chunker interface
│   │   └── section.py         # generic "N. Title.— text" chunker (regex from config)
│   ├── store.py               # Qdrant: ensure_collection, upsert, search, delete_by_law, stats
│   ├── retrieve.py            # section shortcut + vector search + filters
│   ├── answer.py              # prompt building, LLM call, JSON parse
│   └── validate.py            # citation validator (hallucination guard)
├── ingest.py                  # CLI entry point (argparse)
├── api/
│   └── main.py                # FastAPI app
├── ui/
│   └── app.py                 # Streamlit app
└── tests/
    ├── test_chunker.py
    ├── test_validate.py
    ├── test_no_hardcoded_laws.py
    └── test_api.py
```

Rule: `core/`, `api/`, `ui/` must be importable and runnable with any number of laws in `laws.yaml`.

---

## 4. Configuration

### 4.1 `.env`

```
GEMINI_API_KEY=
GEMINI_LLM_MODEL=            # set by user from AI Studio
GEMINI_EMBED_MODEL=gemini-embedding-001
EMBED_DIM=768
QDRANT_PATH=qdrant_data
COLLECTION_NAME=legal_docs
API_URL=http://127.0.0.1:8000
TOP_K=5
MIN_SCORE=0.45               # similarity threshold below which we answer "no data"; tune using evals
OCR_PROVIDER=gemini_vision   # or pytesseract
```

Never commit `.env`. Provide `.env.example`.

### 4.2 `laws.yaml` (law registry)

Each top-level key is a `law_id` (lowercase snake_case, used in IDs and filters).

```yaml
contract_act:
  name: "Contract Act"
  full_name: "The Contract Act, 1872"
  short: "Contract Act"
  year: 1872
  pdf: "data/raw/contract_act_1872.pdf"
  language: "en"
  chunker: "section"                  # key in core/chunkers registry
  chunker_options:
    section_pattern: '^\s*(\d+[A-Z]{0,2})\.\s+(.+?)\.\s*[\u2014\-]'   # group1 = number, group2 = title
    max_chunk_tokens: 600
    keep_with_parent: ["Illustration", "Explanation", "Exception"]
  page_range: null                    # or [1, 30] to process only part of the PDF (useful for demos)
  version_date: "2026-11"
  source_url: "https://pakistancode.gov.pk/"
  enabled: true

ppc:
  name: "Pakistan Penal Code"
  full_name: "The Pakistan Penal Code, 1860"
  short: "PPC"
  year: 1860
  pdf: "data/raw/ppc_1860.pdf"
  language: "en"
  chunker: "section"
  chunker_options:
    section_pattern: '^\s*(\d+[A-Z]{0,2})\.\s+(.+?)\.\s*[\u2014\-]'
    max_chunk_tokens: 600
    keep_with_parent: ["Illustration", "Explanation", "Exception"]
  page_range: null
  version_date: "2026-11"
  source_url: "https://pakistancode.gov.pk/"
  enabled: false                      # flip to true when ready
```

`core/config.py` must validate every entry with pydantic (required: `name`, `pdf`, `chunker`, `year`, `version_date`) and fail with a clear error message listing the bad key. The regexes above are starting points: real PDFs vary, so the `inspect` command (section 6) exists to tune them.

---

## 5. Data contracts (the stable interface between stages)

### 5.1 `PageResult` (output of extract)

```json
{
  "law_id": "contract_act",
  "page": 14,
  "text": "...",
  "source": "text",
  "ocr_used": false,
  "char_count": 2310
}
```
`source` is `"text"` (PyMuPDF) or `"ocr"`.

### 5.2 `Chunk` (output of chunk, payload stored in Qdrant)

```json
{
  "id": "contract_act:73",
  "law_id": "contract_act",
  "law_name": "Contract Act",
  "law_short": "Contract Act",
  "year": 1872,
  "section": "73",
  "title": "Compensation for loss or damage caused by breach of contract",
  "text": "full section text including illustrations",
  "page_start": 14,
  "page_end": 15,
  "source": "text",
  "status": "active",
  "version_date": "2026-11",
  "source_url": "https://pakistancode.gov.pk/"
}
```

- `id` is human-readable: `{law_id}:{section}`. If a section is split into parts: `{law_id}:{section}#2`.
- **Qdrant point IDs must be UUIDs or unsigned ints.** Use `uuid.uuid5(NAMESPACE, chunk["id"])` as the point ID and keep the readable `id` in the payload. This makes re-ingestion idempotent (same chunk overwrites itself, no duplicates).
- `status`: `"active"`, or `"omitted"` / `"repealed"` when the PDF says so (detect phrases like "Omitted", "Repealed"). Omitted sections are stored but excluded from answers unless the user asks about that exact section.
- Text embedded = `f"{law_name} Section {section}: {title}\n{text}"` (prefix improves retrieval for citation-style questions).

### 5.3 API models (`core/schema.py`)

```
AskRequest:  { question: str, law_ids: list[str] | null, top_k: int | null, debug: bool = false }
Citation:    { id: str, law_name: str, section: str, title: str, quote: str, page_start: int|null }
AskResponse: { answer: str, citations: list[Citation], found: bool, disclaimer: str,
               debug: { rewritten_query, retrieved: [{id, score}], ocr_pages_used } | null }
```

---

## 6. Ingestion pipeline (CLI)

Entry point: `python ingest.py <command> [options]`

| Command | What it does |
|---|---|
| `python ingest.py list` | Show all laws in `laws.yaml` with enabled flag and whether they are already indexed (chunk count in Qdrant) |
| `python ingest.py run --law contract_act` | Run all stages for one law |
| `python ingest.py run --law contract_act --stages extract,clean` | Run only some stages (`extract`, `clean`, `chunk`, `index`) |
| `python ingest.py run --law contract_act --force` | Ignore caches, recompute everything |
| `python ingest.py run --law contract_act --pages 1-30` | Override `page_range` for a quick demo run |
| `python ingest.py inspect --law contract_act` | **Dry run, no Qdrant writes.** Prints: pages processed, how many used OCR, number of chunks found, first 5 chunks, last 5 chunks, sections with suspiciously short/long text, missing section numbers in the sequence (e.g. 1,2,3,5 -> "4 missing"). Used to tune `section_pattern` |
| `python ingest.py delete --law contract_act` | Remove all of a law's points from Qdrant (by `law_id` filter) |
| `python ingest.py stats` | Per-law chunk counts, collection vector dimension |
| `python ingest.py eval --law contract_act` | Run the eval set (section 10) and print metrics |

Every command must print clear progress and a final summary. Exit non-zero on failure.

### 6.1 Stage: extract (`core/extract.py`, `core/ocr.py`)

For each page in the law's PDF (respect `page_range`):
1. Extract text with PyMuPDF.
2. Decide `needs_ocr`: true if extracted text has fewer than ~80 characters, OR the page contains images covering a large part of the page and little text. (This is the "is_image" check from the teacher's diagram.)
3. If `needs_ocr`: render the page to an image (PyMuPDF `get_pixmap`, ~200 DPI) and run OCR via the configured provider.
   - `gemini_vision`: send the page image to Gemini with the instruction "Transcribe all text exactly as written. Do not summarize or fix anything. Preserve section numbers and punctuation."
   - `pytesseract`: standard pytesseract call; if the Tesseract binary is not found, raise a clear error explaining how to install it or to switch `OCR_PROVIDER=gemini_vision`.
4. Save `PageResult` list to `data/extracted/<law_id>.json` (cache). Skip if cache exists and `--force` not given.

Print how many pages used text vs OCR (this is shown in the demo video).

### 6.2 Stage: clean (`core/clean.py`)

Goal (from the teacher's diagram): normalize extracted text before embedding, remove mess and duplication.

1. **Rule-based pre-clean first (free, no LLM):** strip repeated headers/footers (lines that repeat on many pages), page numbers, fix hyphenation at line breaks, collapse extra whitespace, normalize unicode dashes/quotes.
2. **LLM cleaning (Gemini)**, page by page or in small batches of pages, with instructions:
   - Fix OCR noise and broken line wraps; remove duplicated text (text-in-image repeating text-layer content).
   - **Do NOT paraphrase, summarize, reorder, add, or delete legal wording. Do NOT change numbers, section numbers, or punctuation that carries meaning.**
   - Return only the cleaned text.
3. **Safety check after each LLM call:** if cleaned length differs from input by more than ~25%, or the set of section numbers (regex `^\d+[A-Z]*\.`) changed, discard the LLM output and fall back to the rule-based result for that page. Log a warning.
4. Save to `data/clean/<law_id>.json`. Cache; skip if exists unless `--force`.

### 6.3 Stage: chunk (`core/chunkers/`)

- Chunker interface (`base.py`): `chunk(pages: list[PageResult], law_cfg) -> list[Chunk]`.
- Registry in `chunkers/__init__.py`: `CHUNKERS = {"section": section_chunker}`. Law config selects the chunker by name; adding a new structure (e.g. `"article"` for the Constitution) = add a new file + one registry line.
- **`section` chunker:**
  - Concatenate cleaned pages (keep a page-offset map to compute `page_start`/`page_end`).
  - Find section starts with `section_pattern` (multiline). Text between two matches = one section chunk.
  - Lines starting with any `keep_with_parent` keyword (Illustration, Explanation, Exception...) stay inside the parent section chunk.
  - If a chunk exceeds `max_chunk_tokens` (estimate tokens as chars/4), split on sub-section markers `(1)`, `(2)`, ... and prepend the parent heading `"{section}. {title}"` to every part; ids become `{law_id}:{section}#1`, `#2`...
  - Detect `status` (omitted/repealed).
  - Text before the first section (preamble, table of contents) is dropped, or stored as section `"preamble"` if useful. Table-of-contents entries must NOT become chunks (watch for duplicates of the same section number: keep the longer one).
  - Output `data/chunks/<law_id>.jsonl`.
- Nothing in chunkers may mention a specific law.

### 6.4 Stage: index (`core/store.py`)

1. Ensure collection `COLLECTION_NAME` exists with vector size `EMBED_DIM`, cosine distance. If it exists with a different dimension, stop with a clear error (never silently mix dimensions).
2. Create payload indexes on `law_id` and `section` (keyword) for fast filtering (skip gracefully if local mode does not require them).
3. Embed chunks in batches (e.g. 20-50 per request) using `RETRIEVAL_DOCUMENT`, normalize vectors, with sleep/backoff for rate limits. Cache embeddings on disk (`data/chunks/<law_id>.embeddings.npy` keyed by chunk id + text hash) so reruns do not call the API again for unchanged chunks.
4. Upsert points: `id = uuid5(chunk.id)`, `vector`, `payload = chunk`.
5. After a law is re-indexed, delete stale points of that `law_id` whose chunk ids are no longer present.

**Qdrant local-mode lock:** local mode allows only one process to open `qdrant_data` at a time. So the FastAPI server and `ingest.py` cannot run simultaneously. Document this in README: "stop the API before running ingest". Optionally, if a lock error occurs, print that exact hint.

---

## 7. Query pipeline (`core/retrieve.py`, `core/answer.py`, `core/validate.py`)

Flow for `ask(question, law_ids, top_k)`:

1. **Language/rewrite (optional but recommended):** one LLM call that rewrites the question into a short English legal search query (handles Roman Urdu / Urdu). Keep the original question for the final answer. Skip the rewrite if the question is already English and short.
2. **Section shortcut:** regex for patterns like `section 73`, `sec. 73`, `s. 73`, `article 25`, optionally followed by a law short name. If a number is found:
   - If a law name/short is also mentioned (match against `laws.yaml` `name`/`short`, case-insensitive), filter by that law and fetch exact chunks by `section` + `law_id`.
   - If no law is mentioned and the number exists in multiple enabled laws, return chunks from all of them (the answer must clearly label which law each belongs to).
   - Shortcut results are placed first in the context, then vector results fill the remaining slots.
3. **Vector search:** embed (rewritten) query with `RETRIEVAL_QUERY`, search Qdrant with filter `law_id in law_ids` (if provided; otherwise all enabled laws), `status == active`, top_k (default `TOP_K`).
4. **No-data rule:** if the best score is below `MIN_SCORE` and no shortcut hit, return `found=false` with the standard "no data" message (see below) WITHOUT calling the answering LLM.
5. **Answer generation:** build context as blocks `[{chunk.id}] {law_name} Section {section}: {title}\n{text}`. System prompt (law-agnostic):

```
You are a legal information assistant for Pakistani statutes.
Answer ONLY from the provided context blocks.
Rules:
1. Every factual statement must be supported by a context block. Cite using the block id, e.g. [contract_act:73].
2. If the context does not contain the answer, set "found": false and say you do not have data on this.
3. Never invent sections, punishments, case names, or outcomes. Never predict how a case will be decided. Never give personal legal advice.
4. Always mention which law each cited section belongs to.
5. Reply in the same language the user used (English, Roman Urdu or Urdu).
6. When quoting statute text, quote exactly and keep quotes short.
Return ONLY valid JSON: {"found": bool, "answer": str, "citations": [{"id": str, "quote": str}]}
```

6. **Parse JSON** robustly (extract the outermost `{...}`); on parse failure retry once.
7. **Citation validator (`validate.py`):** for each citation, (a) `id` must be among the retrieved chunk ids, (b) `quote` must appear in that chunk's text (after whitespace normalization). Drop invalid citations. If the answer has `found=true` but zero valid citations remain, retry generation once; if still none, return `found=false` with "could not verify answer".
8. Build `AskResponse`: enrich each citation with `law_name`, `section`, `title`, `page_start` from the chunk payload. Always include the disclaimer.

Standard texts (configurable constants):
- Disclaimer: `"Yeh sirf maloomati hai, qanooni mashwara nahi. This is general information, not legal advice."`
- No-data: `"Is bare mein mere paas data nahi hai. I do not have data on this in the loaded laws."`

---

## 8. Backend API (`api/main.py`, FastAPI)

Startup: load config, open Qdrant once, verify collection dimension matches `EMBED_DIM`. Enable CORS for localhost.

| Endpoint | Purpose |
|---|---|
| `GET /health` | `{status:"ok", collection_exists: bool, total_chunks: int}` |
| `GET /laws` | List of enabled laws that are actually indexed: `[{law_id, name, short, year, chunk_count}]`. The UI builds its filter from this, so nothing law-specific is hardcoded in the UI |
| `POST /ask` | Body `AskRequest`, returns `AskResponse` |
| `GET /chunks/{law_id}/{section}` | Return one chunk (used by the UI source panel / citation click) |

Errors: return JSON `{error: str}` with proper status codes (400 bad input, 503 if Qdrant/Gemini unavailable). Never crash on a Gemini 429; return 503 with a retry message.

Run: `uvicorn api.main:app --reload`.

---

## 9. Frontend (`ui/app.py`, Streamlit)

Talks only to the backend (`API_URL`), never imports `core/` directly (keeps the layers honest).

Layout:
- **Title** + permanent **disclaimer banner** at the top.
- **Sidebar:** multiselect "Laws" populated from `GET /laws` (default: all). Toggle "Show debug". Short "About" text.
- **Main:** chat input; conversation history kept in `st.session_state`.
- For each answer show:
  - The answer text.
  - **Citation chips/cards** like `Contract Act §73` with the exact quote and page number; clicking/expanding shows the full section text (via `GET /chunks/...`).
  - If `found=false`, show a neutral "no data found" card (no fake citations).
- **Debug expander** (when toggled): rewritten query, retrieved chunk ids + scores, whether chunks came from text or OCR.
- Right-to-left support: wrap answer text in an element with `dir="auto"` so Urdu script renders correctly.
- Example questions as clickable buttons (should be generated generically, e.g. from a small `examples` list in `laws.yaml` per law, optional field).
- Handle backend-down state gracefully ("Backend not running: start uvicorn").

Run: `streamlit run ui/app.py`.

---

## 10. Evaluation (`evals/<law_id>.jsonl`, `ingest.py eval`)

Per law, a JSONL file of cases:

```json
{"q": "What is consideration?", "expected_sections": ["2"], "type": "in_scope"}
{"q": "Contract tootne par compensation kaise milta hai?", "expected_sections": ["73"], "type": "in_scope"}
{"q": "What is the law on taxes in India?", "expected_sections": [], "type": "out_of_scope"}
```

Write 15 to 20 cases for Contract Act (including 3-4 Roman Urdu and 3 out-of-scope). `eval` prints:
- **Hit@5:** fraction of in-scope questions where an expected section is in the retrieved top 5.
- **Citation accuracy:** fraction of answers whose valid citations include an expected section.
- **Refusal accuracy:** fraction of out-of-scope questions answered with `found=false`.
- A table of failures so the user can tune `MIN_SCORE`, chunking, or prompts.

---

## 11. HOW TO ADD A NEW LAW (the abstraction contract)

This procedure must work with **no edits to `core/`, `api/`, or `ui/`** when the new law uses an existing chunker type (e.g. another "N. Title.— text" statute).

1. **Get the PDF.** Place it in `data/raw/`, e.g. `data/raw/ppc_1860.pdf`.
2. **Add an entry to `laws.yaml`** (copy an existing entry, change `law_id`, `name`, `full_name`, `short`, `year`, `pdf`, `version_date`, `source_url`). Set `enabled: true`. Use `page_range: [1, 30]` for a fast first test.
3. **Inspect before indexing:**
   `python ingest.py inspect --law ppc`
   Check the report: chunk count plausible? first/last chunks correct? missing section numbers? If sections are mis-detected, adjust `section_pattern` / `chunker_options` in `laws.yaml` and run inspect again. Repeat until clean.
4. **Run the full pipeline:**
   `python ingest.py run --law ppc`
   (Stop the API first because of the Qdrant local-mode lock.)
5. **Verify:** `python ingest.py stats` shows the new law's chunk count; `python ingest.py list` shows it as indexed.
6. **Add evals:** create `evals/ppc.jsonl` (10+ cases) and run `python ingest.py eval --law ppc`. Fix problems until Hit@5 is acceptable (target >= 0.8).
7. **Restart the backend** (`uvicorn api.main:app`). The new law automatically appears in `GET /laws` and therefore in the UI filter. No UI changes needed.
8. **Smoke test:** ask one question with the law filter set to the new law, and one with "all laws" where the same section number exists in both laws; confirm citations name the correct law.

**If the new law has a different structure** (e.g. Constitution with Articles/Parts/Chapters):
- Add `core/chunkers/article.py` implementing the chunker interface; register it in `core/chunkers/__init__.py` as `"article"`; set `chunker: "article"` in `laws.yaml`. Store `part`/`chapter` as extra optional payload fields. Nothing else changes.
- Citation display uses `section` as the unit number; for the Constitution set `unit_label: "Article"` in the law entry (optional field, default "Section") and make prompts/UI use `unit_label` instead of a hardcoded word.

**To remove or re-index a law:** `python ingest.py delete --law <id>` then `run` again, or `run --force`.

### Guardrails that enforce the abstraction
- `tests/test_no_hardcoded_laws.py`: scans `core/`, `api/`, `ui/` and fails if it finds law names or short names from `laws.yaml` (case-insensitive) in source files, or strings like "Contract Act", "PPC", "Penal Code" literally. (Docstrings/comments excluded only if clearly marked; simplest is to keep them out entirely.)
- Citation labels, filters, examples, and unit words ("Section"/"Article") must come from config or payload.
- Same embedding model and dimension for ALL laws in the collection.

---

## 12. Non-functional requirements and edge cases

- **Idempotent:** running any stage twice gives the same result and no duplicate points.
- **Resumable:** if the Gemini quota is hit mid-run, rerun continues from cache (extract/clean/embedding caches).
- **Logging:** use `logging`, concise INFO progress, warnings for fallbacks (OCR failures, LLM clean rejected, rate limits).
- **Secrets:** read only from env; never print the API key.
- **Section number collisions** across laws are expected: IDs and citations always include the law.
- **Amendments:** every chunk carries `version_date`; show it in the source view.
- **Safety wording:** the assistant never claims to give legal advice, never predicts case outcomes; the disclaimer is always shown.
- **Performance target:** a single `/ask` should return within a few seconds on the demo corpus.
- **README must include:** setup (venv, `pip install -r requirements.txt`, `.env`), run order, the "stop API before ingest" note, the add-a-law procedure (copy of section 11), and a Tesseract note if that provider is used.

---

## 13. Build order and acceptance checks

Build in this order. After each milestone, run its check and stop for review before continuing.

1. **Skeleton + config + schema.** `laws.yaml` with `contract_act` (and `ppc` disabled), `core/config.py`, `core/schema.py`, `.env.example`, `requirements.txt`.
   Check: `python ingest.py list` prints both laws.
2. **Extract + OCR** (`core/extract.py`, `core/ocr.py`, `core/llm.py`).
   Check: running the extract stage writes `data/extracted/contract_act.json` and prints text-pages vs OCR-pages counts; at least one page proven to use OCR (add a screenshot page to the test PDF).
3. **Clean** (`core/clean.py`).
   Check: cleaned output exists; safety fallback triggers correctly in a unit test with a deliberately bad LLM output.
4. **Section chunker + `inspect` command.**
   Check: `python ingest.py inspect --law contract_act` shows sensible chunks, reports missing section numbers; `tests/test_chunker.py` passes on a small fixture text.
5. **Store/index** (`core/store.py`).
   Check: `python ingest.py run --law contract_act` completes; `python ingest.py stats` shows the chunk count; rerun does not change the count.
6. **Retrieve + answer + validate** (`core/retrieve.py`, `answer.py`, `validate.py`).
   Check: a small script asks 3 questions (English, Roman Urdu, out-of-scope) and prints sensible results; `tests/test_validate.py` passes.
7. **FastAPI backend.**
   Check: `/health`, `/laws`, `/ask`, `/chunks/...` work via curl; `tests/test_api.py` passes.
8. **Streamlit UI.**
   Check: law filter appears from `/laws`; citations render; no-data card works; debug panel works.
9. **Evals.**
   Check: `python ingest.py eval --law contract_act` prints Hit@5, citation accuracy, refusal accuracy.
10. **Abstraction proof.** Enable `ppc` using only a PDF + `laws.yaml` entry (11-step procedure), with zero changes in `core/`, `api/`, `ui/`. `tests/test_no_hardcoded_laws.py` passes.
    Check: UI shows both laws; a "Section 73"-style question without a law name returns results labelled with the correct law each.
11. **README + demo polish** (example questions, screenshots).

Definition of done for Phase 1: milestones 1 to 9 pass on the Contract Act. Definition of done for the abstraction: milestone 10 passes.

---

## 14. Things the agent must NOT do

- Do not hardcode any law name, short name, section count, or law-specific regex outside `laws.yaml`.
- Do not paraphrase or "improve" statute text during cleaning or chunking.
- Do not create one Qdrant collection per law.
- Do not use random UUIDs for points (use deterministic `uuid5`).
- Do not add Docker or other external services; local Qdrant + files only.
- Do not skip the citation validator or the disclaimer.
- Do not embed with different models/dimensions for different laws.
- Do not import `core/` from `ui/` (the UI uses the HTTP API only).
