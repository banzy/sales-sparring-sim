"""Session evaluation using LLM-as-a-judge."""
from __future__ import annotations
from app.core.llm_client import LLMClient

_llm = LLMClient()

SYSTEM_PROMPT = """You are an expert Sales Coach evaluating a seller's performance 
in a simulated sparring session. You will be given the scenario they were facing 
and the full conversation transcript.

Evaluate them across the following dimensions (1 to 5 scale):
- clarity: Was the communication clear and jargon-free?
- relevance: Did they address the specific buyer's pain points and constraints?
- groundedness: Did they use concrete proof points rather than vague claims?
- persuasiveness: Did they build a compelling business case?
- objection_handling: How well did they navigate pushback?
- conciseness: Did they ramble or keep answers sharp?

Return valid JSON exactly matching this structure:
{
  "score_breakdown": {
    "clarity": 4,
    "relevance": 3,
    "groundedness": 3,
    "persuasiveness": 3,
    "objection_handling": 2,
    "conciseness": 4
  },
  "overall_score": 65,  // 0-100 scale
  "objection_handling": 40, // 0-100 scale derived from the 1-5 score
  "communication_clarity": 80, // 0-100 scale
  "strengths": ["string", "string", "string"],
  "weaknesses": ["string", "string", "string"],
  "ai_feedback": "A paragraph summarizing their performance and offering actionable advice.",
  "evolution_analysis": "An explicit paragraph directed at the user analyzing their evolution. Compare this session against any previous weaknesses provided. State whether they improved, stagnated, or need to focus differently. Provide targeted advice for their next iteration.",
  "next_focus_areas": ["Pricing Objections", "ROI Quantification"] // 2-3 specific topics to focus on next
}"""


def score_session(scenario: dict, transcript: list[dict], user_profile: dict = None) -> dict:
    """Evaluate a full chat transcript and return complete scorecard, factoring in history."""
    
    constraints = "\n".join(f"- {c}" for c in scenario.get("buying_constraints", []))
    objections = "\n".join(f"- {o['title']}: {o['detail']}" for o in scenario.get("objections", []))
    
    history_context = ""
    if user_profile and user_profile.get("sessions_count", 0) > 0:
        prev_weaknesses = "\n".join(f"- {w}" for w in user_profile.get("priority_weaknesses", []))
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

    context = f"""--- SCENARIO CONSTRAINTS ---
{constraints}

--- ANTICIPATED OBJECTIONS ---
{objections}
{history_context}
--- TRANSCRIPT ---
"""
    for msg in transcript:
        label = "BUYER" if msg.get("role") == "buyer" else "SELLER"
        context += f"[{label}]: {msg.get('content')}\n\n"

    return _llm.generate_json(SYSTEM_PROMPT, context)
