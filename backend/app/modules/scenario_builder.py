"""ScenarioBuilder: generate a full fictional sales scenario using OpenAI."""
from __future__ import annotations
import uuid
from app.core.llm_client import LLMClient

_llm = LLMClient()

SYSTEM_PROMPT = """You are a B2B sales training designer. Your job is to generate
realistic fictional client scenarios for sales reps to practise on. Always respond
with valid JSON matching the exact schema requested. Make details specific and
believable — avoid generic placeholders."""


def build_full_scenario(
    client_name: str,
    sector: str,
    requirements: str = "",
) -> dict:
    """
    Generate a complete scenario including client profile, value proposition,
    buying constraints, and 4-5 adversarial objections.
    """
    user_prompt = f"""Generate a complete sales scenario JSON with this structure:
{{
  "client_profile": {{
    "name": "{client_name}",
    "size": "<e.g. 800–1,200 employees>",
    "budget_cycle": "<e.g. Q3 annual review>",
    "decision_timeline": "<e.g. 8–10 weeks>",
    "buyer_persona": "<primary decision-maker role>"
  }},
  "value_proposition": "<2–3 sentence pitch tailored to this client>",
  "buying_constraints": ["<constraint 1>", "<constraint 2>", "<constraint 3>", "<constraint 4>"],
  "objections": [
    {{
      "id": "1",
      "title": "<short objection label>",
      "detail": "<1–2 sentence expansion of why the buyer raises this>",
      "difficulty": "<easy|medium|hard>"
    }}
  ]
}}

Client details:
- Company: {client_name}
- Sector: {sector}
- Requirements / pain points: {requirements or "Not specified — infer from sector"}

Generate 4–5 realistic, adversarial objections. Return ONLY valid JSON."""

    data = _llm.generate_json(SYSTEM_PROMPT, user_prompt)
    scenario_id = f"scenario_{client_name.lower().replace(' ', '_')}_{uuid.uuid4().hex[:8]}"
    data["scenario_id"] = scenario_id
    return data
