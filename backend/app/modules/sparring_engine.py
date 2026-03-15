"""Simulates an adversarial B2B buyer in a sparring session."""
from __future__ import annotations

from app.core.llm_client import LLMClient
from app.models.schemas import ChatMessage, SparringChatResponse
from app.prompts.sparring import build_sparring_system_prompt

_llm = LLMClient()


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


def next_turn(
    scenario: dict,
    profile: dict,
    history: list[dict],
    user_reply: str,
) -> dict:
    """Generate the next buyer turn using JSON mode to extract both dialogue and hidden feedback."""
    sys_prompt = build_sparring_system_prompt(scenario, profile)

    # Format history for LLM
    context_str = "Conversation so far:\n"
    for msg in history[-6:]:  # Keep context window focused on recent turns
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
