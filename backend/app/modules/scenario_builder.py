"""ScenarioBuilder: research target accounts with Perplexity, then synthesize a scenario with OpenAI."""
from __future__ import annotations

import re
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


def _build_scenario_id(client_name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "_", client_name.lower()).strip("_") or "client"
    return f"scenario_{slug}_{uuid.uuid4().hex[:8]}"


def _normalize_generated_scenario(
    data: dict,
    *,
    client_name: str,
    sector: str,
    requirements: str,
    buyer_persona: str = "",
    client_research: dict | None = None,
) -> dict:
    scenario = dict(data)
    client_profile = dict(scenario.get("client_profile") or {})
    normalized_name = client_name.strip()
    normalized_sector = sector.strip()
    normalized_requirements = requirements.strip()
    normalized_persona = buyer_persona.strip()

    # The generated scenario must preserve the user's requested project identity.
    client_profile["name"] = normalized_name
    if normalized_persona:
        client_profile["buyer_persona"] = normalized_persona

    scenario["client_profile"] = client_profile
    scenario["scenario_id"] = _build_scenario_id(normalized_name)
    scenario["client_research"] = client_research or {}
    scenario["generation_context"] = {
        "client_name": normalized_name,
        "sector": normalized_sector,
        "requirements": normalized_requirements,
        "buyer_persona": normalized_persona,
    }
    return scenario


def build_full_scenario(
    client_name: str,
    sector: str,
    requirements: str = "",
    buyer_persona: str = "",
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
        buyer_persona,
        client_research=client_research,
    )
    data = scenario_llm.generate_json(get_scenario_system_prompt(), user_prompt)
    return _normalize_generated_scenario(
        data,
        client_name=client_name,
        sector=sector,
        requirements=requirements,
        buyer_persona=buyer_persona,
        client_research=client_research,
    )


def refresh_client_research_for_scenario(scenario: dict) -> dict:
    """Refresh Perplexity company research for an existing scenario."""
    client_name, sector, requirements = _resolve_generation_context(scenario)
    refreshed_research = build_client_research(client_name, sector, requirements)
    buyer_persona = str(
        (scenario.get("generation_context") or {}).get("buyer_persona")
        or (scenario.get("client_profile") or {}).get("buyer_persona")
        or ""
    ).strip()

    updated_scenario = dict(scenario)
    updated_scenario["client_research"] = refreshed_research
    updated_scenario["generation_context"] = {
        "client_name": client_name,
        "sector": sector,
        "requirements": requirements,
        "buyer_persona": buyer_persona,
    }
    return updated_scenario
