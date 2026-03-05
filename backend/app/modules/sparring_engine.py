"""Simulates an adversarial B2B buyer in a sparring session."""
from __future__ import annotations
import json
from app.core.llm_client import LLMClient
from app.models.schemas import ChatMessage, SparringChatResponse

_llm = LLMClient()


def build_system_prompt(scenario: dict, profile: dict) -> str:
    """Constructs the persona instruction based on client constraints and user weaknesses."""
    persona = scenario.get("client_profile", {}).get("buyer_persona", "Skeptical executive")
    constraints = "\n".join(f"- {c}" for c in scenario.get("buying_constraints", []))
    objections = "\n".join(f"- {o['title']}: {o['detail']}" for o in scenario.get("objections", []))

    level = profile.get("current_level", "intermediate")
    aggression = {
        "beginner": "friendly, collaborative, asks clarifying questions",
        "intermediate": "professional but skeptical, pushes for proof",
        "advanced": "firm, demanding, focused on ROI and risk",
        "adversarial": "hostile, impatient, interrupts and challenges every claim",
    }.get(level, "skeptical")

    priority_weaknesses = profile.get("priority_weaknesses", [])
    focus_instruction = ""
    if priority_weaknesses:
        focus_instruction = f"Push particularly hard on these topics: {', '.join(priority_weaknesses)}"

    return f"""You are roleplaying as an adversarial B2B buyer during a sales call.
Your persona: {persona}
Your attitude: {aggression}

Your Buying Constraints:
{constraints}

Your Pre-planned Objections:
{objections}

{focus_instruction}

Keep your responses conversational but short (1-3 sentences max). You are speaking live on a call.
Do NOT be overly helpful. Challenge weak claims. Demand proof. Always stay in character.

Respond with valid JSON containing:
1. `buyer_response`: Your exact dialogue as the buyer.
2. `turn_feedback`: Hidden analysis of how the seller just did (`handled_well`, `comment` string, `weakness_tags` array).
3. `objections_triggered`: Array of objection IDs you just raised (if any)."""


def next_turn(
    scenario: dict,
    profile: dict,
    history: list[dict],
    user_reply: str,
) -> dict:
    """Generate the next buyer turn using JSON mode to extract both dialogue and hidden feedback."""
    sys_prompt = build_system_prompt(scenario, profile)

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
