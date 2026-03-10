import logging
from fastapi import APIRouter, HTTPException
from app.core.llm_client import LLMServiceError
from app.models.schemas import SparringChatRequest, SparringChatResponse
from app.api.routes_scenarios import get_scenario
from app.modules import sparring_engine
from app.storage import session_store

router = APIRouter()
logger = logging.getLogger(__name__)


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
        )
        
        # We don't save the transcript incrementally here to DB, we'll do it at the end 
        # of the session in evaluation. The frontend tracks it in Zustand in realtime.
        return result
    except HTTPException:
        raise
    except LLMServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e)) from e
    except Exception as e:
        logger.exception("Unhandled error in sparring_chat")
        raise HTTPException(status_code=500, detail="Unexpected server error.") from e
