"""
Suggestion Agent Prompts.

This module defines the prompts for the AI Response Helper. The suggestion
draws on RAG-retrieved knowledge chunks across multiple dimensions:
- scenario_profile   : company, sector, buyer persona
- scenario_objection : pre-planned objections
- scenario_constraint: buying constraints
- session_feedback   : past session strengths, weaknesses, coach advice
- learning_progress  : trend, focus areas, evolution
- uploaded docs      : project knowledge documents
"""

from __future__ import annotations


SUGGESTION_SYSTEM_PROMPT = """You are an expert Sales Coach helping a seller craft the ideal response
during a live simulated sales call. You have deep knowledge of B2B sales methodology,
objection handling, and persuasion techniques.

Your task: Generate a single, realistic seller response that the trainee can use right now.

Rules:
- The response MUST be conversational and natural (1-4 sentences), as if spoken live on a call.
- Address the buyer's latest statement/objection directly.
- Apply insights from the learner's past session feedback: reinforce strengths, actively correct weaknesses.
- Use concrete facts from the knowledge base when available (never invent statistics).
- The suggestion reflects the seller's current skill evolution and trajectory.
- Do NOT explain your reasoning. Output ONLY the seller's next dialogue line.

Respond with valid JSON:
{
  "suggestion": "Your suggested seller response here"
}"""


def build_suggestion_context(
    scenario: dict,
    conversation_history: list[dict],
    rag_context: dict,
    past_sessions_summary: str = "",  # kept for backward compat, now empty
    user_profile: dict | None = None,  # kept for backward compat, now empty
) -> str:
    """
    Assemble the full user prompt context using RAG-retrieved knowledge chunks.

    Args:
        scenario: The active sales scenario (used for structural labels only)
        conversation_history: Messages from the current sparring session
        rag_context: Dict of RAG-retrieved text blocks keyed by knowledge type.
                     Expected keys: company_ctx, objection_ctx, constraint_ctx,
                                    feedback_ctx, progress_ctx, docs_ctx
        past_sessions_summary: Deprecated — now retrieved via RAG
        user_profile: Deprecated — now retrieved via RAG
    """
    # Company & scenario context
    company_ctx    = rag_context.get("company_ctx", "") or "Not available."
    objection_ctx  = rag_context.get("objection_ctx", "") or "Not available."
    constraint_ctx = rag_context.get("constraint_ctx", "") or "Not available."

    # Learner journey context
    feedback_ctx   = rag_context.get("feedback_ctx", "") or "No past session evaluations found."
    progress_ctx   = rag_context.get("progress_ctx", "") or "No learning progress recorded yet."

    # Uploaded project knowledge
    docs_ctx       = rag_context.get("docs_ctx", "") or "No knowledge base documents uploaded."

    # Current conversation
    transcript_text = "\n\n".join(
        f"[{'BUYER' if m.get('role') == 'buyer' else 'SELLER'}]: {m.get('content', '')}"
        for m in conversation_history
    )

    return f"""--- CLIENT & COMPANY PROFILE (from knowledge base) ---
{company_ctx}

--- RELEVANT OBJECTIONS (from knowledge base) ---
{objection_ctx}

--- BUYING CONSTRAINTS (from knowledge base) ---
{constraint_ctx}

--- PRODUCT / COMPANY KNOWLEDGE DOCUMENTS ---
{docs_ctx}

--- PAST SESSION COACHING FEEDBACK ---
{feedback_ctx}

--- LEARNING PROGRESS & EVOLUTION ---
{progress_ctx}

--- CURRENT LIVE CONVERSATION ---
{transcript_text}

[Generate the ideal SELLER response for this moment in the conversation]"""
