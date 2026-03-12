"""
Suggestion Agent Prompts.

This module defines the prompts for the AI Response Helper that generates
contextual seller response suggestions during sparring sessions. The suggestion
draws from RAG knowledge, past session performance, learner profile, and the
current conversation to craft the ideal next response.
"""

from __future__ import annotations


SUGGESTION_SYSTEM_PROMPT = """You are an expert Sales Coach helping a seller craft the ideal response
during a live simulated sales call. You have deep knowledge of B2B sales methodology,
objection handling, and persuasion techniques.

Your task: Generate a single, realistic seller response that the trainee can use in the conversation.

Rules:
- The response MUST be conversational and natural (1-4 sentences), as if spoken on a live call.
- Address the buyer's last statement/question directly.
- Apply insights from past session feedback: reinforce strengths and actively correct past weaknesses.
- Use concrete facts from the knowledge base when available (never invent data).
- Match the complexity to the seller's current skill level.
- Do NOT explain your reasoning. Output ONLY the seller's next dialogue line.

Respond with valid JSON:
{
  "suggestion": "Your suggested seller response here"
}"""


def build_suggestion_context(
    scenario: dict,
    conversation_history: list[dict],
    rag_context: str,
    past_sessions_summary: str,
    user_profile: dict,
) -> str:
    """
    Assemble the full user prompt context for the suggestion LLM call.

    Args:
        scenario: The active sales scenario (constraints, objections, client profile)
        conversation_history: The current sparring session's messages
        rag_context: Formatted RAG chunks from the vector store
        past_sessions_summary: Human-readable summary of past session evaluations
        user_profile: The learner's profile (level, weaknesses, session count)

    Returns:
        Formatted context string for the suggestion agent
    """
    # Scenario context
    client_name = scenario.get("client_profile", {}).get("name", "the client")
    persona = scenario.get("client_profile", {}).get("buyer_persona", "Unknown")
    constraints = "\n".join(f"- {c}" for c in scenario.get("buying_constraints", []))
    objections = "\n".join(
        f"- {o['title']}: {o['detail']}" for o in scenario.get("objections", [])
    )

    # Learner context
    level = user_profile.get("current_level", "intermediate")
    sessions_count = user_profile.get("sessions_count", 0)
    priority_weaknesses = user_profile.get("priority_weaknesses", [])
    weakness_text = ", ".join(priority_weaknesses) if priority_weaknesses else "None identified yet"

    # Current conversation
    transcript_text = ""
    for msg in conversation_history:
        label = "BUYER" if msg.get("role") == "buyer" else "SELLER"
        transcript_text += f"[{label}]: {msg.get('content')}\n\n"

    return f"""--- CLIENT & SCENARIO ---
Client: {client_name}
Buyer Persona: {persona}
Constraints:
{constraints}

Anticipated Objections:
{objections}

--- KNOWLEDGE BASE (RAG Context) ---
{rag_context}

--- LEARNER PROFILE ---
Skill Level: {level}
Sessions Completed: {sessions_count}
Priority Weaknesses to Address: {weakness_text}

--- PAST SESSION INSIGHTS ---
{past_sessions_summary}

--- CURRENT CONVERSATION ---
{transcript_text}
[Generate the ideal SELLER response for this moment in the conversation]"""
