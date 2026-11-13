"""
FastAPI Backend Application for Legal Assistant RAG.
Exposes health, law catalog, search QA, and chunk inspection endpoints.
100% Law-agnostic.
"""
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from core.config import get_settings, get_enabled_laws
from core.schema import AskRequest, AskResponse, Chunk, DraftRequest, DraftResponse, SummarizeResponse
from core.store import VectorStore
from core.retrieve import retrieve_relevant_chunks
from core.answer import generate_answer
from core.llm import generate_text
from core.ocr import ocr_gemini_vision
from core.extract import should_use_ocr
from core.user_docs import get_user_documents, index_user_document, delete_user_document, get_document_chunks

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
    title="LegalEase RAG API",
    description="Statutory retrieval-augmented QA API for legal codes.",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
            user_docs = get_user_documents()
            for doc in user_docs:
                count += store.count_by_law(doc.get("doc_id", ""))
            return {
                "status": "ok",
                "collection_exists": True,
                "total_chunks": count,
                "user_documents_count": len(user_docs)
            }
    except Exception as e:
        return {
            "status": "warning",
            "collection_exists": False,
            "total_chunks": 0,
            "notice": str(e)
        }


@app.get("/documents")
def list_user_documents():
    """Returns list of currently indexed user documents."""
    return get_user_documents()


