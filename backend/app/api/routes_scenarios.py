from fastapi import APIRouter, HTTPException
from app.models.schemas import GenerateClientRequest, GenerateClientResponse
from app.modules import scenario_builder

router = APIRouter()

# In-memory store for generated scenarios (for MVP, ideal is DB)
# Using dict since we need to persist it over the session until SQLite takes over
_scenarios_db = {}


@router.post("/generate_synthetic_client", response_model=GenerateClientResponse)
def generate_synthetic_client(request: GenerateClientRequest):
    """Generate a fictional client world and pre-planned objections."""
    try:
        scenario = scenario_builder.build_full_scenario(
            client_name=request.client_name,
            sector=request.sector,
            requirements=request.requirements,
        )
        _scenarios_db[scenario["scenario_id"]] = scenario
        
        # Add difficulties explicitly if the LLM forgot
        for i, obj in enumerate(scenario.get("objections", [])):
            if "id" not in obj:
                obj["id"] = str(i + 1)
            obj["tested"] = False
            
        return scenario
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_scenario(scenario_id: str) -> dict:
    scenario = _scenarios_db.get(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario
