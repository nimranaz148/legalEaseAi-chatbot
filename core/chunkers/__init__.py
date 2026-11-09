"""
Statutory Chunker registry.
Maps chunker identifier string from laws.yaml to Chunker implementation.
"""
from core.chunkers.base import BaseChunker
from core.chunkers.section import SectionChunker

CHUNKERS: dict[str, BaseChunker] = {
    "section": SectionChunker(),
}


def get_chunker(name: str) -> BaseChunker:
    if name not in CHUNKERS:
        raise ValueError(f"Unknown chunker type '{name}'. Registered: {list(CHUNKERS.keys())}")
    return CHUNKERS[name]
