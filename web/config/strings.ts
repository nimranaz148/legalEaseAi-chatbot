/**
 * Centralized user-visible strings for the web interface.
 * Strictly law-agnostic: no statute names, section numbers, or law-specific terms.
 */

export const STRINGS = {
  appTitle: "Legal Assistant RAG",
  appSubtitle: "AI-powered statutory search and grounding engine",
  disclaimerPrefix: "⚠️ Qanooni Disclaimer:",
  defaultDisclaimer: "Yeh sirf maloomati hai, qanooni mashwara nahi. This is general information, not legal advice.",

  tabs: {
    chat: "Legal Inquiry Chat",
    analytics: "Corpus & Analytics",
  },

  sidebar: {
    statuteFilterTitle: "Statute Filters",
    selectAll: "Select All",
    deselectAll: "Deselect All",
    debugToggle: "Show Pipeline Debug Info",
    sampleQuestions: "Sample Inquiries",
    noStatutes: "No indexed statutes available. Ingest a law via CLI first.",
    backendStatus: "Backend Status",
    chunksSuffix: "chunks",
  },

  chat: {
    inputPlaceholder: "Ask a legal question (English, Roman Urdu, or Urdu script)...",
    submitButton: "Send",
    thinking: "Searching statutes and verifying citations...",
    emptyConversationTitle: "Statutory Legal Assistant",
    emptyConversationDesc: "Ask any legal question in English, Roman Urdu, or Urdu. All answers are grounded with character-verified statutory citations.",
    citationsTitle: "Statutory Citations",
    viewFullText: "View Full Section Text",
    hideFullText: "Hide Section Text",
    noDataTitle: "No Relevant Statutory Data Found",
    noDataDesc: "The system searched the enabled legal corpus but could not find matching statutory sections above the confidence threshold.",
  },

  analytics: {
    title: "Corpus & Retrieval Analytics",
    subtitle: "Real-time metrics reflecting vector storage, indexed statutes, and ingestion caches.",
    totalLaws: "Total Indexed Laws",
    totalChunks: "Total Active Chunks",
    vectorDim: "Vector Dimension",
    vectorDimVal: "768-dim (Cosine)",
    backendStatus: "Backend Connection",
    statutesTableTitle: "Registered Statutes in Corpus",
    colLawId: "Law ID",
    colTitle: "Statute Title",
    colYear: "Year",
    colChunks: "Active Chunks",
    colStatus: "Index Status",
    statusActive: "ACTIVE (Indexed)",
    statusUnindexed: "UNINDEXED",
  },

  errors: {
    backendDown: "Backend not running. Start it with: uvicorn api.main:app --reload",
    rateLimit: "Gemini API rate limit reached. Please wait a moment and retry.",
    generic: "An error occurred while processing your request. Please try again.",
    noTextAvailable: "Section text is currently unavailable.",
  },
};
