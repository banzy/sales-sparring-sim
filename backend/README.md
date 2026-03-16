# Backend

FastAPI backend for Sales Sparring Agent.

**Setup:** `cd backend && source .venv/bin/activate && pip install -r requirements.txt`  
**Env:** Copy `.env.example` → `.env` (OPENAI_API_KEY, QDRANT_URL, QDRANT_API_KEY)  
**Run:** `python scripts/run_backend.py` → http://localhost:8090

**Scripts:** `ingest_documents.py`, `generate_synthetic_dataset.py`, `export_sqlite_snapshot.py`, `restore_sqlite_snapshot.py`  
**DB snapshot:** `npm run db:export` / `npm run db:restore` to move session data between machines.
