"""ScenarioBuilder: generate a full fictional sales scenario using OpenAI."""
from __future__ import annotations
import uuid
from app.core.llm_client import LLMClient
from app.prompts.scenario import SCENARIO_SYSTEM_PROMPT, build_scenario_user_prompt

_llm = LLMClient()


def build_full_scenario(
    client_name: str,
    sector: str,
    requirements: str = "",
) -> dict:
    """
    Generate a complete scenario including client profile, value proposition,
    buying constraints, and 4-5 adversarial objections.
    """
    user_prompt = build_scenario_user_prompt(client_name, sector, requirements)
    data = _llm.generate_json(SCENARIO_SYSTEM_PROMPT, user_prompt)
    scenario_id = f"scenario_{client_name.lower().replace(' ', '_')}_{uuid.uuid4().hex[:8]}"
    data["scenario_id"] = scenario_id
    return data
