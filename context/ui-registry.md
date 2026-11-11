# UI Registry

Living document. Updated after every component is built. Read this before building any new component — match existing patterns exactly before inventing new ones.

---

## Component Inventory

| Component | Path | Status | Purpose |
| --- | --- | --- | --- |
| `DisclaimerBanner` | `web/components/DisclaimerBanner.tsx` | Active | Permanent legal disclaimer banner |
| `LeftDock` | `web/components/LeftDock.tsx` | Active | Lexis+ style vertical navigation rail with mode triggers |
| `HeroCards` | `web/components/HeroCards.tsx` | Active | Lexis+ 4-card horizontal dock (Ask, Draft, Summarise, Upload) |
| `LexisSearchBar` | `web/components/LexisSearchBar.tsx` | Active | Bottom floating pill search bar with statute dropdown selector |
| `SummarizeView` | `web/components/SummarizeView.tsx` | Active | Drag-and-drop document upload & legal AI structured summarizer |
| `DraftView` | `web/components/DraftView.tsx` | Active | Legal drafting & agreement generator template assistant |
| `MessageBubble` | `web/components/MessageBubble.tsx` | Active | Chat bubble with `dir="auto"` and Urdu font |
| `CitationCard` | `web/components/CitationCard.tsx` | Active | Verbatim citation with expandable full chunk text |
| `DebugPanel` | `web/components/DebugPanel.tsx` | Active | Collapsible retrieval & query rewriting trace |
| `CorpusTab` | `web/components/CorpusTab.tsx` | Active | KPI metric cards & registered statutes table |
| `Sidebar` | `web/components/Sidebar.tsx` | Active | Slide-over statute drawer and pipeline debugger |
| `ErrorState` | `web/components/ErrorState.tsx` | Active | Backend offline, rate limits & error recovery |

---

## Components

### `LeftDock`
- **Purpose**: Vertical icon rail (Research, Summarise, Draft, Corpus, Statutes).
- **Tokens**: `bg-[#070617] border-r border-[#1e1b3d] text-slate-400`.

### `HeroCards`
- **Purpose**: Displays the welcome header and 4 interactive task cards (Ask, Draft, Summarise, Upload).
- **Tokens**: `bg-gradient-to-b from-[#221c54] to-[#141133] border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.25)]`.

### `LexisSearchBar`
- **Purpose**: Signature floating search bar at bottom with statute multi-select dropdown, sample prompts, and send trigger.
- **Tokens**: `border-purple-500/40 bg-[#0f0d26] shadow-[0_0_30px_rgba(124,58,237,0.15)]`.

### `SummarizeView`
- **Purpose**: Drag-and-drop PDF and text upload with PyMuPDF parsing and Gemini AI structured legal breakdown (Parties, Covenants, Risks, Takeaways).

### `DraftView`
- **Purpose**: Form for generating legal notices, NDAs, employment contracts, and agreements with standard formal phrasing.
