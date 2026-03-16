# Sales Sparring Agent — Technical Overview

Short guide to running the agent and the technologies used.

## How to Run

```sh
# Clone and install
git clone https://github.com/banzy/sales-sparring-sim
cd sales-sparring-sim
bun install

# Configure environment (backend/.env)
# Required: OPENAI_API_KEY, PERPLEXITY_API_KEY
# Optional: QDRANT_URL (default: local), PORT (default: 8090)

# Run frontend + backend
bun dev:all
```

- **Frontend**: http://localhost:8080 (Vite dev server)
- **Backend API**: http://localhost:8090 (FastAPI)

## Technologies & Libraries

| Layer | Technology |
|-------|------------|
| **Frontend** | Vite, TypeScript, React, shadcn-ui, Tailwind CSS |
| **State** | Zustand |
| **Data** | React Query |
| **Backend** | FastAPI, Python, SQLAlchemy |
| **AI** | OpenAI (Chat, TTS-1, Whisper), Perplexity AI |
| **Vector DB** | Qdrant |
| **Relational DB** | SQLite |

See [architecture.mmd](./architecture.mmd) for the system diagram.

## Technical: TTS Audio Caching

OpenAI TTS responses are **cached on disk** to avoid repeated AI regeneration. The `/api/tts` endpoint uses an MD5 hash of `voice:text` as the cache key and stores MP3 files under `tts_cache/`. On cache hit, the file is served directly without calling the OpenAI API, reducing cost and latency for repeated "Read Aloud" on the same message.
