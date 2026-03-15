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

Deal context (use this to sound realistic):
- Value proposition they are selling: {{value_proposition}}
- Our budget cycle: {{budget_cycle}}
- Our decision timeline: {{decision_timeline}}

Your Buying Constraints:
{{constraints}}

Your Pre-planned Objections:
{{objections}}

{{seller_background}}

{{tested_objections_instruction}}

{{focus_instruction}}

Keep your responses conversational but short (1-3 sentences max). You are speaking live on a call.
Do NOT be overly helpful. Challenge weak claims. Demand proof. Always stay in character.

Respond with valid JSON containing:
1. `buyer_response`: Your exact dialogue as the buyer.
2. `turn_feedback`: Hidden analysis of how the seller just did (`handled_well`, `comment` string, `weakness_tags` array).
3. `objections_triggered`: Array of objects `{"id": "...", "title": "..."}` for each objection you just raised (use the IDs and titles from the Pre-planned Objections list above)."""


def build_sparring_system_prompt(
    scenario: dict,
    profile: dict,
    tested_objection_ids: list[str] | None = None,
    rag_context: dict[str, str] | None = None,
) -> str:
    """
    Constructs the complete sparring system prompt. When rag_context is provided,
    persona/deal/constraints/seller background use RAG-retrieved text; otherwise
    fall back to full scenario + profile.
    """
    level = profile.get("current_level", "intermediate")
    attitude = ATTITUDE_LEVELS.get(level, "skeptical")
    sessions_count = profile.get("sessions_count", 0)
    priority_weaknesses = profile.get("priority_weaknesses", [])
    weakness_line = ", ".join(priority_weaknesses) if priority_weaknesses else "None noted yet."

    # Pre-planned objections: always from scenario so LLM can output valid ids/titles
    objections = "\n".join(
        f"- {o['title']} (id: {o.get('id', '')}): {o['detail']}" for o in scenario.get("objections", [])
    )

    use_rag = rag_context and any(rag_context.values())

    if use_rag:
        company_ctx = (rag_context.get("company_ctx") or "").strip()
        constraint_ctx = (rag_context.get("constraint_ctx") or "").strip()
        feedback_ctx = (rag_context.get("feedback_ctx") or "").strip()
        progress_ctx = (rag_context.get("progress_ctx") or "").strip()

        persona = company_ctx or scenario.get("client_profile", {}).get("buyer_persona", "Skeptical executive")
        value_proposition = company_ctx if company_ctx else scenario.get("value_proposition", "Not specified")
        budget_cycle = scenario.get("client_profile", {}).get("budget_cycle", "Not specified")
        decision_timeline = scenario.get("client_profile", {}).get("decision_timeline", "Not specified")
        constraints = constraint_ctx if constraint_ctx else "\n".join(
            f"- {c}" for c in scenario.get("buying_constraints", [])
        )
        seller_background = (
            f"The seller has completed {sessions_count} session(s) with you. "
            f"Current difficulty: {level}. Their main weaknesses from past feedback: {weakness_line}"
        )
        if feedback_ctx or progress_ctx:
            seller_background += "\n\nPast session feedback and progress:\n" + "\n\n".join(
                s for s in (feedback_ctx, progress_ctx) if s
            )
    else:
        client_profile = scenario.get("client_profile", {})
        persona = client_profile.get("buyer_persona", "Skeptical executive")
        value_proposition = scenario.get("value_proposition", "Not specified")
        budget_cycle = client_profile.get("budget_cycle", "Not specified")
        decision_timeline = client_profile.get("decision_timeline", "Not specified")
        constraints = "\n".join(f"- {c}" for c in scenario.get("buying_constraints", []))
        seller_background = (
            f"The seller has completed {sessions_count} session(s) with you. "
            f"Current difficulty: {level}. Their main weaknesses from past feedback: {weakness_line}"
        )

    tested_ids = tested_objection_ids or []
    if tested_ids:
        objections_by_id = {str(o.get("id")): o.get("title", "") for o in scenario.get("objections", []) if o.get("id")}
        tested_titles = [objections_by_id.get(oid, oid) for oid in tested_ids if oid]
        tested_objections_instruction = (
            f"Objections already raised (this or past sessions): {', '.join(tested_titles) or 'none'}.\n"
            "Prefer raising objections not yet tested. You may re-raise one of these if the seller handled it poorly."
        )
    else:
        tested_objections_instruction = "No objections have been raised yet in this or past sessions."

    focus_instruction = ""
    if priority_weaknesses:
        focus_instruction = f"Push particularly hard on these topics: {', '.join(priority_weaknesses)}"

    return (
        SPARRING_PROMPT.replace("{{persona}}", persona)
        .replace("{{attitude}}", attitude)
        .replace("{{value_proposition}}", value_proposition)
        .replace("{{budget_cycle}}", budget_cycle)
        .replace("{{decision_timeline}}", decision_timeline)
        .replace("{{constraints}}", constraints)
        .replace("{{objections}}", objections)
        .replace("{{seller_background}}", seller_background)
        .replace("{{tested_objections_instruction}}", tested_objections_instruction)
        .replace("{{focus_instruction}}", focus_instruction)
    )
