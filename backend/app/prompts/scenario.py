"""
Scenario builder prompts loaded from repository-level prompt files.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

PROMPTS_DIR = Path(__file__).resolve().parents[3] / "prompts"


@lru_cache()
def _load_prompt(filename: str) -> str:
    path = PROMPTS_DIR / filename
    return path.read_text(encoding="utf-8").strip()


def _render_prompt(filename: str, replacements: dict[str, str]) -> str:
    prompt = _load_prompt(filename)
    for key, value in replacements.items():
        prompt = prompt.replace(f"{{{{{key}}}}}", value)
    return prompt


def get_client_research_system_prompt() -> str:
    return _load_prompt("perplexity_client_research_system.md")


def build_client_research_user_prompt(
    client_name: str,
    sector: str,
    requirements: str = "",
) -> str:
    return _render_prompt(
        "perplexity_client_research_user.md",
        {
            "client_name": client_name,
            "sector": sector or "Unknown",
            "requirements": requirements or "Not specified",
        },
    )


def get_scenario_system_prompt() -> str:
    return _load_prompt("openai_scenario_synthesis_system.md")


def build_scenario_user_prompt(
    client_name: str,
    sector: str,
    requirements: str = "",
    client_research: dict[str, Any] | None = None,
) -> str:
    research_json = json.dumps(client_research or {}, indent=2, ensure_ascii=True)
    return _render_prompt(
        "openai_scenario_synthesis_user.md",
        {
            "client_name": client_name,
            "sector": sector or "Unknown",
            "requirements": requirements or "Not specified",
            "client_research_json": research_json,
        },
    )


# Backward-compatible exports for older imports via app.prompts.__init__.
SCENARIO_SYSTEM_PROMPT = get_scenario_system_prompt()
