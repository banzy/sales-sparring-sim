"""
Knowledge Indexer: embeds project knowledge into Qdrant for RAG retrieval.

This module turns structured data (scenarios, evaluation scorecards, coaching
advice) into searchable vector chunks so the suggestion engine can retrieve
all context via semantic search instead of injecting raw text into the prompt.

Chunk types (stored in the 'doc_type' payload field):
  - 'scenario_profile'   : company name, size, sector, buyer persona
  - 'scenario_objection' : each anticipated objection with full detail
  - 'scenario_constraint': each buying constraint
  - 'session_feedback'   : per-session strengths, weaknesses, AI feedback
  - 'learning_progress'  : aggregated trend, focus areas, advisory from coach
"""
from __future__ import annotations

import logging
from datetime import datetime

from app.core.llm_client import LLMClient
from app.storage.vector_store import ensure_collection, index_chunks

logger = logging.getLogger(__name__)
_llm = LLMClient()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _embed_and_index(chunks: list[dict]) -> None:
    """Embed text fields and push to Qdrant."""
    if not chunks:
        return
    ensure_collection()
    texts = [c["text"] for c in chunks]
    embeddings = _llm.embed(texts)
    for chunk, emb in zip(chunks, embeddings):
        chunk["embedding"] = emb
    index_chunks(chunks)


# ---------------------------------------------------------------------------
# Scenario indexing
# ---------------------------------------------------------------------------

def index_scenario(project_id: str, scenario: dict) -> None:
    """
    Embed and store all facets of a scenario into Qdrant.

    Call this whenever a scenario is saved or updated so future RAG lookups
    can retrieve client profile, objections, and constraints semantically.
    """
    try:
        client_profile = scenario.get("client_profile", {})
        client_name = client_profile.get("name", "Unknown")
        generation_context = scenario.get("generation_context", {})
        sector = generation_context.get("sector", "")
        buyer_persona = client_profile.get("buyer_persona", "") or generation_context.get("buyer_persona", "")
        requirements = generation_context.get("requirements", "")
        value_prop = scenario.get("value_proposition", "")

        chunks: list[dict] = []

        # 1. Company & sector profile
        profile_text = (
            f"Client: {client_name}\n"
            f"Size: {client_profile.get('size', '')}\n"
            f"Sector: {sector}\n"
            f"Buyer Persona: {buyer_persona}\n"
            f"Budget Cycle: {client_profile.get('budget_cycle', '')}\n"
            f"Decision Timeline: {client_profile.get('decision_timeline', '')}\n"
            f"Requirements / Pain Points: {requirements}\n"
            f"Value Proposition: {value_prop}"
        )
        chunks.append({
            "text": profile_text,
            "metadata": {
                "project_id": project_id,
                "doc_type": "scenario_profile",
                "client_name": client_name,
                "sector": sector,
            },
        })

        # 2. Client research (if available)
        research = scenario.get("client_research") or {}
        if research.get("summary"):
            research_text = (
                f"Client Research for {client_name}:\n"
                f"Summary: {research['summary']}\n"
            )
            if research.get("key_facts"):
                research_text += "Key Facts:\n" + "\n".join(f"- {f}" for f in research["key_facts"]) + "\n"
            if research.get("strategic_priorities"):
                research_text += "Strategic Priorities:\n" + "\n".join(f"- {p}" for p in research["strategic_priorities"]) + "\n"
            if research.get("potential_pain_points"):
                research_text += "Pain Points:\n" + "\n".join(f"- {p}" for p in research["potential_pain_points"])
            chunks.append({
                "text": research_text,
                "metadata": {
                    "project_id": project_id,
                    "doc_type": "scenario_profile",
                    "client_name": client_name,
                    "title": f"{client_name} - Client Research",
                },
            })

        # 3. Each objection as an individual chunk (richer retrieval)
        for obj in scenario.get("objections", []):
            chunks.append({
                "text": (
                    f"Objection – {obj.get('title', 'Unknown')}:\n"
                    f"{obj.get('detail', '')}"
                ),
                "metadata": {
                    "project_id": project_id,
                    "doc_type": "scenario_objection",
                    "objection_id": obj.get("id", ""),
                    "title": obj.get("title", ""),
                },
            })

        # 4. Buying constraints as one chunk
        constraints = scenario.get("buying_constraints", [])
        if constraints:
            chunks.append({
                "text": "Buying Constraints:\n" + "\n".join(f"- {c}" for c in constraints),
                "metadata": {
                    "project_id": project_id,
                    "doc_type": "scenario_constraint",
                    "client_name": client_name,
                },
            })

        _embed_and_index(chunks)
        logger.info("Indexed scenario knowledge for project %s (%d chunks)", project_id, len(chunks))

    except Exception:
        logger.warning("Failed to index scenario knowledge for %s", project_id, exc_info=True)


