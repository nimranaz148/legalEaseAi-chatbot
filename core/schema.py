from typing import Any, Literal, Optional
from pydantic import BaseModel, Field


class PageResult(BaseModel):
    law_id: str
    page: int
    text: str
    source: Literal["text", "ocr"] = "text"
    ocr_used: bool = False
    char_count: int = 0


class Chunk(BaseModel):
    id: str  # Format: {law_id}:{section} or {law_id}:{section}#2
    law_id: str
    law_name: str
    law_short: str
    year: int
    section: str
    title: str
    text: str
    page_start: int
    page_end: int
    source: Literal["text", "ocr"] = "text"
    status: Literal["active", "omitted", "repealed"] = "active"
    version_date: str = ""
    source_url: str = ""


class Citation(BaseModel):
    id: str
    law_name: str
    section: str
    title: str
    quote: str
    page_start: Optional[int] = None


class AskRequest(BaseModel):
    question: str
    law_ids: Optional[list[str]] = None
    top_k: Optional[int] = None
    debug: bool = False


class DebugInfo(BaseModel):
    rewritten_query: Optional[str] = None
    retrieved: list[dict[str, Any]] = Field(default_factory=list)
    ocr_pages_used: int = 0


class AskResponse(BaseModel):
    answer: str
    citations: list[Citation] = Field(default_factory=list)
    found: bool = True
    disclaimer: str = ""
    debug: Optional[DebugInfo] = None


class DraftRequest(BaseModel):
    topic: str
    document_type: str = "Legal Notice"
    jurisdiction: str = "Pakistan"
    parties: Optional[str] = None
    key_terms: Optional[str] = None


class DraftResponse(BaseModel):
    title: str
    document_type: str
    draft: str
    disclaimer: str = "Yeh sirf maloomati hai, qanooni mashwara nahi."


class SummarizeResponse(BaseModel):
    filename: str
    page_count: int
    char_count: int
    summary: str
    disclaimer: str = "Yeh sirf maloomati hai, qanooni mashwara nahi."


class ChunkerOptions(BaseModel):
    section_pattern: str = r"^\s*(\d+[A-Z]{0,2})\.\s+(.+?)\.\s*[\u2014\-]"
    max_chunk_tokens: int = 600
    keep_with_parent: list[str] = Field(default_factory=lambda: ["Illustration", "Explanation", "Exception"])


class LawConfig(BaseModel):
    name: str
    full_name: str
    short: str
    year: int
    pdf: str
    language: str = "en"
    chunker: str = "section"
    chunker_options: dict[str, Any] = Field(default_factory=dict)
    page_range: Optional[list[int]] = None
    version_date: str
    source_url: str
    enabled: bool = True
    unit_label: str = "Section"
    examples: list[str] = Field(default_factory=list)
