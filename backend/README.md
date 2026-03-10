# Backend - Sales Sparring Agent

This is the FastAPI backend for the Sales Sparring Agent.

## Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Python Environment**:
   It is recommended to use a virtual environment. One already exists in `.venv`.
   ```bash
   source .venv/bin/activate  # On macOS/Linux
   # or
   .venv\Scripts\activate     # On Windows
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables**:
   Copy the example environment file and fill in your API keys:
   ```bash
   cp .env.example .env
   ```
   Required variables:
   - `OPENAI_API_KEY`: Your OpenAI API key.
   - `QDRANT_URL` and `QDRANT_API_KEY`: Connection details for your Qdrant instance.

## Running the Server

Start the development server with auto-reload:
```bash
python -m app.main
```

By default the API runs on `http://localhost:8090` (or `PORT` from `.env`).
You can access the interactive API documentation at `http://localhost:<PORT>/docs`.

## Scripts

- `scripts/ingest_documents.py`: Ingest documents into the knowledge base.
- `scripts/generate_synthetic_dataset.py`: Generate synthetic data for testing.