# ---------------------------------------------------------------------------
# Session evaluation indexing
# ---------------------------------------------------------------------------

def index_session_evaluation(
    project_id: str,
    session_id: str,
    session_number: int,
    eval_result: dict,
) -> None:
    """
    Embed and store a session evaluation scorecard into Qdrant.

    Call this after every completed evaluation so the suggestion engine can
    retrieve past coaching advice, strengths, and weaknesses semantically.
    """
    try:
        overall_score = eval_result.get("overall_score", 0)
        objection_score = eval_result.get("objection_handling", 0)
        clarity_score = eval_result.get("communication_clarity", 0)
        strengths = eval_result.get("strengths", [])
        weaknesses = eval_result.get("weaknesses", [])
        ai_feedback = eval_result.get("ai_feedback", "")
        evolution_analysis = eval_result.get("evolution_analysis", "")
        focus_areas = eval_result.get("next_focus_areas", [])
        timestamp = datetime.utcnow().isoformat()

        chunks: list[dict] = []

        # 1. Session feedback chunk (strengths + weaknesses + scores)
        feedback_text = (
            f"Session {session_number} Evaluation (Score: {overall_score}/100):\n"
            f"Objection Handling: {objection_score}/100 | Clarity: {clarity_score}/100\n\n"
            f"Strengths:\n" + "\n".join(f"- {s}" for s in strengths) + "\n\n"
            f"Weaknesses:\n" + "\n".join(f"- {w}" for w in weaknesses)
        )
        chunks.append({
            "text": feedback_text,
            "metadata": {
                "project_id": project_id,
                "doc_type": "session_feedback",
                "session_id": session_id,
                "session_number": session_number,
                "overall_score": overall_score,
                "timestamp": timestamp,
            },
        })

        # 2. Coach AI feedback + evolution analysis
        if ai_feedback or evolution_analysis:
            coaching_text = ""
            if ai_feedback:
                coaching_text += f"Coach Feedback (Session {session_number}):\n{ai_feedback}\n\n"
            if evolution_analysis:
                coaching_text += f"Evolution Analysis:\n{evolution_analysis}"
            chunks.append({
                "text": coaching_text.strip(),
                "metadata": {
                    "project_id": project_id,
                    "doc_type": "session_feedback",
                    "session_id": session_id,
                    "session_number": session_number,
                    "title": f"Session {session_number} – Coach Feedback",
                    "timestamp": timestamp,
                },
            })

        # 3. Learning progress chunk: focus areas + trajectory
        if focus_areas or weaknesses:
            progress_text = (
                f"Learning Progress after Session {session_number}:\n"
                f"Current Score: {overall_score}/100\n"
            )
            if focus_areas:
                progress_text += "\nRecommended Focus Areas:\n" + "\n".join(f"- {a}" for a in focus_areas)
            if weaknesses:
                progress_text += "\nPriority Weaknesses to Address:\n" + "\n".join(f"- {w}" for w in weaknesses[:3])
            chunks.append({
                "text": progress_text,
                "metadata": {
                    "project_id": project_id,
                    "doc_type": "learning_progress",
                    "session_id": session_id,
                    "session_number": session_number,
                    "timestamp": timestamp,
                },
            })

        _embed_and_index(chunks)
        logger.info(
            "Indexed evaluation for session %s (project %s, %d chunks)",
            session_id, project_id, len(chunks),
        )

    except Exception:
        logger.warning(
            "Failed to index evaluation knowledge for session %s", session_id, exc_info=True
        )
