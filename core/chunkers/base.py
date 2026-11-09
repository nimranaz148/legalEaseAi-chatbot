"""
Abstract BaseChunker interface for statutory text chunking.
"""
from abc import ABC, abstractmethod
from core.schema import Chunk, LawConfig, PageResult


class BaseChunker(ABC):
    @abstractmethod
    def chunk(self, pages: list[PageResult], law_cfg: LawConfig, law_id: str) -> list[Chunk]:
        """Convert page results into structured statutory chunks."""
        pass
