"""
Qdrant Local Disk Vector Store Integration.
Enforces deterministic UUID5 point IDs, cosine distance, and metadata payload indexing.
"""
import logging
from pathlib import Path
from typing import Optional
import uuid
import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.http import models
from core.config import get_settings
from core.schema import Chunk

logger = logging.getLogger(__name__)


def get_point_uuid(chunk_id: str) -> str:
    """Computes deterministic UUID5 for a chunk ID."""
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, chunk_id))


class VectorStore:
    def __init__(self, qdrant_path: Optional[str] = None):
        settings = get_settings()
        self.path = qdrant_path or settings.QDRANT_PATH
        self.collection_name = settings.COLLECTION_NAME
        self.dim = settings.EMBED_DIM
        Path(self.path).mkdir(parents=True, exist_ok=True)
        try:
            self.client = QdrantClient(path=self.path)
        except Exception as e:
            raise RuntimeError(
                f"Failed to open Qdrant in local disk mode at '{self.path}': {e}. "
                "Notice: Local mode holds a file lock. Stop the FastAPI server or any running ingest processes."
            )

    def close(self):
        if hasattr(self, "client") and self.client:
            self.client.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def ensure_collection(self):
        """Creates collection if not present; validates dimensions if existing."""
        collections = self.client.get_collections().collections
        exists = any(c.name == self.collection_name for c in collections)

        if exists:
            info = self.client.get_collection(self.collection_name)
            current_dim = info.config.params.vectors.size
            if current_dim != self.dim:
                raise ValueError(
                    f"Qdrant collection '{self.collection_name}' has dimension {current_dim}, "
                    f"but EMBED_DIM is configured as {self.dim}. Never mix vector dimensions."
                )
            return

        logger.info("Creating Qdrant collection '%s' (dim=%d, Cosine)...", self.collection_name, self.dim)
        self.client.create_collection(
            collection_name=self.collection_name,
            vectors_config=models.VectorParams(size=self.dim, distance=models.Distance.COSINE)
        )

        # Create payload indexes for fast filtering
        try:
            self.client.create_payload_index(
                collection_name=self.collection_name,
                field_name="law_id",
                field_schema=models.PayloadSchemaType.KEYWORD
            )
            self.client.create_payload_index(
                collection_name=self.collection_name,
                field_name="section",
                field_schema=models.PayloadSchemaType.KEYWORD
            )
            self.client.create_payload_index(
                collection_name=self.collection_name,
                field_name="status",
                field_schema=models.PayloadSchemaType.KEYWORD
            )
        except Exception as e:
            logger.debug("Payload index creation notice: %s", e)

    def upsert_chunks(self, chunks: list[Chunk], embeddings: np.ndarray):
        """Upserts chunks with deterministic UUID5 IDs and vector payloads."""
        if not chunks:
            return

        self.ensure_collection()
        points = []
        for chunk, vector in zip(chunks, embeddings):
            p_id = get_point_uuid(chunk.id)
            payload = chunk.model_dump()
            points.append(
                models.PointStruct(
                    id=p_id,
                    vector=vector.tolist(),
                    payload=payload
                )
            )

        # Upsert in batches of 100
        batch_size = 100
        for i in range(0, len(points), batch_size):
            batch = points[i:i + batch_size]
            self.client.upsert(collection_name=self.collection_name, points=batch)

        logger.info("Upserted %d points into '%s'", len(points), self.collection_name)

    def search(
        self,
        query_vector: list[float],
        top_k: int = 5,
        law_ids: Optional[list[str]] = None,
        min_score: float = 0.45
    ) -> list[tuple[Chunk, float]]:
        """Vector similarity search filtered by law_id and status=active."""
        self.ensure_collection()

        must_conditions: list[models.Condition] = [
            models.FieldCondition(key="status", match=models.MatchValue(value="active"))
        ]

        if law_ids:
            must_conditions.append(
                models.FieldCondition(
                    key="law_id",
                    match=models.MatchAny(any=law_ids) if len(law_ids) > 1 else models.MatchValue(value=law_ids[0])
                )
            )

        filter_query = models.Filter(must=must_conditions)

        results = []
        if hasattr(self.client, "query_points"):
            res = self.client.query_points(
                collection_name=self.collection_name,
                query=query_vector,
                limit=top_k,
                query_filter=filter_query,
                score_threshold=min_score
            )
            for hit in res.points:
                chunk = Chunk(**hit.payload)
                results.append((chunk, hit.score))
        else:
            res = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector,
                limit=top_k,
                query_filter=filter_query,
                score_threshold=min_score
            )
            for hit in res:
                chunk = Chunk(**hit.payload)
                results.append((chunk, hit.score))
        return results

    def get_chunk(self, law_id: str, section: str) -> Optional[Chunk]:
        """Fetch a specific chunk by law_id and section number."""
        self.ensure_collection()
        target_id = f"{law_id}:{section}"

        res = self.client.scroll(
            collection_name=self.collection_name,
            scroll_filter=models.Filter(
                must=[
                    models.FieldCondition(key="law_id", match=models.MatchValue(value=law_id)),
                    models.FieldCondition(key="section", match=models.MatchValue(value=section))
                ]
            ),
            limit=1
        )
        points, _ = res
        if points:
            return Chunk(**points[0].payload)
        return None

    def get_chunks_by_law(self, law_id: str, limit: int = 150) -> list[Chunk]:
        """Retrieves all chunk payloads associated with a specific law_id or user document."""
        self.ensure_collection()
        try:
            res, _ = self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=models.Filter(
                    must=[models.FieldCondition(key="law_id", match=models.MatchValue(value=law_id))]
                ),
                limit=limit,
                with_payload=True,
                with_vectors=False
            )
            return [Chunk(**p.payload) for p in res if p.payload]
        except Exception as e:
            logger.warning("Error fetching chunks for law_id %s: %s", law_id, e)
            return []

    def delete_by_law(self, law_id: str) -> int:
        """Deletes all points associated with a specific law_id."""
        self.ensure_collection()
        res = self.client.delete(
            collection_name=self.collection_name,
            points_selector=models.Filter(
                must=[models.FieldCondition(key="law_id", match=models.MatchValue(value=law_id))]
            )
        )
        return 1

    def count_by_law(self, law_id: str) -> int:
        """Counts points for a specific law_id."""
        try:
            self.ensure_collection()
            res = self.client.count(
                collection_name=self.collection_name,
                count_filter=models.Filter(
                    must=[models.FieldCondition(key="law_id", match=models.MatchValue(value=law_id))]
                ),
                exact=True
            )
            return res.count
        except Exception:
            return 0
