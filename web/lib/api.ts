import {
  AskRequest,
  AskResponse,
  Chunk,
  Health,
  Law,
  ApiError,
  DraftRequest,
  DraftResponse,
  SummarizeResponse,
  UserDocument,
  IndexDocumentResponse,
} from "@/types/api";

const BASE_PREFIX =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://127.0.0.1:8000"
    : "/api/backend");

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const data = await res.json();
      errorDetail = data.detail || JSON.stringify(data);
    } catch {
      // Body is not JSON
    }

    const error: ApiError = {
      status: res.status,
      message: `Request failed with status ${res.status}`,
      detail: errorDetail,
      isRateLimit: res.status === 429 || res.status === 503,
      isNetworkError: false,
    };
    throw error;
  }
  return res.json() as Promise<T>;
}

function handleNetworkError(err: unknown): never {
  if (typeof err === "object" && err !== null && "status" in err) {
    throw err as ApiError;
  }
  const error: ApiError = {
    status: 0,
    message: err instanceof Error ? err.message : "Network error",
    detail: "Backend not running. Start it with: uvicorn api.main:app --reload",
    isNetworkError: true,
  };
  throw error;
}

/**
 * Fetch health status and total indexed chunks.
 */
export async function getHealth(): Promise<Health> {
  try {
    const res = await fetch(`${BASE_PREFIX}/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return await handleResponse<Health>(res);
  } catch (err) {
    return handleNetworkError(err);
  }
}

/**
 * Fetch enabled laws catalog with chunk counts and sample questions.
 */
export async function getLaws(): Promise<Law[]> {
  try {
    const res = await fetch(`${BASE_PREFIX}/laws`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return await handleResponse<Law[]>(res);
  } catch (err) {
    return handleNetworkError(err);
  }
}

/**
 * Post statutory inquiry to the backend RAG pipeline.
 */
export async function ask(request: AskRequest): Promise<AskResponse> {
  try {
    const res = await fetch(`${BASE_PREFIX}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(request),
    });
    return await handleResponse<AskResponse>(res);
  } catch (err) {
    return handleNetworkError(err);
  }
}

/**
 * Fetch statutory chunk payload for citation drawers.
 */
export async function getChunk(lawId: string, section: string): Promise<Chunk> {
  try {
    const res = await fetch(`${BASE_PREFIX}/chunks/${encodeURIComponent(lawId)}/${encodeURIComponent(section)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    return await handleResponse<Chunk>(res);
  } catch (err) {
    return handleNetworkError(err);
  }
}

/**
 * Post document upload or text for structured AI legal summary.
 */
export async function summarizeDocument(
  file?: File | null,
  rawText?: string,
  instructions?: string
): Promise<SummarizeResponse> {
  try {
    const formData = new FormData();
    if (file) {
      formData.append("file", file);
    }
    if (rawText) {
      formData.append("raw_text", rawText);
    }
    if (instructions) {
      formData.append("instructions", instructions);
    }

    const res = await fetch(`${BASE_PREFIX}/summarize`, {
      method: "POST",
      body: formData,
    });
    return await handleResponse<SummarizeResponse>(res);
  } catch (err) {
    return handleNetworkError(err);
  }
}

/**
 * Post legal drafting request.
 */
export async function draftDocument(request: DraftRequest): Promise<DraftResponse> {
  try {
    const res = await fetch(`${BASE_PREFIX}/draft`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(request),
    });
    return await handleResponse<DraftResponse>(res);
  } catch (err) {
    return handleNetworkError(err);
  }
}

/**
 * Fetch all currently indexed user documents from the backend Qdrant registry.
 */
export async function getUserDocuments(): Promise<UserDocument[]> {
  try {
    const res = await fetch(`${BASE_PREFIX}/documents`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return await handleResponse<UserDocument[]>(res);
  } catch (err) {
    return handleNetworkError(err);
  }
}

/**
 * Upload and index a user document into Qdrant Vector DB (Chunked + Embedded).
 */
export async function indexUserDocument(file: File): Promise<IndexDocumentResponse> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${BASE_PREFIX}/documents/index`, {
      method: "POST",
      body: formData,
    });
    return await handleResponse<IndexDocumentResponse>(res);
  } catch (err) {
    return handleNetworkError(err);
  }
}

/**
 * Permanently delete a user document and all its chunks from Qdrant Vector DB.
 */
export async function deleteUserDocument(docId: string): Promise<{ status: string; doc_id: string; message: string }> {
  try {
    const res = await fetch(`${BASE_PREFIX}/documents/${encodeURIComponent(docId)}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    return await handleResponse<{ status: string; doc_id: string; message: string }>(res);
  } catch (err) {
    return handleNetworkError(err);
  }
}

export interface DocumentChunksResponse {
  status: string;
  doc_id: string;
  chunk_count: number;
  chunks: Chunk[];
}

/**
 * Fetch all chunks for a specific knowledge base document from Qdrant vector store.
 */
export async function getDocumentChunks(docId: string): Promise<DocumentChunksResponse> {
  try {
    const res = await fetch(`${BASE_PREFIX}/documents/${encodeURIComponent(docId)}/chunks`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    return await handleResponse<DocumentChunksResponse>(res);
  } catch (err) {
    return handleNetworkError(err);
  }
}
