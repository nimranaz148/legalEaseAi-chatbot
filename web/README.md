# Legal Assistant RAG — Next.js Web Frontend

Modern, law-agnostic web frontend for Legal Assistant RAG built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18.17+ or v20+ (recommended: Node v20+)
- **npm**: v9+
- **FastAPI Backend**: Running on port `8000` (see main project README)

### 2. Environment Configuration
Backend URL defaults to `http://127.0.0.1:8000`. To customize, edit `.env.local`:
```bash
BACKEND_URL="http://127.0.0.1:8000"
```
*(See `.env.example` for reference)*

### 3. Installation
```bash
cd web
npm install
```

### 4. Run Order (Important)
1. **Start the FastAPI Backend**:
   ```bash
   # From project root
   uvicorn api.main:app --reload
   ```
2. **Stop the old Streamlit app**:
   If the legacy Streamlit app is running on port 3000, terminate it before starting Next.js.
3. **Start Next.js Dev Server**:
   ```bash
   cd web
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

> [!WARNING]
> **Qdrant Local-Mode Lock**: The backend and `ingest.py` access local Qdrant storage (`data/qdrant`). Because of SQLite/file locks, you cannot run `ingest.py` while `uvicorn` is actively running. Stop the backend before ingesting new documents.

---

## 🏛️ Architecture & Features

- **Zero Law Hardcoding**: No statute titles, abbreviations, or sections are hardcoded in the frontend. All statute names, example queries, and metadata are dynamically populated via `GET /laws`.
- **CORS-Free Proxy**: Browser calls `/api/backend/*` which Next.js rewrites to `${BACKEND_URL}/*`, completely eliminating cross-origin browser issues.
- **RTL & Urdu Font Support**: Answer text is rendered with `dir="auto"` and `Noto_Naskh_Arabic` font, seamlessly rendering Urdu / Nastaliq script right-to-left and English/Roman Urdu left-to-right.
- **Verbatim Citation Cards**: Expandable citation cards showing Section numbers, titles, and exact quotes. Expanding a card fetches the full statutory section via `GET /chunks/{law_id}/{section}` with client-side state caching.
- **Corpus & Retrieval Analytics Tab**: Real-time KPI cards reflecting Qdrant vector collection health, total chunks (768-dim), and active statutes table.
- **Developer Debug Panel**: Collapsible trace displaying rewritten queries, cosine similarity scores, shortcut triggers, and OCR vs text attribution.
- **Light & Dark Mode**: One-click theme switcher with responsive drawer for mobile viewports.
