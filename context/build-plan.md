# Build Plan

> Generated from `docs/prd/PRD.md` (v0.1.0, profile `mvp`) by Honey's Spec Harness. This is a living document: edit it freely; the PRD stays the source for scope.

## Core Principle

Full-page UI built with mock data first and verified visually before any logic is written; then functionality is wired step by step. Every feature is visible and testable before the next one starts. No invisible backend phases.

Every task cites its **feature ID** (F-, D-, R-, W-, I-xxx) or PRD section. Never invent a business field that is not in the PRD (PRD §5.3); record a change request first (PRD §25).

## Phase Map

| Phase | Scope | Exit Criteria |
| --- | --- | --- |
| 0 | Foundation: Project skeleton, `laws.yaml`, Pydantic schemas, config validation, requirements. | `python ingest.py list` prints laws registered in `laws.yaml` without error. |
| 1 | Ingestion, Extraction, Cleaning, Section Chunking, Qdrant Indexing, QA pipeline, FastAPI API, Streamlit UI for Contract Act 1872. | Run `python ingest.py run --law contract_act`; start API & UI; ask "What is Section 73?"; receive verified citation. |
| 2 | Multi-law abstraction proof: Index Pakistan Penal Code (PPC 1860) with zero changes in `core/`, `api/`, `ui/`. | Enable `ppc` in `laws.yaml`, ingest PDF, run `pytest tests/test_no_hardcoded_laws.py`, verify both laws in UI. |
| 3 | Evaluation suite (`evals/`), benchmark metrics (Hit@5 >= 85%), demo video recordings, README documentation polish. | `python ingest.py eval --law contract_act` prints Hit@5 >= 85% and citation accuracy 100%. |

## Production MVP and the Infrastructure Ladder

Phase 0 and Phase 1 are a **production MVP**: the smallest thing real users can rely on. Do not build for scale that has not arrived. Start at step 1 and move up only when the stated trigger is true and measured.

| Step | Setup | Move up when |
| --- | --- | --- |
| 1 | Free tiers: one managed host, one managed database, free error tracking and uptime check | Free-tier limits are reached or the uptime check shows repeated failures |
| 2 | Paid small instances, automated backups, staging environment, secrets in a manager | Paying users exist, or an outage would cost money |
| 3 | Autoscaling or multiple instances, read replicas or caching, structured logs and alerts | p95 latency or CPU stays above the PRD §17 target for a week |
| 4 | Multi-region, queues and workers, formal on-call and DR drills | A written availability or compliance requirement the lower steps cannot meet |

Anything the PRD wants beyond the MVP goes in a later phase with its trigger written next to it.

## Task Size Rule

A task must be verifiable in one fast-tier cycle (`bash scripts/verify.sh`, seconds). If its acceptance criteria need more than 6 checks, or any check needs the slow tier to prove the basic behaviour, split the task before starting it. `python3 scripts/check_plan.py` flags oversized tasks, duplicates, tasks without acceptance criteria, and a tracker that disagrees with this plan.

---

## Phase 0 — Foundation: Project skeleton, `laws.yaml`, Pydantic schemas, config validation, requirements.

Exit gate: `python ingest.py list` prints laws registered in `laws.yaml` without error.

- [x] 00 Architecture Decision Record + sign-off — write `docs/adr/0001-stack-decision.md` from PRD §3.1 (stack, why, rejected alternatives)
  - Acceptance: `docs/adr/0001-stack-decision.md` exists and names the stack, the reasons and the rejected alternatives
  - Acceptance: The developer has signed it off (recorded in the progress log)
- [x] 01 Repo scaffold — folders per PRD §3.4 (`api`, `ui`, `core`, `.`), package managers, `.env.example` with empty values
  - Acceptance: Every folder in PRD §3.4 exists and each part builds or runs an empty smoke test
  - Acceptance: `.env.example` lists every variable with an empty value; no real secret is committed
- [x] 02 CI/CD + verification — one workflow per lane (api, web, agents, infra) calling `scripts/verify.sh`; secret scan; dependency scan
  - Acceptance: Every lane has a workflow that calls `scripts/verify.sh`; a deliberately broken commit turns CI red
  - Acceptance: Secret scan and dependency scan run and pass on the clean tree
- [x] 03 Database foundation — Qdrant (Local disk mode: qdrant_data) + n/a (Vector collection management via core/store.py); first migration; naming and key conventions from PRD §12.2; migration check in `verify.sh`
  - Acceptance: The first migration applies to an empty database and the migration check in `verify.sh` passes
  - Acceptance: Table, column and key names follow PRD §12.2
- [x] 04 Authentication & authorization — login/refresh/logout, roles and permission matrix from PRD §14.2, enforced in the API
  - Acceptance: Login, refresh and logout work; a wrong password and an expired token are rejected
  - Acceptance: A user without the role gets 403 on a protected endpoint (test per role in PRD §14.2)
- [x] 05 API conventions + contract — versioned base path, error format, OpenAPI, generated client (openapi), drift check in `verify.sh`
  - Acceptance: The generated client matches the live OpenAPI document; the drift check passes
  - Acceptance: Errors use the documented error format
- [x] 06 UI foundation — design tokens, layout shell, the mandated form layout (PRD §5.1), reusable grid/form/status components, `context/ui-registry.md` started
  - Acceptance: Design tokens are the only source of colour, type and spacing; a lint or grep check finds no hard-coded values
  - Acceptance: The layout shell renders at mobile and desktop widths without horizontal scroll
