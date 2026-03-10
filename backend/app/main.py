"""FastAPI entry point."""
import os

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import routes_scenarios, routes_chat, routes_evaluation, routes_history
from app.storage.session_store import init_db

app = FastAPI(title="Sales Sparring Agent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(routes_scenarios.router, prefix="/api")
app.include_router(routes_chat.router, prefix="/api")
app.include_router(routes_evaluation.router, prefix="/api")
app.include_router(routes_history.router, prefix="/api")


@app.on_event("startup")
async def startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    # Load environment variables from .env (including PORT)
    load_dotenv()
    port = int(os.environ.get("PORT", "8090"))

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
    )
