"""
Evaluation Agent Prompts.

This module defines the prompts for the Sales Coach evaluation agent.
The coach evaluates seller performance using LLM-as-a-judge methodology,
providing scores, feedback, and evolution analysis.
"""

from __future__ import annotations

# Evaluation dimensions with descriptions
EVALUATION_DIMENSIONS = {
    "clarity": "Was the communication clear and jargon-free?",
    "relevance": "Did they address the specific buyer's pain points and constraints?",
    "groundedness": "Did they use concrete proof points rather than vague claims?",
    "persuasiveness": "Did they build a compelling business case?",
    "objection_handling": "How well did they navigate pushback?",
    "conciseness": "Did they ramble or keep answers sharp?",
}

EVALUATION_SYSTEM_PROMPT = """You are an expert Sales Coach evaluating a seller's performance 
in a simulated sparring session. You will be given the scenario they were facing 
and the full conversation transcript.

Evaluate them across the following dimensions (1 to 10 scale):
- clarity: Was the communication clear and jargon-free?
- relevance: Did they address the specific buyer's pain points and constraints?
- groundedness: Did they use concrete proof points rather than vague claims?
- persuasiveness: Did they build a compelling business case?
- objection_handling: How well did they navigate pushback?
- conciseness: Did they ramble or keep answers sharp?

Return valid JSON exactly matching this structure:
{
  "score_breakdown": {
    "clarity": 8,
    "relevance": 7,
    "groundedness": 6,
    "persuasiveness": 7,
    "objection_handling": 5,
    "conciseness": 8
  },
  "overall_score": 65,  // 0-100 scale
  "objection_handling": 50, // 0-100 scale derived from the 1-10 score (multiply by 10)
  "communication_clarity": 80, // 0-100 scale derived from clarity score (multiply by 10)
  "clarity": 80,         // 0-100 scale (score_breakdown.clarity * 10)
  "relevance": 70,       // 0-100 scale (score_breakdown.relevance * 10)
  "groundedness": 60,    // 0-100 scale (score_breakdown.groundedness * 10)
  "strengths": ["string", "string", "string"],
  "weaknesses": ["string", "string", "string"],
  "ai_feedback": "A paragraph summarizing their performance and offering actionable advice.",
  "evolution_analysis": "An explicit paragraph directed at the user analyzing their evolution. Compare this session against any previous weaknesses provided. State whether they improved, stagnated, or need to focus differently. Provide targeted advice for their next iteration.",
  "next_focus_areas": ["Pricing Objections", "ROI Quantification"] // 2-3 specific topics to focus on next
}"""


def build_evaluation_context(
    scenario: dict,
    transcript: list[dict],
    user_profile: dict | None = None,
) -> str:
    """
    Builds the user prompt context for evaluation.
    
    Args:
        scenario: The sales scenario with constraints and objections
        transcript: List of conversation messages
        user_profile: Optional user profile with historical data
    
    Returns:
        Formatted context string for the evaluation agent
    """
    constraints = "\n".join(f"- {c}" for c in scenario.get("buying_constraints", []))
    objections = "\n".join(
        f"- {o['title']}: {o['detail']}" for o in scenario.get("objections", [])
    )

    # Build historical context
    if user_profile and user_profile.get("sessions_count", 0) > 0:
        prev_weaknesses = "\n".join(
            f"- {w}" for w in user_profile.get("priority_weaknesses", [])
        )
        if prev_weaknesses:
            history_context = f"""
--- HISTORICAL CONTEXT (Past Weaknesses) ---
The seller has completed {user_profile.get("sessions_count")} previous sessions.
Their main priority weaknesses from the last session were:
{prev_weaknesses}
Pay close attention to whether they have explicitly improved on these weaknesses in this transcript.
"""
        else:
            history_context = f"""
--- HISTORICAL CONTEXT ---
The seller has completed {user_profile.get("sessions_count")} previous sessions.
"""
    else:
        history_context = """
--- HISTORICAL CONTEXT ---
This is the seller's first session. Welcome them and give baseline advice for future evolution.
"""

    # Build transcript
    transcript_text = ""
    for msg in transcript:
        label = "BUYER" if msg.get("role") == "buyer" else "SELLER"
        transcript_text += f"[{label}]: {msg.get('content')}\n\n"

    return f"""--- SCENARIO CONSTRAINTS ---
{constraints}

--- ANTICIPATED OBJECTIONS ---
{objections}
{history_context}
--- TRANSCRIPT ---
{transcript_text}"""
