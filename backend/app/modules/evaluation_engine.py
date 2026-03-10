"""Session evaluation using LLM-as-a-judge."""
from __future__ import annotations
from app.core.llm_client import LLMClient
from app.prompts.evaluation import EVALUATION_SYSTEM_PROMPT, build_evaluation_context

_llm = LLMClient()


def score_session(scenario: dict, transcript: list[dict], user_profile: dict = None) -> dict:
    """Evaluate a full chat transcript and return complete scorecard, factoring in history."""
    context = build_evaluation_context(scenario, transcript, user_profile)
    return _llm.generate_json(EVALUATION_SYSTEM_PROMPT, context)