@app.post("/documents/index")
async def index_document_endpoint(file: UploadFile = File(...)):
    """Indexes an uploaded PDF, scanned document, or text file into Qdrant."""
    if not file:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No file uploaded.")
    content_bytes = await file.read()
    if len(content_bytes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    try:
        record = index_user_document(
            content_bytes=content_bytes,
            filename=file.filename or "uploaded_document.pdf"
        )
        return {
            "status": "ok",
            "message": "Document indexed into Qdrant vector database successfully.",
            "document": record
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to index document: {str(e)}")


@app.delete("/documents/{doc_id}")
def delete_document_endpoint(doc_id: str):
    """Deletes an indexed user document and all its chunks from Qdrant vector DB."""
    try:
        delete_user_document(doc_id)
        return {
            "status": "deleted",
            "doc_id": doc_id,
            "message": "Document and all associated chunks permanently deleted from database."
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Failed to delete document: {str(e)}")


@app.get("/documents/{doc_id}/chunks")
def get_user_doc_chunks_endpoint(doc_id: str):
    """Returns all indexed chunks for a user document to inspect in the Admin Panel."""
    try:
        chunks = get_document_chunks(doc_id)
        return {
            "status": "ok",
            "doc_id": doc_id,
            "chunk_count": len(chunks),
            "chunks": [c.model_dump() for c in chunks]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch chunks: {str(e)}"
        )


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
                "unit_label": cfg.unit_label,
                "is_user_doc": False
            })

        user_docs = get_user_documents()
        for doc in user_docs:
            doc_id = doc.get("doc_id", "")
            count = store.count_by_law(doc_id)
            catalog.append({
                "law_id": doc_id,
                "name": doc.get("filename", "Uploaded Document"),
                "short": doc.get("filename", "Uploaded Doc")[:22],
                "year": 2024,
                "chunk_count": count,
                "examples": [f"What are the main provisions in {doc.get('filename')}?"],
                "unit_label": "Clause",
                "is_user_doc": True
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
        search_law_ids = request.law_ids
        if search_law_ids is not None:
            user_docs = get_user_documents()
            user_doc_ids = [d["doc_id"] for d in user_docs if "doc_id" in d]
            if user_doc_ids:
                search_law_ids = list(set(search_law_ids + user_doc_ids))

        chunks, debug_retrieved, rewritten = retrieve_relevant_chunks(
            question=request.question,
            law_ids=search_law_ids,
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


SUMMARIZE_SYSTEM_PROMPT = (
    "You are an expert legal document analyst.\n"
    "Analyze the provided legal document (contract, court judgment, ordinance, petition, agreement, or notice).\n"
    "Produce a high-grade, professional, structured legal summary in clean Markdown with these sections:\n"
    "1. 📋 **Document Overview & Classification**: Title/nature of document, purpose, jurisdiction, and governing date.\n"
    "2. 👥 **Parties Involved**: Names, designations, and respective roles/capacities.\n"
    "3. ⚖️ **Core Provisions & Covenants**: Major rights, obligations, promises, and operational terms.\n"
    "4. ⚠️ **Risks, Liabilities & Penalties**: Default clauses, indemnities, breach consequences, and termination provisions.\n"
    "5. 📅 **Key Timelines & Dispute Resolution**: Deadlines, notice periods, arbitration/court jurisdiction.\n"
    "6. 💡 **Critical Legal Takeaways & Red Flags**: Top practical advice or potential legal issues to watch for.\n"
    "Preserve statutory and clause citations when present. If the document is in Urdu, provide summary in clear Urdu; if English, in English; if bilingual, in English with key Urdu terms."
)

DRAFT_SYSTEM_PROMPT = (
    "You are a master legal draftsman with deep expertise in Pakistani and common law drafting conventions.\n"
    "Draft a formal, comprehensive, professional legal document/clause based on the user's instructions.\n"
    "Use standard formal legal language, numbered paragraphs, placeholder brackets (e.g., [PARTY A NAME], [DATE], [SUM OF RS.]), and statutory grounding where relevant.\n"
    "Ensure standard operative clauses (e.g., Definitions, Operative Covenants, Governing Law & Jurisdiction, Execution/Signatures) are included."
)


@app.post("/summarize", response_model=SummarizeResponse)
async def summarize_document(
    file: Optional[UploadFile] = File(None),
    raw_text: Optional[str] = Form(None),
    instructions: Optional[str] = Form(None)
):
    """
    Parses an uploaded PDF or raw text document and returns an AI-generated structured legal summary.
    """
    extracted_text = ""
    filename = "document.txt"
    page_count = 1

    if file:
        filename = file.filename or "uploaded_document"
        content_bytes = await file.read()
        if len(content_bytes) == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

        is_pdf = filename.lower().endswith(".pdf") or (file.content_type and "pdf" in file.content_type)
        is_image = any(filename.lower().endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"]) or (file.content_type and "image" in file.content_type)

        if is_image:
            try:
                extracted_text = ocr_gemini_vision(content_bytes)
                page_count = 1
            except Exception as e:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Gemini Vision OCR failed to read image: {str(e)}")
        elif is_pdf:
            try:
                import pymupdf as fitz
                doc = fitz.open(stream=content_bytes, filetype="pdf")
                page_count = len(doc)
                pages_text = []
                ocr_count = 0
                max_ocr_pages = 6

                for idx, p in enumerate(doc):
                    txt = p.get_text()
                    # Check if page requires OCR via should_use_ocr (text < 80 chars or scanned image)
                    if should_use_ocr(p, txt):
                        if ocr_count < max_ocr_pages:
                            try:
                                pix = p.get_pixmap(dpi=100)
                                img_bytes = pix.tobytes("jpeg")
                                ocr_txt = ocr_gemini_vision(img_bytes, mime_type="image/jpeg")
                                pages_text.append(ocr_txt)
                                ocr_count += 1
                            except Exception as ocr_err:
                                pages_text.append(f"[OCR warning page {idx+1}: {str(ocr_err)}]")
                        else:
                            pages_text.append(f"[Page {idx+1}: Scanned page omitted to maintain response speed limit]")
                    else:
                        pages_text.append(txt)
                extracted_text = "\n\n".join(pages_text).strip()
            except Exception as e:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Could not parse PDF: {str(e)}")
        else:
            try:
                extracted_text = content_bytes.decode("utf-8", errors="replace").strip()
            except Exception:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not read text from uploaded file.")
    elif raw_text:
        extracted_text = raw_text.strip()
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Either a file upload or raw_text is required.")

    if not extracted_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No readable text found in the uploaded document or image. Please ensure the image is clear and legible."
        )

    # Limit to reasonable token window (first ~100k characters)
    max_chars = 120_000
    truncated_text = extracted_text[:max_chars]
    if len(extracted_text) > max_chars:
        truncated_text += "\n\n[...Document truncated for length...]"

    prompt = f"DOCUMENT FILENAME: {filename}\nTOTAL PAGES: {page_count}\n"
    if instructions:
        prompt += f"USER SPECIAL FOCUS: {instructions}\n\n"
    prompt += f"DOCUMENT TEXT CONTENT:\n{truncated_text}"

    try:
        summary_result = generate_text(prompt=prompt, system_instruction=SUMMARIZE_SYSTEM_PROMPT)
        return SummarizeResponse(
            filename=filename,
            page_count=page_count,
            char_count=len(extracted_text),
            summary=summary_result,
            disclaimer="Yeh sirf maloomati hai, qanooni mashwara nahi."
        )
    except Exception as e:
        err_msg = str(e)
        if "429" in err_msg or "quota" in err_msg:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Gemini API rate limit reached. Please wait a moment and retry.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Summary generation error: {err_msg}")


@app.post("/draft", response_model=DraftResponse)
def draft_document(request: DraftRequest):
    """
    Generates a formal legal draft or template based on user requirements.
    """
    if not request.topic.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Draft topic or instructions cannot be empty.")

    prompt = (
        f"DOCUMENT TYPE: {request.document_type}\n"
        f"TOPIC / PURPOSE: {request.topic}\n"
        f"JURISDICTION: {request.jurisdiction}\n"
    )
    if request.parties:
        prompt += f"PARTIES: {request.parties}\n"
    if request.key_terms:
        prompt += f"KEY TERMS / CLAUSES: {request.key_terms}\n"

    try:
        draft_content = generate_text(prompt=prompt, system_instruction=DRAFT_SYSTEM_PROMPT)
        return DraftResponse(
            title=f"{request.document_type}: {request.topic[:60]}",
            document_type=request.document_type,
            draft=draft_content,
            disclaimer="Yeh sirf maloomati hai, qanooni mashwara nahi."
        )
    except Exception as e:
        err_msg = str(e)
        if "429" in err_msg or "quota" in err_msg:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Gemini API rate limit reached. Please wait a moment and retry.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Drafting error: {err_msg}")

