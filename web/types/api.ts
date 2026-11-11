/**
 * TypeScript API interfaces matching the FastAPI backend schemas (core/schema.py, api/main.py).
 * 100% Law-agnostic. Never hardcode law names.
 */

export interface AskRequest {
  question: string;
  law_ids?: string[] | null;
  top_k?: number | null;
  debug?: boolean;
}

export interface Citation {
  id: string;
  law_name: string;
  section: string;
  title: string;
  quote: string;
  page_start?: number | null;
}

export interface DebugRetrievedItem {
  id: string;
  score: number;
  shortcut?: boolean;
  source?: "text" | "ocr";
}

export interface DebugInfo {
  rewritten_query?: string | null;
  retrieved: DebugRetrievedItem[];
  ocr_pages_used: number;
}

export interface AskResponse {
  answer: string;
  citations: Citation[];
  found: boolean;
  disclaimer: string;
  debug?: DebugInfo | null;
}

export interface Law {
  law_id: string;
  name: string;
  short: string;
  year: number;
  chunk_count: number;
  examples: string[];
  unit_label: string;
  is_user_doc?: boolean;
}

export interface UserDocument {
  doc_id: string;
  filename: string;
  page_count: number;
  total_pdf_pages?: number;
  chunk_count: number;
  created_at: string;
}

export interface IndexDocumentResponse {
  status: string;
  message: string;
  document: UserDocument;
}

export interface Chunk {
  id: string;
  law_id: string;
  law_name: string;
  law_short: string;
  year: number;
  section: string;
  title: string;
  text: string;
  page_start: number;
  page_end: number;
  source: "text" | "ocr";
  status: "active" | "omitted" | "repealed";
  version_date: string;
  source_url: string;
}

export interface Health {
  status: string;
  collection_exists: boolean;
  total_chunks: number;
  notice?: string;
}

export interface ApiError {
  status: number;
  message: string;
  detail?: string;
  isNetworkError?: boolean;
  isRateLimit?: boolean;
}

export interface DraftRequest {
  topic: string;
  document_type?: string;
  jurisdiction?: string;
  parties?: string | null;
  key_terms?: string | null;
}

export interface DraftResponse {
  title: string;
  document_type: string;
  draft: string;
  disclaimer: string;
}

export interface SummarizeResponse {
  filename: string;
  page_count: number;
  char_count: number;
  summary: string;
  disclaimer: string;
}
