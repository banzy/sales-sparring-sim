"""Qdrant vector store wrapper."""
from __future__ import annotations
import uuid
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)
from app.config import get_settings


def _get_client() -> QdrantClient:
    settings = get_settings()
    return QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key)


VECTOR_SIZE = 1536  # text-embedding-3-small


def ensure_collection() -> None:
    """Create the Qdrant collection if it doesn't exist yet."""
    settings = get_settings()
    client = _get_client()
    existing = [c.name for c in client.get_collections().collections]
    if settings.qdrant_collection not in existing:
        client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )


def index_chunks(chunks: list[dict]) -> None:
    """
    Upsert pre-embedded chunks into Qdrant.

    Each chunk dict must have:
      - 'embedding': list[float]
      - 'text': str
      - 'metadata': dict (arbitrary payload, e.g. project_id, doc_id, filename, etc.)
    """
    settings = get_settings()
    client = _get_client()
    ensure_collection()

    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=chunk["embedding"],
            payload={
                "text": chunk["text"],
                **chunk.get("metadata", {}),
            },
        )
        for chunk in chunks
    ]
    client.upsert(collection_name=settings.qdrant_collection, points=points)


def search(
    query_vector: list[float],
    top_k: int = 6,
    filters: dict | None = None,
) -> list[dict]:
    """
    Semantic search over the collection.

    Optional `filters` dict maps payload field → exact match value,
    e.g. {"industry": "logistics"} or {"project_id": "scenario_123"}.
    Returns list of {text, score, metadata} dicts.
    """
    settings = get_settings()
    client = _get_client()

    qdrant_filter = None
    if filters:
        conditions = [
            FieldCondition(key=k, match=MatchValue(value=v))
            for k, v in filters.items()
        ]
        qdrant_filter = Filter(must=conditions)

    results = client.search(
        collection_name=settings.qdrant_collection,
        query_vector=query_vector,
        limit=top_k,
        query_filter=qdrant_filter,
        with_payload=True,
    )

    hits = []
    for r in results:
        payload = r.payload or {}
        text = payload.pop("text", "")
        hits.append({"text": text, "score": r.score, "metadata": payload})
    return hits
