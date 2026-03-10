"""
Scenario Builder Agent Prompts.

This module defines the prompts for generating B2B sales training scenarios.
The scenario builder creates realistic fictional client scenarios including
profiles, constraints, and adversarial objections.
"""

from __future__ import annotations

SCENARIO_SYSTEM_PROMPT = """You are a B2B sales training designer. Your job is to generate
realistic fictional client scenarios for sales reps to practise on. Always respond
with valid JSON matching the exact schema requested. Make details specific and
believable — avoid generic placeholders."""

# JSON schema template for scenario generation
SCENARIO_SCHEMA = """{
  "client_profile": {
    "name": "<company name>",
    "size": "<e.g. 800–1,200 employees>",
    "budget_cycle": "<e.g. Q3 annual review>",
    "decision_timeline": "<e.g. 8–10 weeks>",
    "buyer_persona": "<primary decision-maker role>"
  },
  "value_proposition": "<2–3 sentence pitch tailored to this client>",
  "buying_constraints": ["<constraint 1>", "<constraint 2>", "<constraint 3>", "<constraint 4>"],
  "objections": [
    {
      "id": "1",
      "title": "<short objection label>",
      "detail": "<1–2 sentence expansion of why the buyer raises this>",
      "difficulty": "<easy|medium|hard>"
    }
  ]
}"""


def build_scenario_user_prompt(
    client_name: str,
    sector: str,
    requirements: str = "",
) -> str:
    """
    Builds the user prompt for scenario generation.
    
    Args:
        client_name: Name of the fictional client company
        sector: Industry sector of the client
        requirements: Optional specific requirements or pain points
    
    Returns:
        Formatted user prompt for the scenario builder agent
    """
    return f"""Generate a complete sales scenario JSON with this structure:
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
