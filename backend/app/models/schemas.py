"""Pydantic schemas for all API request/response models."""
from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Shared / primitives
# ---------------------------------------------------------------------------

class Objection(BaseModel):
    id: str
    title: str
    detail: str
    difficulty: Optional[str] = "medium"
    tested: bool = False


class ClientProfile(BaseModel):
    name: str
    size: str
    budget_cycle: str
    decision_timeline: str
    buyer_persona: str


class ResearchSource(BaseModel):
    title: str
    url: str


class ClientResearch(BaseModel):
    summary: str
    key_facts: list[str]
    strategic_priorities: list[str]
    potential_pain_points: list[str]
    sources: list[ResearchSource] = []


class ChatMessage(BaseModel):
    role: str  # "buyer" | "seller"
    content: str


# ---------------------------------------------------------------------------
# Scenario generation
# ---------------------------------------------------------------------------

class GenerateClientRequest(BaseModel):
    client_name: str = Field(..., description="Target client company name")
    sector: str = Field(..., description="Industry / sector")
    requirements: str = Field("", description="Specific pain points or requirements")


class GenerateClientResponse(BaseModel):
    scenario_id: str
    client_profile: ClientProfile
    client_research: Optional[ClientResearch] = None
    value_proposition: str
    buying_constraints: list[str]
    objections: list[Objection]


class ClientResearchResponse(BaseModel):
    scenario_id: str
    client_research: Optional[ClientResearch] = None


# ---------------------------------------------------------------------------
# Sparring chat
# ---------------------------------------------------------------------------

class SparringChatRequest(BaseModel):
    scenario_id: str
    project_id: str
    conversation_history: list[ChatMessage] = []
    user_reply: str


class ObjectionTriggered(BaseModel):
    id: str
    title: str


class TurnFeedback(BaseModel):
    handled_well: bool
    comment: str
    weakness_tags: list[str] = []


class SparringChatResponse(BaseModel):
    buyer_response: str
    turn_feedback: TurnFeedback
    objections_triggered: list[ObjectionTriggered] = []


# ---------------------------------------------------------------------------
# Session evaluation
# ---------------------------------------------------------------------------

class EvaluateSessionRequest(BaseModel):
    project_id: str
    scenario_id: str
    transcript: list[ChatMessage]


class ScoreBreakdown(BaseModel):
    clarity: int = Field(ge=1, le=5)
    relevance: int = Field(ge=1, le=5)
    groundedness: int = Field(ge=1, le=5)
    persuasiveness: int = Field(ge=1, le=5)
    objection_handling: int = Field(ge=1, le=5)
    conciseness: int = Field(ge=1, le=5)


class EvaluateSessionResponse(BaseModel):
    overall_score: int           # 0–100
    objection_handling: int      # 0–100
    communication_clarity: int   # 0–100
    score_breakdown: ScoreBreakdown
    strengths: list[str]
    weaknesses: list[str]
    ai_feedback: str
    evolution_analysis: str
    next_difficulty: str
    next_focus_areas: list[str] = []
