import logging
from fastapi import APIRouter, HTTPException
from app.core.llm_client import LLMServiceError
from app.models.schemas import (
    EvaluateSessionRequest,
    EvaluateSessionResponse,
    GlobalPerformanceResponse,
)
from app.api.routes_scenarios import get_scenario
from app.modules import evaluation_engine, knowledge_indexer
from app.storage import session_store
import uuid

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/evaluate_session", response_model=EvaluateSessionResponse)
def evaluate_session(request: EvaluateSessionRequest):
    """Score the full transcript and update the project's difficulty profile."""
    try:
        scenario = get_scenario(request.scenario_id)
        transcript = [{"role": msg.role, "content": msg.content} for msg in request.transcript]
        
        # 1. Retrieve project history & run LLM judge
        project_profile = session_store.get_project_profile(request.project_id)
        eval_result = evaluation_engine.score_session(scenario, transcript, project_profile)
        
        # 2. Extract metrics
        overall_score = eval_result.get("overall_score", 0)
        
        session_id = str(uuid.uuid4())
        
        # 3. Save to database
        session_store.save_session(
            session_id=session_id,
            project_id=request.project_id,
            scenario_id=request.scenario_id,
            transcript=transcript,
        )
        
        session_store.save_score(
            session_id=session_id,
            project_id=request.project_id,
            score_data=eval_result,
        )
        
        # 4. Update adaptive profile
        new_profile = session_store.update_project_profile(request.project_id, eval_result)
        eval_result["next_difficulty"] = new_profile["current_level"]

        # 5. Index evaluation into vector store for RAG-powered suggestions
        session_number = new_profile.get("sessions_count", 1)
        knowledge_indexer.index_session_evaluation(
            project_id=request.project_id,
            session_id=session_id,
            session_number=session_number,
            eval_result=eval_result,
        )
        
        return eval_result
        
    except HTTPException:
        raise
    except LLMServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e)) from e
    except Exception as e:
        logger.exception("Unhandled error in evaluate_session")
        raise HTTPException(status_code=500, detail="Unexpected server error.") from e


@router.get("/global_performance", response_model=GlobalPerformanceResponse)
def get_global_performance(project_id: str):
    """
    Return aggregated performance across all scored sessions for a project.
    Short or unevaluated sessions are implicitly discarded because they do
    not have persisted scores.
    """
    stats = session_store.get_global_performance(project_id)
    if not stats:
        raise HTTPException(status_code=404, detail="No scored sessions found for project")
    return stats

