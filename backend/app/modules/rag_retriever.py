"""RAG retriever: semantic search over the Qdrant knowledge base."""
from __future__ import annotations
from app.core.llm_client import LLMClient
from app.storage import vector_store

_llm = LLMClient()


def retrieve_context(
    query: str,
    filters: dict | None = None,
    top_k: int = 6,
) -> list[dict]:
    """
    Embed the query string and retrieve the most relevant chunks from Qdrant.
    Optional `filters` are applied as exact-match payload filters.
    """
    query_vector = _llm.embed_single(query)
    return vector_store.search(query_vector, top_k=top_k, filters=filters)


def build_context_for_scenario(scenario: dict, query: str) -> list[dict]:
    """Build a targeted retrieval query enriched with scenario metadata."""
    sector = scenario.get("client_profile", {}).get("buyer_persona", "")
    enriched_query = f"{query} client sector:{sector}"
    return retrieve_context(enriched_query, top_k=5)


def format_context(chunks: list[dict]) -> str:
    """Format retrieved chunks into a readable context block for the LLM."""
    if not chunks:
        return "No relevant knowledge base content found."

    parts = []
    for i, chunk in enumerate(chunks, 1):
        meta = chunk.get("metadata", {})
        label = meta.get("title", meta.get("doc_type", f"Document {i}"))
        parts.append(f"[{i}] {label}\n{chunk['text']}")

    return "\n\n---\n\n".join(parts)
