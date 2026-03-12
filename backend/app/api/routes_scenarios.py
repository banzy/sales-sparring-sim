import io
import logging
import uuid
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.llm_client import LLMClient, LLMServiceError
from app.models.schemas import ClientResearchResponse, GenerateClientRequest, GenerateClientResponse
from app.modules import scenario_builder, knowledge_indexer
from app.storage import session_store
from app.storage.vector_store import index_chunks
from app.utils.chunking import prepare_chunks

router = APIRouter()
logger = logging.getLogger(__name__)
DEMO_SCENARIO_ID = "demo-smartwings-123"


def _default_demo_scenario() -> dict:
    return {
        "scenario_id": DEMO_SCENARIO_ID,
        "client_profile": {
            "name": "SmartWings",
            "size": "Enterprise (Airline)",
            "budget_cycle": "Q4",
            "decision_timeline": "3 months",
            "buyer_persona": "CIO or VP of Customer Experience, focused on operational efficiency and passenger satisfaction",
        },
        "client_research": None,
        "generation_context": {
            "client_name": "SmartWings",
            "sector": "airlines",
            "requirements": "Pitching Ciklum AI Passenger Tracking",
        },
        "value_proposition": "Ciklum provides a full-cycle passenger activity tracking system driven by AI. It manages interactions from initial ticket purchase to cancellations, claims, and missing luggage. Users can make requests via text, document, or bot calls with clear communication at every step. Post-cycle, AI agents generate metrics and survey results. This radically reduces agent handling time and improves CSAT through predictive analytics.",
        "buying_constraints": [
            "Integrating with legacy flight booking systems",
            "Ensuring compliance with aviation data regulations",
            "Proving ROI against existing customer support costs",
        ],
        "objections": [
            {
                "id": "1",
                "title": "Integration Risk",
                "detail": "How do we know your AI system can safely integrate with our legacy PSS without causing downtime?",
                "tested": False,
            },
            {
                "id": "2",
                "title": "Accuracy of AI Claims",
                "detail": "Handling missing luggage and claims via AI sounds risky. What happens if the AI makes a mistake and approves a fraudulent claim?",
                "tested": False,
            },
            {
                "id": "3",
                "title": "Cost vs Loyalty",
                "detail": "We already have a massive call center. Will replacing parts of it with AI actually improve passenger loyalty, or just cut costs and frustrate users?",
                "tested": False,
            },
            {
                "id": "4",
                "title": "Training Reality",
                "detail": "We don’t have a team of prompt engineers or AI scientists. How much effort is required from our internal team to train and maintain these models?",
                "tested": False,
            },
            {
                "id": "5",
                "title": "Data Privacy",
                "detail": "Our passengers trust us with sensitive PII like passport details and payment info. How does your AI ensure this data isn't exposed or used to train public models?",
                "tested": False,
            },
        ],
    }


def _merge_demo_scenario(stored_scenario: dict | None) -> dict:
    demo_scenario = _default_demo_scenario()
    if not stored_scenario:
        return demo_scenario

    merged_scenario = {**demo_scenario, **stored_scenario}
    merged_scenario["scenario_id"] = demo_scenario["scenario_id"]
    merged_scenario["client_profile"] = {
        **demo_scenario["client_profile"],
        **(stored_scenario.get("client_profile") or {}),
    }
    merged_scenario["generation_context"] = {
        **demo_scenario["generation_context"],
        **(stored_scenario.get("generation_context") or {}),
    }

    if "client_research" in stored_scenario:
        merged_scenario["client_research"] = stored_scenario.get("client_research")

    if stored_scenario.get("buying_constraints"):
        merged_scenario["buying_constraints"] = stored_scenario["buying_constraints"]

    if stored_scenario.get("objections"):
        merged_scenario["objections"] = stored_scenario["objections"]

    if stored_scenario.get("value_proposition"):
        merged_scenario["value_proposition"] = stored_scenario["value_proposition"]

    return merged_scenario


def _load_scenario_record(scenario_id: str) -> dict:
    if scenario_id == DEMO_SCENARIO_ID:
        stored_scenario = session_store.get_scenario(DEMO_SCENARIO_ID)
        demo_scenario = _merge_demo_scenario(stored_scenario)
        session_store.save_scenario(DEMO_SCENARIO_ID, demo_scenario)
        return demo_scenario

    scenario = session_store.get_scenario(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario


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
        # Index scenario knowledge into vector store for RAG-powered suggestions
        knowledge_indexer.index_scenario(scenario["scenario_id"], scenario)
        return scenario
    except LLMServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e)) from e
    except Exception as e:
        logger.exception("Unhandled error in generate_synthetic_client")
        raise HTTPException(status_code=500, detail="Unexpected server error.") from e


@router.get("/load_demo_scenario", response_model=GenerateClientResponse)
def load_demo_scenario():
    """Return a pre-configured SmartWings demo scenario."""
    return _load_scenario_record(DEMO_SCENARIO_ID)


@router.get("/scenarios/{scenario_id}", response_model=GenerateClientResponse)
def load_scenario(scenario_id: str):
    """Return a stored scenario so frontend flows can hydrate from one shared DB-backed path."""
    return _load_scenario_record(scenario_id)


