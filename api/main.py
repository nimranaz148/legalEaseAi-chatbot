"""
FastAPI Backend Application for Legal Assistant RAG.
Exposes health, law catalog, search QA, and chunk inspection endpoints.
100% Law-agnostic.
"""
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from core.config import get_settings, get_enabled_laws
from core.schema import AskRequest, AskResponse, Chunk
from core.store import VectorStore
from core.retrieve import retrieve_relevant_chunks
from core.answer import generate_answer

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Verify vector collection at startup."""
    try:
        with VectorStore() as store:
            store.ensure_collection()
    except Exception:
        pass
    yield


app = FastAPI(
    title="Legal Assistant RAG API",
    description="Statutory retrieval-augmented QA API for legal codes.",
    version="0.1.0",
    lifespan=lifespan
)


@app.get("/health")
def health_check():
    """Returns system status, vector collection status, and total chunk count."""
    try:
        with VectorStore() as store:
            count = 0
            laws = get_enabled_laws()
            for lid in laws.keys():
                count += store.count_by_law(lid)
            return {
                "status": "ok",
                "collection_exists": True,
                "total_chunks": count
            }
    except Exception as e:
        return {
            "status": "warning",
            "collection_exists": False,
            "total_chunks": 0,
            "notice": str(e)
        }


@app.get("/laws")
def get_laws_catalog():
    """
    Returns list of enabled laws with indexed chunk counts.
    Powers frontend filters without hardcoding statute names.
    """
    enabled_laws = get_enabled_laws()
    catalog = []

    with VectorStore() as store:
        for law_id, cfg in enabled_laws.items():
            count = store.count_by_law(law_id)
            catalog.append({
                "law_id": law_id,
                "name": cfg.name,
                "short": cfg.short,
                "year": cfg.year,
                "chunk_count": count,
                "examples": cfg.examples,
                "unit_label": cfg.unit_label
            })

    return catalog


@app.post("/ask", response_model=AskResponse)
def ask_question(request: AskRequest):
    """
    Executes hybrid retrieval, context QA, and citation verification.
    """
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Question cannot be empty.")

    try:
        chunks, debug_retrieved, rewritten = retrieve_relevant_chunks(
            question=request.question,
            law_ids=request.law_ids,
            top_k=request.top_k
        )

        response = generate_answer(
            question=request.question,
            chunks=chunks,
            debug_retrieved=debug_retrieved if request.debug else None,
            rewritten_query=rewritten if request.debug else None
        )

        if not request.debug:
            response.debug = None

        return response
    except Exception as e:
        err_msg = str(e)
        if "429" in err_msg or "quota" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemini API rate limit reached. Please wait a moment and retry."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during query execution: {err_msg}"
        )


@app.get("/chunks/{law_id}/{section}", response_model=Chunk)
def get_statutory_chunk(law_id: str, section: str):
    """Retrieves full chunk payload for citation drawers."""
    with VectorStore() as store:
        chunk = store.get_chunk(law_id, section)
        if not chunk:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Statutory section '{section}' not found in law '{law_id}'."
            )
        return chunk
