"""Generates contextual seller response suggestions — all context via Qdrant RAG."""
from __future__ import annotations

import logging

from app.core.llm_client import LLMClient
from app.modules import rag_retriever
from app.prompts.suggestion import SUGGESTION_SYSTEM_PROMPT, build_suggestion_context
from app.storage import session_store, vector_store

logger = logging.getLogger(__name__)

_llm = LLMClient()


# ---------------------------------------------------------------------------
# RAG multi-query helpers
# ---------------------------------------------------------------------------

def _retrieve_by_type(
    query: str,
    project_id: str,
    doc_type: str,
    top_k: int = 4,
) -> str:
    """
    Embed `query`, search Qdrant filtered by project_id AND doc_type.
    Returns formatted text or empty string if nothing found.
    """
    try:
        query_vector = _llm.embed_single(query)
        chunks = vector_store.search(
            query_vector,
            top_k=top_k,
            filters={"project_id": project_id, "doc_type": doc_type},
        )
        return rag_retriever.format_context(chunks)
    except Exception:
        logger.warning("RAG retrieval failed [%s / %s]", project_id, doc_type, exc_info=True)
        return ""


def _retrieve_docs(
    query: str,
    project_id: str,
    top_k: int = 5,
) -> str:
    """
    Retrieve uploaded project documents only.
    """
    try:
        query_vector = _llm.embed_single(query)
        chunks = vector_store.search(
            query_vector,
            top_k=top_k,
            filters={"project_id": project_id, "doc_type": "uploaded_document"},
        )
        return rag_retriever.format_context(chunks)
    except Exception:
        logger.warning("RAG doc retrieval failed [%s]", project_id, exc_info=True)
        return ""


def _retrieve_all_context(
    project_id: str,
    scenario: dict,
    last_buyer_msg: str,
    seller_intent: str,
) -> dict[str, str]:
    """
    Fire multiple targeted RAG queries to retrieve each knowledge dimension.
    Returns a dict with keys matching the prompt template sections.
    """
    sector = scenario.get("generation_context", {}).get("sector", "")
    client_name = scenario.get("client_profile", {}).get("name", "client")

    # Query strings tuned to each knowledge type
    company_query   = f"company profile {client_name} sector {sector} buyer persona constraints"
    objection_query = f"objections and pushback: {last_buyer_msg}"
    feedback_query  = f"past session performance strengths weaknesses feedback score"
    progress_query  = f"learning progress evolution focus areas priority weaknesses advice"
    docs_query      = f"{last_buyer_msg} {seller_intent} {sector}"

    # Parallel retrieval per doc_type
    company_ctx   = _retrieve_by_type(company_query,   project_id, "scenario_profile",   top_k=3)
    objection_ctx = _retrieve_by_type(objection_query, project_id, "scenario_objection", top_k=4)
    constraint_ctx= _retrieve_by_type(company_query,   project_id, "scenario_constraint",top_k=2)
    feedback_ctx  = _retrieve_by_type(feedback_query,  project_id, "session_feedback",   top_k=5)
    progress_ctx  = _retrieve_by_type(progress_query,  project_id, "learning_progress",  top_k=3)
    docs_ctx      = _retrieve_docs(docs_query, project_id, top_k=5)

    return {
        "company_ctx":    company_ctx,
        "objection_ctx":  objection_ctx,
        "constraint_ctx": constraint_ctx,
        "feedback_ctx":   feedback_ctx,
        "progress_ctx":   progress_ctx,
        "docs_ctx":       docs_ctx,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def suggest_response(
    scenario_id: str,
    project_id: str,
    conversation_history: list[dict],
) -> str:
    """
    Generate an AI-suggested seller response grounded in fully RAG-retrieved context.

    All knowledge (company info, scenario objections, past coaching feedback,
    progress trends, and uploaded documents) is retrieved semantically from
    Qdrant — nothing is injected as raw text from SQLite.

    Returns:
        The suggested seller response as plain text.
    """
    # 1. Load scenario from DB (needed only to build semantic query strings)
    scenario = session_store.get_scenario(scenario_id)
    if not scenario:
        raise ValueError(f"Scenario {scenario_id} not found")

    # 2. Identify the last buyer message + rough seller intent for query enrichment
    last_buyer_msg = ""
    for msg in reversed(conversation_history):
        if msg.get("role") == "buyer":
            last_buyer_msg = msg.get("content", "")
            break

    last_seller_msg = ""
    for msg in reversed(conversation_history):
        if msg.get("role") == "seller":
            last_seller_msg = msg.get("content", "")
            break

    seller_intent = last_seller_msg[:200] if last_seller_msg else ""

    # 3. Retrieve ALL context via multi-query RAG (Qdrant only, no raw text)
    rag_context = _retrieve_all_context(
        project_id=project_id,
        scenario=scenario,
        last_buyer_msg=last_buyer_msg,
        seller_intent=seller_intent,
    )

    # 4. Format current conversation
    conv_text = "\n\n".join(
        f"[{'BUYER' if m.get('role') == 'buyer' else 'SELLER'}]: {m.get('content', '')}"
        for m in conversation_history
    )

    # 5. Assemble the full prompt context
    context = build_suggestion_context(
        scenario=scenario,
        conversation_history=conversation_history,
        rag_context=rag_context,
        past_sessions_summary="",   # now retrieved via RAG (feedback_ctx + progress_ctx)
        user_profile={},            # now retrieved via RAG (progress_ctx)
    )

    # 6. Call LLM
    result = _llm.generate_json(SUGGESTION_SYSTEM_PROMPT, context)

    return result.get("suggestion", "I'd love to explore how we can address your specific concerns.")