- [x] 07 Agent service skeleton — separate service, no database credentials, tool catalog wired to the API with the caller's identity (PRD §36.2-36.4)
  - Acceptance: The agent service has no database credentials in its environment
  - Acceptance: A tool call reaches the API with the caller's identity, and a forbidden call is rejected
- [x] 08 Vertical slice — the smallest end-to-end feature across every layer, to prove the pattern later tasks copy
  - Acceptance: The smallest feature works end to end across every layer with one automated test
  - Acceptance: `scripts/verify.sh` passes and the pattern is written down for later tasks to copy

Each task: confirm the acceptance criteria (`/architect` turns them into failing tests first), then build, then `bash scripts/verify.sh`, then `/review`.

## Phase 1 — Ingestion, Extraction, Cleaning, Section Chunking, Qdrant Indexing, QA pipeline, FastAPI API, Streamlit UI for Contract Act 1872.

Exit gate: Run `python ingest.py run --law contract_act`; start API & UI; ask "What is Section 73?"; receive verified citation.

- [x] 09 Legal Inquiry Chat Interface — F-001 (UI; Transaction; P0; roles: Public / Student)
  - Acceptance: A user with one of the roles (Public / Student) can complete the UI flow; a user without them gets 403
  - Acceptance: Validation and required fields match the field spec for F-001 in PRD §5.3 (one test per rule)
  - Acceptance: One end-to-end test drives the form and checks what was stored
- [x] 10 Statutory Citation Detail Drawer — F-002 (UI; Detail; P0; roles: Public / Student)
  - Acceptance: A user with one of the roles (Public / Student) can complete the UI flow; a user without them gets 403
  - Acceptance: Validation and required fields match the field spec for F-002 in PRD §5.3 (one test per rule)
  - Acceptance: One end-to-end test drives the form and checks what was stored
- [x] 11 Pipeline Debug Inspector Panel — F-003 (UI; Settings; P1; roles: Developer / Evaluator)
  - Acceptance: A user with one of the roles (Developer / Evaluator) can complete the UI flow; a user without them gets 403
  - Acceptance: Validation and required fields match the field spec for F-003 in PRD §5.3 (one test per rule)
  - Acceptance: One end-to-end test drives the form and checks what was stored
- [x] 12 Ingestion CLI Console Monitor — F-004 (Ingest; Master; P0; roles: Developer / Admin)
  - Acceptance: A user with one of the roles (Developer / Admin) can complete the Ingest flow; a user without them gets 403
  - Acceptance: Validation and required fields match the field spec for F-004 in PRD §5.3 (one test per rule)
  - Acceptance: One end-to-end test drives the form and checks what was stored
- [x] 13 Corpus & Retrieval Analytics Dashboard dashboard — D-001 (role: Evaluator / Admin; KPIs: Total Indexed Laws, Total Active Chunks, OCR Utilization Rate, Retrieval Hit Rate)
  - Acceptance: Each KPI (Total Indexed Laws, Total Active Chunks, OCR Utilization Rate, Retrieval Hit Rate) matches a hand-computed value on a seeded dataset
  - Acceptance: Only role Evaluator / Admin can open it; an empty dataset shows an empty state, not an error
- [x] 14 Integration: Google Gemini API — I-001 (Outbound; HTTPS / gRPC)
  - Acceptance: A contract test against a recorded or sandbox response proves the happy path
  - Acceptance: A timeout, an error response and a duplicate delivery are each handled by a test
- [x] 15 Integration: Local Qdrant Engine — I-002 (Bidirectional; Local Disk I/O)
  - Acceptance: A contract test against a recorded or sandbox response proves the happy path
  - Acceptance: A timeout, an error response and a duplicate delivery are each handled by a test

Each task: confirm the acceptance criteria (`/architect` turns them into failing tests first), then build, then `bash scripts/verify.sh`, then `/review`.

## Phase 2 — Multi-law abstraction proof: Index Pakistan Penal Code (PPC 1860) with zero changes in `core/`, `api/`, `ui/`.

Exit gate: Enable `ppc` in `laws.yaml`, ingest PDF, run `pytest tests/test_no_hardcoded_laws.py`, verify both laws in UI.

- [x] 16 Multi-law proof — Ingest PPC 1860 via laws.yaml and verify zero hardcoded laws in core, api, ui
  - Acceptance: `python ingest.py inspect --law ppc` and `python ingest.py run --law ppc` complete successfully
  - Acceptance: `pytest tests/test_no_hardcoded_laws.py` passes cleanly
  - Acceptance: UI displays both Contract Act 1872 and PPC in law filter

Each task: confirm the acceptance criteria (`/architect` turns them into failing tests first), then build, then `bash scripts/verify.sh`, then `/review`.

## Phase 3 — Evaluation suite (`evals/`), benchmark metrics (Hit@5 >= 85%), demo video recordings, README documentation polish.

Exit gate: `python ingest.py eval --law contract_act` prints Hit@5 >= 85% and citation accuracy 100%.

- [x] 17 Benchmark evaluation suite — run evals, verify Hit@5 >= 85%, and polish demo recordings
  - Acceptance: `python ingest.py eval --law contract_act` reports Hit@5 >= 85% and citation accuracy 100%
  - Acceptance: README.md contains full setup and run instructions
  - Acceptance: Demo script and video requirements satisfied

Each task: confirm the acceptance criteria (`/architect` turns them into failing tests first), then build, then `bash scripts/verify.sh`, then `/review`.

