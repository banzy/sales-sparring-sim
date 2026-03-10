"""Simulates an adversarial B2B buyer in a sparring session."""
from __future__ import annotations
import json
from app.core.llm_client import LLMClient
from app.models.schemas import ChatMessage, SparringChatResponse
from app.prompts.sparring import build_sparring_system_prompt

_llm = LLMClient()


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
    
    # Ensure it matches schema shape
    return {
        "buyer_response": raw_response.get("buyer_response", "I'm not sure what you mean by that."),
        "turn_feedback": raw_response.get("turn_feedback", {
            "handled_well": False,
            "comment": "Failed to parse feedback.",
            "weakness_tags": []
        }),
        "objections_triggered": raw_response.get("objections_triggered", []),
    }
