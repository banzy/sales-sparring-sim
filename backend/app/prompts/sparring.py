"""
Sparring Agent Prompts.

This module defines the prompts for the adversarial B2B buyer simulation.
The buyer agent roleplays as a skeptical/hostile buyer during sales calls,
challenging the seller with objections and demanding proof.
"""

from __future__ import annotations

# Attitude levels mapped to buyer behavior descriptions
ATTITUDE_LEVELS = {
    "beginner": "friendly, collaborative, asks clarifying questions",
    "intermediate": "professional but skeptical, pushes for proof",
    "advanced": "firm, demanding, focused on ROI and risk",
    "adversarial": "hostile, impatient, interrupts and challenges every claim",
}

# Base sparring prompt template with placeholders
SPARRING_PROMPT = """You are roleplaying as an adversarial B2B buyer during a sales call.
Your persona: {{persona}}
Your attitude: {{attitude}}

Your Buying Constraints:
{{constraints}}

Your Pre-planned Objections:
{{objections}}

{{focus_instruction}}

Keep your responses conversational but short (1-3 sentences max). You are speaking live on a call.
Do NOT be overly helpful. Challenge weak claims. Demand proof. Always stay in character.

Respond with valid JSON containing:
1. `buyer_response`: Your exact dialogue as the buyer.
2. `turn_feedback`: Hidden analysis of how the seller just did (`handled_well`, `comment` string, `weakness_tags` array).
3. `objections_triggered`: Array of objects `{"id": "...", "title": "..."}` for each objection you just raised (use the IDs and titles from the Pre-planned Objections list above)."""


def build_sparring_system_prompt(scenario: dict, profile: dict) -> str:
    """
    Constructs the complete sparring system prompt based on scenario and user profile.
    
    Args:
        scenario: The sales scenario containing client profile, constraints, and objections
        profile: The user's profile containing current level and priority weaknesses
    
    Returns:
        Complete system prompt string for the sparring agent
    """
    persona = scenario.get("client_profile", {}).get("buyer_persona", "Skeptical executive")
    constraints = "\n".join(f"- {c}" for c in scenario.get("buying_constraints", []))
    objections = "\n".join(
        f"- {o['title']}: {o['detail']}" for o in scenario.get("objections", [])
    )

    level = profile.get("current_level", "intermediate")
    attitude = ATTITUDE_LEVELS.get(level, "skeptical")

    priority_weaknesses = profile.get("priority_weaknesses", [])
    focus_instruction = ""
    if priority_weaknesses:
        focus_instruction = f"Push particularly hard on these topics: {', '.join(priority_weaknesses)}"

    return SPARRING_PROMPT.replace("{{persona}}", persona) \
        .replace("{{attitude}}", attitude) \
        .replace("{{constraints}}", constraints) \
        .replace("{{objections}}", objections) \
        .replace("{{focus_instruction}}", focus_instruction)
