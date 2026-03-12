"""Generates contextual seller response suggestions using RAG + session history."""
from __future__ import annotations

import logging

from app.core.llm_client import LLMClient
from app.modules import rag_retriever
from app.prompts.suggestion import SUGGESTION_SYSTEM_PROMPT, build_suggestion_context
from app.storage import session_store

logger = logging.getLogger(__name__)

_llm = LLMClient()


def _build_past_sessions_summary(project_id: str) -> str:
    """Summarise past session evaluations into a concise text block for the LLM."""
    sessions = session_store.get_all_sessions(project_id)

    # Only keep scored sessions (most recent first, already sorted by store)
    scored = [s for s in sessions if s.get("overall_score") is not None]

    if not scored:
        return "No past sessions available. This is the learner's first session."

    parts: list[str] = []
    # Show up to 5 most recent evaluated sessions
    for i, session in enumerate(scored[:5], 1):
        strengths = ", ".join(session.get("strengths", [])[:3]) or "N/A"
        weaknesses = ", ".join(session.get("weaknesses", [])[:3]) or "N/A"
        parts.append(
            f"Session {i} (Score: {session['overall_score']}/100, "
            f"Objection Handling: {session.get('objection_handling', 'N/A')}/100):\n"
            f"  Strengths: {strengths}\n"
            f"  Weaknesses: {weaknesses}"
        )

    evolution_note = ""
    if len(scored) >= 2:
        latest_score = scored[0]["overall_score"]
        previous_score = scored[1]["overall_score"]
        if latest_score > previous_score:
            evolution_note = f"\nTrend: Improving (+{latest_score - previous_score} points from previous session)"
        elif latest_score < previous_score:
            evolution_note = f"\nTrend: Declining ({latest_score - previous_score} points from previous session)"
        else:
            evolution_note = "\nTrend: Stable (same score as previous session)"

    return "\n\n".join(parts) + evolution_note


def suggest_response(
    scenario_id: str,
    project_id: str,
    conversation_history: list[dict],
) -> str:
    """
    Generate an AI-suggested seller response grounded in full context.

    Pulls together:
      1. The scenario definition (constraints, objections, client profile)
      2. RAG context from uploaded knowledge documents
      3. Past session performance data and evolution
      4. The learner's profile (level, weaknesses)
      5. The current conversation transcript

    Returns:
        The suggested seller response as plain text.
    """
    # 1. Load scenario
    scenario = session_store.get_scenario(scenario_id)
    if not scenario:
        raise ValueError(f"Scenario {scenario_id} not found")

    # 2. Load learner profile
    profile = session_store.get_project_profile(project_id)

    # 3. Build RAG context from the last buyer message
    last_buyer_msg = ""
    for msg in reversed(conversation_history):
        if msg.get("role") == "buyer":
            last_buyer_msg = msg.get("content", "")
            break

    rag_chunks = []
    rag_formatted = "No knowledge base documents uploaded for this project."
    if last_buyer_msg:
        try:
            rag_chunks = rag_retriever.build_context_for_scenario(scenario, last_buyer_msg)
            rag_formatted = rag_retriever.format_context(rag_chunks)
        except Exception:
            logger.warning("RAG retrieval failed, proceeding without vector context", exc_info=True)

    # 4. Build past-sessions summary
    past_summary = _build_past_sessions_summary(project_id)

    # 5. Assemble the full prompt context
    context = build_suggestion_context(
        scenario=scenario,
        conversation_history=conversation_history,
        rag_context=rag_formatted,
        past_sessions_summary=past_summary,
        user_profile=profile,
    )

    # 6. Call LLM
    result = _llm.generate_json(SUGGESTION_SYSTEM_PROMPT, context)

    return result.get("suggestion", "I'd love to explore how we can address your specific concerns.")
