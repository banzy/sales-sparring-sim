"""ScenarioBuilder: research target accounts with Perplexity, then synthesize a scenario with OpenAI."""
from __future__ import annotations

import uuid

from app.core.llm_client import LLMClient
from app.prompts.scenario import (
    build_client_research_user_prompt,
    build_scenario_user_prompt,
    get_client_research_system_prompt,
    get_scenario_system_prompt,
)


def build_client_research(
    client_name: str,
    sector: str,
    requirements: str = "",
) -> dict:
    """Research the target client with Perplexity before scenario synthesis."""
    research_llm = LLMClient(provider="perplexity")
    user_prompt = build_client_research_user_prompt(client_name, sector, requirements)
    return research_llm.generate_json(get_client_research_system_prompt(), user_prompt)


def build_full_scenario(
    client_name: str,
    sector: str,
    requirements: str = "",
) -> dict:
    """
    Generate a complete scenario including client profile, client research,
    value proposition, buying constraints, and adversarial objections.
    """
    client_research = build_client_research(client_name, sector, requirements)
    scenario_llm = LLMClient(provider="openai")
    user_prompt = build_scenario_user_prompt(
        client_name,
        sector,
        requirements,
        client_research=client_research,
    )
    data = scenario_llm.generate_json(get_scenario_system_prompt(), user_prompt)
    scenario_id = f"scenario_{client_name.lower().replace(' ', '_')}_{uuid.uuid4().hex[:8]}"
    data["scenario_id"] = scenario_id
    data["client_research"] = client_research
    return data
