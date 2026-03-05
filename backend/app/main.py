"""FastAPI entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import routes_scenarios, routes_chat, routes_evaluation
from app.storage.session_store import init_db

app = FastAPI(title="Sales Sparring Agent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(routes_scenarios.router, prefix="/api")
app.include_router(routes_chat.router, prefix="/api")
app.include_router(routes_evaluation.router, prefix="/api")


@app.on_event("startup")
async def startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}