@router.get("/scenarios/{scenario_id}/client_research", response_model=ClientResearchResponse)
def get_client_research(scenario_id: str):
    """Return the currently saved Perplexity company research for a scenario."""
    scenario = _load_scenario_record(scenario_id)

    return {
        "scenario_id": scenario_id,
        "client_research": scenario.get("client_research"),
    }


@router.post("/scenarios/{scenario_id}/client_research", response_model=ClientResearchResponse)
def refresh_client_research(scenario_id: str):
    """Request fresh Perplexity company research and persist it on the scenario."""
    scenario = _load_scenario_record(scenario_id)

    try:
        updated_scenario = scenario_builder.refresh_client_research_for_scenario(scenario)
        session_store.save_scenario(scenario_id, updated_scenario)
        # Re-index scenario with fresh research data
        knowledge_indexer.index_scenario(scenario_id, updated_scenario)
        return {
            "scenario_id": scenario_id,
            "client_research": updated_scenario.get("client_research"),
        }
    except LLMServiceError as e:
        raise HTTPException(status_code=e.status_code, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.exception("Unhandled error in refresh_client_research")
        raise HTTPException(status_code=500, detail="Unexpected server error.") from e


def get_scenario(scenario_id: str) -> dict:
    return _load_scenario_record(scenario_id)


def _extract_text_from_upload(file: UploadFile) -> str:
    """Best-effort text extraction for TXT, PDF, and DOCX uploads."""
    filename = file.filename or ""
    suffix = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    # Read all bytes once; callers are expected to have awaited file.read()
    if not hasattr(file, "spooled_content"):
        # Placeholder attribute to satisfy type checkers; actual bytes passed in separately
        raise RuntimeError("Use _extract_text_from_upload_with_bytes instead.")

    raise RuntimeError("This helper should not be called directly.")


async def _read_and_normalise_files(files: List[UploadFile]) -> list[dict]:
    """Read uploaded files and turn them into document dicts for chunking."""
    docs: list[dict] = []

    # Lazy imports so that the app can still start even if optional deps are missing
    try:
        from pypdf import PdfReader  # type: ignore[import]
    except Exception:  # pragma: no cover - optional dependency
        PdfReader = None  # type: ignore[assignment]

    try:
        from docx import Document  # type: ignore[import]
    except Exception:  # pragma: no cover - optional dependency
        Document = None  # type: ignore[assignment]

    for file in files:
        raw = await file.read()
        if not raw:
            continue

        filename = file.filename or "document"
        suffix = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        text: str | None = None

        if suffix in ("txt", "text", ""):
            try:
                text = raw.decode("utf-8", errors="ignore")
            except Exception:
                text = None
        elif suffix == "pdf" and PdfReader is not None:
            try:
                reader = PdfReader(io.BytesIO(raw))
                pages_text = []
                for page in reader.pages:
                    page_text = page.extract_text() or ""
                    pages_text.append(page_text)
                text = "\n".join(pages_text)
            except Exception:
                text = None
        elif suffix == "docx" and Document is not None:
            try:
                doc = Document(io.BytesIO(raw))
                paragraphs = [p.text for p in doc.paragraphs]
                text = "\n".join(paragraphs)
            except Exception:
                text = None

        if not text:
            # Skip unsupported or unreadable files
            logger.warning("Skipping unreadable or unsupported file '%s'", filename)
            continue

        doc_id = f"{uuid.uuid4()}"
        docs.append(
            {
                "doc_id": doc_id,
                "text": text,
                "project_id": None,  # filled by caller
                "filename": filename,
                "file_type": suffix or "txt",
                "file_size": len(raw),
            }
        )

    return docs


@router.post("/projects/{project_id}/documents")
async def upload_project_documents(project_id: str, files: List[UploadFile] = File(...)) -> dict:
    """
    Upload knowledge documents for a specific project.

    - Extracts text from each file (TXT, PDF, DOCX).
    - Chunks and embeds with OpenAI.
    - Indexes chunks in Qdrant with project_id metadata.
    - Persists document metadata in SQLite.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    scenario = session_store.get_scenario(project_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Project/scenario not found")

    raw_docs = await _read_and_normalise_files(files)
    if not raw_docs:
        raise HTTPException(status_code=400, detail="No readable documents found in upload")

    # Attach project_id metadata before chunking
    for doc in raw_docs:
        doc["project_id"] = project_id

    chunks = prepare_chunks(raw_docs, chunk_size=200, overlap=50)

    llm = LLMClient()
    texts = [c["text"] for c in chunks]
    embeddings = llm.embed(texts)

    for chunk, emb in zip(chunks, embeddings):
        chunk["embedding"] = emb

    # Index in Qdrant – metadata already includes project_id, filename, etc.
    index_chunks(chunks)

    # Persist high-level document records; use doc_id as qdrant_doc_id group key
    doc_records = [
        {
            "filename": doc["filename"],
            "file_type": doc.get("file_type"),
            "file_size": doc.get("file_size"),
            "qdrant_doc_id": doc["doc_id"],
        }
        for doc in raw_docs
    ]
    created_docs = session_store.save_project_documents(project_id, doc_records)

    return {"project_id": project_id, "documents": created_docs}
