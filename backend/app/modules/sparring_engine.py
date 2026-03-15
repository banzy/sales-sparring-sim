"""Simulates an adversarial B2B buyer in a sparring session."""
from __future__ import annotations

import logging

from app.core.llm_client import LLMClient
from app.models.schemas import ChatMessage, SparringChatResponse
from app.modules import rag_retriever
from app.prompts.sparring import build_sparring_system_prompt
from app.storage import vector_store

logger = logging.getLogger(__name__)
_llm = LLMClient()

# Cap conversation history to this many messages to keep token usage bounded.
HISTORY_CAP_MESSAGES = 16


def _normalize_objections_triggered(scenario: dict, raw: list) -> list[dict]:
    """Coerce LLM output to list of {id, title} using scenario objections."""
    objections_by_id = {str(o.get("id")): o for o in scenario.get("objections", []) if o.get("id")}
    result = []
    for item in raw or []:
        if isinstance(item, dict) and item.get("id") and item.get("title"):
            result.append({"id": str(item["id"]), "title": str(item["title"])})
            continue
        oid = item.get("id") if isinstance(item, dict) else item
        if oid is None and isinstance(item, str):
            oid = item
        if oid is not None:
            obj = objections_by_id.get(str(oid))
            if obj and obj.get("title"):
                result.append({"id": str(obj["id"]), "title": str(obj["title"])})
    return result


def _retrieve_by_type(
    query: str,
    project_id: str,
    doc_type: str,
    top_k: int = 4,
) -> str:
    """Embed query, search Qdrant by project_id and doc_type, return formatted context."""
    try:
        query_vector = _llm.embed_single(query)
        chunks = vector_store.search(
            query_vector,
            top_k=top_k,
            filters={"project_id": project_id, "doc_type": doc_type},
        )
        return rag_retriever.format_context(chunks)
    except Exception:
        logger.warning("Sparring RAG retrieval failed [%s / %s]", project_id, doc_type, exc_info=True)
        return ""


def _retrieve_sparring_context(
    project_id: str,
    user_reply: str,
    recent_messages_text: str = "",
) -> dict[str, str]:
    """
    Retrieve RAG context for the buyer turn: deal context, constraints, objections,
    and seller feedback/progress. Queries are tuned from the current turn.
    """
    query_base = f"{user_reply} {recent_messages_text}".strip() or "buyer persona deal"
    company_query = f"company profile buyer persona value proposition budget cycle decision timeline {query_base}"
    objection_query = f"objections pushback concerns {query_base}"
    feedback_query = "past session performance strengths weaknesses feedback score"
    progress_query = "learning progress evolution focus areas priority weaknesses"

    company_ctx = _retrieve_by_type(company_query, project_id, "scenario_profile", top_k=3)
    objection_ctx = _retrieve_by_type(objection_query, project_id, "scenario_objection", top_k=4)
    constraint_ctx = _retrieve_by_type(company_query, project_id, "scenario_constraint", top_k=2)
    feedback_ctx = _retrieve_by_type(feedback_query, project_id, "session_feedback", top_k=3)
    progress_ctx = _retrieve_by_type(progress_query, project_id, "learning_progress", top_k=2)

    return {
        "company_ctx": company_ctx,
        "objection_ctx": objection_ctx,
        "constraint_ctx": constraint_ctx,
        "feedback_ctx": feedback_ctx,
        "progress_ctx": progress_ctx,
    }


def next_turn(
    scenario: dict,
    profile: dict,
    history: list[dict],
    user_reply: str,
    tested_objection_ids: list[str] | None = None,
    project_id: str | None = None,
) -> dict:
    """Generate the next buyer turn using JSON mode to extract both dialogue and hidden feedback."""
    # Build RAG context from Qdrant (turn-relevant chunks only)
    recent_text = ""
    if history:
        last_few = history[-4:]
        recent_text = " ".join(m.get("content", "") or "" for m in last_few)
    rag_context = (
        _retrieve_sparring_context(project_id, user_reply, recent_text)
        if project_id
        else {}
    )

    sys_prompt = build_sparring_system_prompt(
        scenario,
        profile,
        tested_objection_ids=tested_objection_ids,
        rag_context=rag_context if any(rag_context.values()) else None,
    )

    # Cap history to keep token usage bounded
    capped = history[-HISTORY_CAP_MESSAGES:] if len(history) > HISTORY_CAP_MESSAGES else history
    context_str = "Conversation so far:\n"
    for msg in capped:
        label = "Buyer (You)" if msg.get("role") == "buyer" else "Seller"
        context_str += f"{label}: {msg.get('content')}\n\n"

    context_str += f"Seller: {user_reply}\n[Generate your response as the Buyer]"

    raw_response = _llm.generate_json(sys_prompt, context_str)
    
    # Ensure it matches schema shape; normalize objections to {id, title} using scenario
    return {
        "buyer_response": raw_response.get("buyer_response", "I'm not sure what you mean by that."),
        "turn_feedback": raw_response.get("turn_feedback", {
            "handled_well": False,
            "comment": "Failed to parse feedback.",
            "weakness_tags": []
        }),
        "objections_triggered": _normalize_objections_triggered(
            scenario, raw_response.get("objections_triggered", [])
        ),
    }
