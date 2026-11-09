# Code Standards

Implementation rules and conventions for Legal Assistant RAG. Follow these in every session without exception. These rules prevent pattern drift across sessions.

---

## Engineering Mindset

- **Think before implementing** — understand what is being built and why before writing a line
- **Read context files first** — never assume; verify against `architecture.md` and `project-overview.md`
- **Scope is sacred** — build only what the current task requires. Business fields not in the PRD require a change request
- **Every feature must be testable** — if it cannot be verified immediately after implementation, it is incomplete
- **Clean over clever** — readable code a junior developer can follow beats clever abstraction
- **One thing at a time** — complete one feature fully before touching the next
- **Reference the feature ID** — every task cites its feature/form ID or PRD section

---

## The Rules That Cannot Be Broken

These are architectural guarantees, not style preferences. A PR that violates one does not merge.
Each rule ends with `— enforced by: <check>`.

1. **No secrets in source control.** Ever. `.env.example` holds keys with empty values. — enforced by: secret scan (`security.yml`)
2. **No hardcoded statute names in core, api, or ui.** Law knowledge lives in `laws.yaml` only. — enforced by: `pytest tests/test_no_hardcoded_laws.py`
3. **Verbatim citation verification.** Quotes must match chunk text character-for-character. — enforced by: `pytest tests/test_validate.py`
4. **Permanent legal disclaimer.** Rendered on all UI queries. — enforced by: UI acceptance check
5. **No business logic in the frontend.** The Streamlit frontend formats and displays; it talks only over HTTP to FastAPI. — enforced by: review layer 2 + architecture rules
6. **Deterministic vector IDs.** Point IDs in Qdrant must be `uuid.uuid5` based on `{law_id}:{section}`. — enforced by: `core/store.py` tests

---

## Python (`.`)

- Python 3.10+; type hints on public functions; `ruff` and `pytest` in `verify.sh`
- Pydantic models for every input and output — no untyped dicts crossing a boundary
- `pathlib.Path` and UTF-8 encoding (`encoding="utf-8"`) on all file reads/writes
- Timeouts on every outbound call (Gemini API)
- Structured logging with clear INFO progress and WARNING fallback reporting

---

## Naming

| Thing | Convention | Example |
| --- | --- | --- |
| Modules & Packages | snake_case | `core/retrieve.py` |
| Classes & Schemas | PascalCase | `AskRequest`, `Chunk` |
| Functions & Methods | snake_case | `retrieve_chunks()` |
| Constants | UPPER_SNAKE_CASE | `MIN_SCORE`, `TOP_K` |
| API routes | lowercase kebab/slash | `/health`, `/laws`, `/ask` |
| Branches | `type/short-description` | `feat/section-chunker` |

---

## Error Handling

- **Backend:** global error handling returns structured JSON `{ "error": str }` with standard HTTP status codes (400, 422, 503).
- **Gemini API:** handles HTTP 429 quota errors with exponential backoff and transparent retry.
- **Frontend:** surfaces clear error notifications; renders friendly reminder when FastAPI server is offline.
- Sensitive data (API keys) is never echoed in error outputs or logs.

---

## Testing

| Test Type | Scope | Command |
| --- | --- | --- |
| Unit | Chunker regex & splitting logic | `pytest tests/test_chunker.py` |
| Unit | Citation validator & hallucination guard | `pytest tests/test_validate.py` |
| Architectural | Zero hardcoded laws AST scanner | `pytest tests/test_no_hardcoded_laws.py` |
| Integration | FastAPI endpoint verification | `pytest tests/test_api.py` |
| End-to-End | Statutory QA benchmark evaluation | `python ingest.py eval --law contract_act` |

### Verification loop

`scripts/verify.sh` is the local mirror of CI and the definition of "verified" (see `AGENTS.md` — Verification). Run it before declaring work complete.

---

## Git & Pull Requests

- Protected `main`. No direct pushes
- One logical change per PR
- PR description records: the requirement (feature ID / PRD section), test evidence
- Every PR is reviewed and understood by a human developer. AI-generated code is the author's responsibility, not the tool's
- CI must pass: `api.yml`, `security.yml`

---

## AI-Assisted Development Protocol

1. **Requirement** — a small, testable story with acceptance criteria
2. **Context** — supply the relevant structure, conventions and constraints. `context/` is that context
3. **Design** — agree database/API/UI design *before* large generation (`/architect`)
4. **Generate** — scaffolding, implementation, refactoring, tests
5. **Review** — a human reviews all generated code, queries, security and error handling (`/review`)
6. **Test** — the acceptance tests from step 1 were written first and pass; `scripts/verify.sh` passes
7. **PR** — requirement, test evidence, migration notes
8. **Merge** — only approved, passing PRs reach protected branches
