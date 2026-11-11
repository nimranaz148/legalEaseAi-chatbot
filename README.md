# ⚖️ LegalEase AI — Law-Agnostic Pakistani Statutory Intelligence & Document RAG

An enterprise-grade, law-agnostic Retrieval-Augmented Generation (RAG) assistant designed for precision statutory inquiry and verbatim citation verification across Pakistani legal codes (including the Contract Act 1872, Pakistan Penal Code 1860, and custom user-uploaded legal documents).

Built strictly adhering to **Honey's Spec Harness** standard, enforcing zero law hardcoding in application code, permanent legal disclaimers, verbatim grounding, and deterministic Qdrant point addressing.

---

## 🏛️ Core Architectural Principles

1. **Zero Law Hardcoding**: Source code in `core/`, `api/`, and `ui/` contains zero statute names, abbreviations, or law-specific regex. All statutory definitions and ingestion configurations live strictly in `laws.yaml` (enforced via `tests/test_no_hardcoded_laws.py`).
2. **Verbatim Citation Guardrail**: LLM responses cite only retrieved chunks with character-for-character verified quotes. Fabricated or hallucinatory quotes are automatically rejected via `core/validate.py`.
3. **No-Data Gate**: If retrieval similarity is below threshold (`score < 0.45`) and no section shortcut matches, the engine immediately returns `found=false` without burning LLM generation quota.
4. **Deterministic Point IDs**: Qdrant points use reproducible `uuid.uuid5(uuid.NAMESPACE_DNS, chunk.id)` hashes.
5. **Multi-Stage On-Disk Caching**: Extraction (`data/extracted/`), text normalization (`data/clean/`), and chunk generation (`data/chunks/`) persist on disk to minimize redundant external API consumption.
6. **Permanent Legal Disclaimer**: Mandatory legal advice disclaimer (*"Yeh sirf maloomati hai, qanooni mashwara nahi"*) permanently rendered on every API response and UI view.

---

## 🚀 Quickstart Guide

### 1. Prerequisites & Installation

- Python 3.11+
- Virtual environment or standard Python launcher (`py`)

```bash
# Clone the repository
git clone <repo-url>
cd rag-project

# Install dependencies
py -m pip install -r requirements.txt
```

### 2. Environment Configuration

Create a `.env` file in the project root (optional for test execution with deterministic mock embeddings, recommended for live Gemini completions):

```ini
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_EMBED_MODEL="gemini-embedding-001"
GEMINI_LLM_MODEL="gemini-1.5-flash"
API_URL="http://127.0.0.1:8000"
```

---

## 📚 CLI Ingestion & Corpus Management (`ingest.py`)

Manage and inspect statutes through the unified CLI:

```bash
# 1. List registered statutes and indexing status
py ingest.py list

# 2. Dry run inspection of section boundaries and gap detection
py ingest.py inspect --law contract_act
py ingest.py inspect --law ppc

# 3. Execute complete ingestion pipeline (extract, clean, chunk, embed, index)
py ingest.py run --law contract_act
py ingest.py run --law ppc

# 4. View Qdrant collection statistics
py ingest.py stats

# 5. Execute benchmark evaluation suite (Hit@5, citation and refusal metrics)
py ingest.py eval --law contract_act
py ingest.py eval --law ppc
```

---

## 🌐 Running the Application

### 1. Start the FastAPI Backend

```bash
py -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
```

- **Health Check**: `GET http://127.0.0.1:8000/health`
- **Statutes Catalog**: `GET http://127.0.0.1:8000/laws`
- **Query Endpoint**: `POST http://127.0.0.1:8000/ask`
- **Section Detail**: `GET http://127.0.0.1:8000/chunks/{law_id}/{section}`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`

### 2. Launch the Next.js Frontend (LegalEase Workspace)

In a separate terminal:

```bash
cd web
npm install
npm run dev
```

Visit **`http://localhost:3000`** (or `/chat`) to access the complete LegalEase AI workspace.

### 3. Launch the Legacy Streamlit Frontend (Optional)

```bash
py -m streamlit run ui_legacy/app.py
```

Features included:
- **Permanent Disclaimer Banner**: Mandated statutory notice displayed across all views.
- **Bilingual & Vernacular Support**: Handles English, Roman Urdu (`"Contract tootne par compensation"`), and Urdu script with automatic RTL CSS styling (`dir="auto"`).
- **Statutory Citation Detail Drawer**: Expandable cards showing section, title, exact quote, and full statutory text.
- **Pipeline Debug Inspector Panel**: Toggleable real-time view of query rewrites, similarity scores, and retrieved chunk IDs.
- **Corpus & Retrieval Analytics Dashboard (D-001)**: Live visual metrics showing indexed laws, chunk counts, vector dimensions, and storage health.

---

## 🧪 Testing & Verification

Run the complete automated test suite:

```bash
# Run all unit and integration tests
py -m pytest -v

# Run the architectural guardrail test (Zero law hardcoding)
py -m pytest tests/test_no_hardcoded_laws.py

# Run spec harness integrity check
bash scripts/harness-check.sh
```

---

## 📋 Evaluation Benchmarks

The benchmark suite (`evals/contract_act.jsonl` and `evals/ppc.jsonl`) evaluates retrieval accuracy (Hit@5) and out-of-scope refusal rates:

| Statute Code | In-Scope Queries | Hit@5 (Target >= 85%) | Out-of-Scope Queries | Refusal Rate | Verdict |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Contract Act 1872** | 15 | **93.3%** (14/15) | 3 | **100.0%** (3/3) | **PASSED** |
| **Pakistan Penal Code 1860** | 5 | **100.0%** (5/5) | 2 | **100.0%** (2/2) | **PASSED** |

---

## ⚠️ Legal Disclaimer

> **Yeh sirf maloomati hai, qanooni mashwara nahi.**  
> This system provides statutory informational references, not formal legal advice. Neither the authors nor the software take responsibility for legal actions undertaken based on these automated statutory retrievals.
