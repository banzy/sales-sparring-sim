"""
Run the backend with an explicit startup diagnostic.

Run from the repo root:
    npm run dev:backend

Or from backend/:
    ./.venv/bin/python scripts/run_backend.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import uvicorn
from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from app.storage.session_store import get_db_diagnostics  # noqa: E402


def main() -> None:
    load_dotenv(BACKEND_DIR / ".env")

    port = int(os.environ.get("PORT", "8090"))
    reload_enabled = os.environ.get("UVICORN_RELOAD", "").lower() in {"1", "true", "yes"}
    diagnostics = get_db_diagnostics()

    print("[backend] database_url:", diagnostics["database_url"])
    print("[backend] database_path:", diagnostics["database_path"])
    print("[backend] counts:", diagnostics["counts"])
    print("[backend] port:", port)
    print("[backend] reload:", reload_enabled)

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=reload_enabled,
    )


if __name__ == "__main__":
    main()
