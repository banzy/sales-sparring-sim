import logging
from fastapi import APIRouter, HTTPException
from pydantic import ValidationError
from app.core.llm_client import LLMClient, LLMServiceError
from app.models.schemas import (
    SparringChatRequest,
    SparringChatResponse,
    SuggestResponseRequest,
    SuggestResponseResponse,
)
from app.api.routes_scenarios import get_scenario
from app.modules import sparring_engine, suggestion_engine
from app.storage import session_store

router = APIRouter()
logger = logging.getLogger(__name__)


def _fallback_sparring_response(result: object) -> SparringChatResponse:
    buyer_response = "I'm not sure what you mean by that."
    if isinstance(result, dict):
        raw_buyer_response = result.get("buyer_response")
        if isinstance(raw_buyer_response, str) and raw_buyer_response.strip():
            buyer_response = raw_buyer_response.strip()

    return SparringChatResponse(
        buyer_response=buyer_response,
        turn_feedback={
            "handled_well": False,
            "comment": "Feedback unavailable.",
            "weakness_tags": [],
        },
        objections_triggered=[],
    )


@router.post("/sparring_chat", response_model=SparringChatResponse)
def sparring_chat(request: SparringChatRequest):
    """Handle a single turn of the sparring simulation."""
    try:
        scenario = get_scenario(request.scenario_id)
        project_profile = session_store.get_project_profile(request.project_id)
        
        # Convert Pydantic models to dicts for the engine
        history = [{"role": msg.role, "content": msg.content} for msg in request.conversation_history]
        
        result = sparring_engine.next_turn(
            scenario=scenario,
            profile=project_profile,
            history=history,
            user_reply=request.user_reply,
            tested_objection_ids=request.tested_objection_ids or [],
            project_id=request.project_id,
        )
        
        # We don't save the transcript incrementally here to DB, we'll do it at the end 
        # of the session in evaluation. The frontend tracks it in Zustand in realtime.
        try:
            return SparringChatResponse.model_validate(result)
        except ValidationError:
            logger.exception("Invalid sparring response payload: %r", result)
            return _fallback_sparring_response(result)
    except HTTPException:
        raise
    except LLMServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e)) from e
    except Exception as e:
        logger.exception("Unhandled error in sparring_chat")
        raise HTTPException(status_code=500, detail="Unexpected server error.") from e


@router.post("/suggest_response", response_model=SuggestResponseResponse)
def suggest_response(request: SuggestResponseRequest):
    """Generate an AI-suggested seller response grounded in full context."""
    try:
        history = [{"role": msg.role, "content": msg.content} for msg in request.conversation_history]

        suggestion = suggestion_engine.suggest_response(
            scenario_id=request.scenario_id,
            project_id=request.project_id,
            conversation_history=history,
        )

        return {"suggestion": suggestion}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
    except LLMServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e)) from e
    except Exception as e:
        logger.exception("Unhandled error in suggest_response")
        raise HTTPException(status_code=500, detail="Unexpected server error.") from e


GENERATE_POST_SYSTEM = """You are a professional social media copywriter. Write a short LinkedIn-style post (2-4 sentences) promoting the Sales Sparring Agent — an AI-powered B2B sales roleplay simulator that helps sellers practice against an adversarial AI buyer. Keep it engaging, professional, and suitable for LinkedIn. No hashtags. Output only the post text, nothing else."""


@router.post("/generate_post")
def generate_post():
    """Generate a short LinkedIn-style post about the Sales Sparring Agent using the main LLM."""
    try:
        llm = LLMClient(provider="openai")
        post = llm.generate(
            system_prompt=GENERATE_POST_SYSTEM,
            user_prompt="Write the LinkedIn post now.",
        )
        return {"post": post.strip()}
    except LLMServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e)) from e
    except Exception as e:
        logger.exception("Unhandled error in generate_post")
        raise HTTPException(status_code=500, detail="Unexpected server error.") from e
