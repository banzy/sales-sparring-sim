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


def _resolve_generation_context(scenario: dict) -> tuple[str, str, str]:
    generation_context = scenario.get("generation_context") or {}
    client_profile = scenario.get("client_profile") or {}

    client_name = str(
        generation_context.get("client_name")
        or client_profile.get("name")
        or ""
    ).strip()
    sector = str(generation_context.get("sector") or "").strip()
    requirements = str(generation_context.get("requirements") or "").strip()

    if not client_name:
        raise ValueError("Scenario is missing a client name, so client research cannot be requested.")

    return client_name, sector, requirements


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
    data["generation_context"] = {
        "client_name": client_name,
        "sector": sector,
        "requirements": requirements,
    }
    return data


def refresh_client_research_for_scenario(scenario: dict) -> dict:
    """Refresh Perplexity company research for an existing scenario."""
    client_name, sector, requirements = _resolve_generation_context(scenario)
    refreshed_research = build_client_research(client_name, sector, requirements)

    updated_scenario = dict(scenario)
    updated_scenario["client_research"] = refreshed_research
    updated_scenario["generation_context"] = {
        "client_name": client_name,
        "sector": sector,
        "requirements": requirements,
    }
    return updated_scenario
