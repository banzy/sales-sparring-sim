from fastapi import APIRouter, HTTPException
from app.models.schemas import SparringChatRequest, SparringChatResponse
from app.api.routes_scenarios import get_scenario
from app.modules import sparring_engine
from app.storage import session_store

router = APIRouter()


@router.post("/sparring_chat", response_model=SparringChatResponse)
def sparring_chat(request: SparringChatRequest):
    """Handle a single turn of the sparring simulation."""
    try:
        scenario = get_scenario(request.scenario_id)
        user_profile = session_store.get_user_profile(request.user_id)
        
        # Convert Pydantic models to dicts for the engine
        history = [{"role": msg.role, "content": msg.content} for msg in request.conversation_history]
        
        result = sparring_engine.next_turn(
            scenario=scenario,
            profile=user_profile,
            history=history,
            user_reply=request.user_reply,
        )
        
        # We don't save the transcript incrementally here to DB, we'll do it at the end 
        # of the session in evaluation. The frontend tracks it in Zustand in realtime.
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
