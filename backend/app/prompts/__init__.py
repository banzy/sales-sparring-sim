"""
AI Agent Prompts for Sales Sparring Simulator.

This module contains all prompt templates used by the AI agents in the application.
Prompts are organized by agent type:
- sparring: Adversarial B2B buyer simulation
- evaluation: Sales coach evaluation (LLM-as-judge)
- scenario: Scenario generation for training
"""

from app.prompts.sparring import SPARRING_PROMPT, build_sparring_system_prompt
from app.prompts.evaluation import EVALUATION_SYSTEM_PROMPT
from app.prompts.scenario import SCENARIO_SYSTEM_PROMPT, build_scenario_user_prompt

__all__ = [
    "SPARRING_PROMPT",
    "build_sparring_system_prompt",
    "EVALUATION_SYSTEM_PROMPT",
    "SCENARIO_SYSTEM_PROMPT",
    "build_scenario_user_prompt",
]
