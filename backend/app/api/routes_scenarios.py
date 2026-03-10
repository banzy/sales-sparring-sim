import logging
from fastapi import APIRouter, HTTPException
from app.core.llm_client import LLMServiceError
from app.models.schemas import GenerateClientRequest, GenerateClientResponse
from app.modules import scenario_builder
from app.storage import session_store

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/generate_synthetic_client", response_model=GenerateClientResponse)
def generate_synthetic_client(request: GenerateClientRequest):
    """Generate a fictional client world and pre-planned objections."""
    try:
        scenario = scenario_builder.build_full_scenario(
            client_name=request.client_name,
            sector=request.sector,
            requirements=request.requirements,
        )
        
        # Add difficulties explicitly if the LLM forgot
        for i, obj in enumerate(scenario.get("objections", [])):
            if "id" not in obj:
                obj["id"] = str(i + 1)
            obj["tested"] = False
        
        session_store.save_scenario(scenario["scenario_id"], scenario)
        return scenario
    except LLMServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e)) from e
    except Exception as e:
        logger.exception("Unhandled error in generate_synthetic_client")
        raise HTTPException(status_code=500, detail="Unexpected server error.") from e


@router.get("/load_demo_scenario", response_model=GenerateClientResponse)
def load_demo_scenario():
    """Return a pre-configured SmartWings demo scenario."""
    demo_scenario = {
        "scenario_id": "demo-smartwings-123",
        "client_profile": {
            "name": "SmartWings",
            "size": "Enterprise (Airline)",
            "budget_cycle": "Q4",
            "decision_timeline": "3 months",
            "buyer_persona": "CIO or VP of Customer Experience, focused on operational efficiency and passenger satisfaction"
        },
        "value_proposition": "Ciklum provides a full-cycle passenger activity tracking system driven by AI. It manages interactions from initial ticket purchase to cancellations, claims, and missing luggage. Users can make requests via text, document, or bot calls with clear communication at every step. Post-cycle, AI agents generate metrics and survey results. This radically reduces agent handling time and improves CSAT through predictive analytics.",
        "buying_constraints": [
            "Integrating with legacy flight booking systems",
            "Ensuring compliance with aviation data regulations",
            "Proving ROI against existing customer support costs"
        ],
        "objections": [
            {
                "id": "1",
                "title": "Integration Risk",
                "detail": "How do we know your AI system can safely integrate with our legacy PSS without causing downtime?",
                "tested": False
            },
            {
                "id": "2",
                "title": "Accuracy of AI Claims",
                "detail": "Handling missing luggage and claims via AI sounds risky. What happens if the AI makes a mistake and approves a fraudulent claim?",
                "tested": False
            },
            {
                "id": "3",
                "title": "Cost vs Loyalty",
                "detail": "We already have a massive call center. Will replacing parts of it with AI actually improve passenger loyalty, or just cut costs and frustrate users?",
                "tested": False
            },
            {
                "id": "4",
                "title": "Training Reality",
                "detail": "We don’t have a team of prompt engineers or AI scientists. How much effort is required from our internal team to train and maintain these models?",
                "tested": False
            },
            {
                "id": "5",
                "title": "Data Privacy",
                "detail": "Our passengers trust us with sensitive PII like passport details and payment info. How does your AI ensure this data isn't exposed or used to train public models?",
                "tested": False
            }
        ]
    }
    
    session_store.save_scenario(demo_scenario["scenario_id"], demo_scenario)
    return demo_scenario


def get_scenario(scenario_id: str) -> dict:
    scenario = session_store.get_scenario(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario
