# Sales Sparring Agent

**Promotional website:** [https://generativeworks.net/ssa/](https://generativeworks.net/ssa/)

### The Problem

B2B sales cycles are increasingly complex, requiring account executives to navigate nuanced buyer personas, specific industry constraints, and aggressive multi-stakeholder objections. Traditional sales training relies on static scripts, generic roleplay with peers, or post-mortem deal analysis, which fail to dynamically prepare sellers for the reality of rigorous discovery calls in specific, high-stakes scenarios.

### The Solution

The **Sales Sparring Agent** is an AI-powered B2B sales roleplay and evaluation engine designed to bridge this gap. It leverages multi-agent LLM systems and Retrieval-Augmented Generation (RAG) to create highly dynamic conversation scenarios based on real-world target client telemetry, allowing sellers to practice against an adversarial AI buyer that acts, thinks, and pushes back like a real prospect.

**System Capabilities:**

- **Dynamic Adversarial Simulation:** Facilitates real-time, stateful natural language conversations using an adversarial buyer agent that actively tests objection handling and constraints navigation.
- **Context-Grounded Telemetry:** Integrates directly with search APIs (`Perplexity`) during scenario creation to ground the simulated buyer in accurate firmographics, sector context, and current strategic priorities of the target counterparty.
- **LLM-as-a-Judge Evaluation:** Employs a secondary evaluator agent to parse complete session transcripts, extracting structured performance data including communication clarity scoring, weakness identification, and objection triggered/handled ratio.
- **Fully Vector-Driven Copilot:** The AI Coach suggestion engine retrieves _all_ of its context from Qdrant via multi-query semantic search — including client profile, objection library, past session feedback, and learning progress — without injecting raw text into the prompt.
- **High-Quality Voice I/O:** Sellers can speak their responses using microphone-based speech recognition (transcribed via OpenAI Whisper on the backend) and listen to buyer responses read aloud using either the browser's native TTS or OpenAI's premium neural voices.
- **Database Snapshots:** Point-in-time backup and restore of the full SQLite database, managed directly from the Settings page.

---

## AI Integration & Core Agents

This application extensively leverages AI to provide a highly dynamic, context-aware sparring environment and actionable feedback.

### LLM Providers

- **OpenAI**: Powers the core conversational synthesis, simulation logic, complex reasoning, and text-to-speech (TTS) audio generation. It acts as the brain behind the Sparring Agent, the Evaluation Engine, and the Suggestion Engine.
- **Perplexity AI**: Utilized for real-time target client research. Before a scenario begins, Perplexity is queried to gather up-to-date market data, company profiles, and strategic insights to ground the simulation in reality.

### AI Agents & Learning Systems

The application operates through a system of specialized agents:

- **Sparring Agent (Adversarial Buyer)**: Simulates a realistic B2B buyer of a configurable persona (e.g. VP of Operations, CTO, CFO). It maintains a hidden internal state, responds naturally to the seller's pitch, and tracks objections triggered during the conversation.
- **Evaluation Engine (LLM-as-a-Judge)**: Once a session concludes, this learning agent analyzes the full transcript. It generates a comprehensive scorecard, identifying strengths, weaknesses, objection handling performance, and provides actionable coaching advice with evolution analysis across sessions.
- **Suggestion Engine (AI Coach)**: Acts as a real-time copilot during simulations. At any moment, the seller can request an AI-crafted suggested response. The suggestion is grounded in _all_ relevant contextual knowledge retrieved dynamically from Qdrant (see below).

### RAG (Retrieval-Augmented Generation) & Full Vector Context Pipeline

The application uses a fully RAG-native architecture where **no raw client data or coaching history is ever injected as plain text into prompts**. Instead, all knowledge is represented as high-dimensional vectors in Qdrant and semantically retrieved on demand.

#### What Gets Vectorized

When a scenario is created, the following data is embedded and indexed into Qdrant:

| Chunk Type             | Content                                                                                      | Qdrant `doc_type`     |
| ---------------------- | -------------------------------------------------------------------------------------------- | --------------------- |
| **Company Profile**    | Client name, size, sector, buyer persona, budget cycle, decision timeline, value proposition | `scenario_profile`    |
| **Client Research**    | Perplexity-sourced summary, key facts, strategic priorities, pain points                     | `scenario_profile`    |
| **Objections**         | Each anticipated objection as an individual chunk with full detail                           | `scenario_objection`  |
| **Buying Constraints** | All known procurement and operational constraints for the client                             | `scenario_constraint` |
| **Uploaded Documents** | User-uploaded PDF/TXT/DOCX files chunked and embedded for RAG                                | _(project-scoped)_    |

After each session evaluation, the following is also embedded:

| Chunk Type            | Content                                                                | Qdrant `doc_type`   |
| --------------------- | ---------------------------------------------------------------------- | ------------------- |
| **Session Feedback**  | Score breakdown, strengths, weaknesses per session                     | `session_feedback`  |
| **Coach AI Feedback** | Narrative coaching advice and cross-session evolution analysis         | `session_feedback`  |
| **Learning Progress** | Recommended focus areas, priority weaknesses, current score trajectory | `learning_progress` |

#### How the Suggestion Engine Uses Vectors

When a seller requests a suggested response, the engine fires **six parallel semantic queries** against Qdrant:

1. **Company context** → `scenario_profile` chunks for client name, sector, and buyer persona
2. **Objection context** → `scenario_objection` chunks matching the last buyer message
3. **Constraint context** → `scenario_constraint` chunks for procurement and operational blockers
4. **Past feedback** → `session_feedback` chunks from previous coaching evaluations
5. **Learning progress** → `learning_progress` chunks tracking the seller's evolution
6. **Uploaded docs** → User knowledge files most semantically relevant to the current exchange

Each query targets a specific `doc_type`, ensuring precision retrieval over a multi-dimensional knowledge base. The six retrieved contexts are assembled into a structured prompt and sent to OpenAI to generate the suggestion.

### Agent Communication

Agents communicate implicitly via the shared persistence layer. The Sparring Agent generates dialogue and internal feedback; the Evaluation Engine processes this to create learning progress metrics; and finally, those metrics are embedded and retrieved by the Suggestion Engine in future sessions to tailor real-time hints to the seller's _personal_ learning trajectory.

### Reinforced Agent Learning via `learning_progress`

The Sparring Agent uses `learning_progress` to **adapt the adversarial buyer** to the seller's weaknesses, creating a curriculum that reinforces practice on areas that need the most work. Unlike static roleplay, each new session is informed by past performance, so the buyer becomes a moving target that deliberately challenges the seller where they struggle most.

**The loop:**

1. **Session ends** → The Evaluation Engine scores the session and identifies strengths, weaknesses, focus areas, and evolution analysis. It also recommends `next_focus_areas` for future practice.
2. **Profile update** → The top 3 weaknesses are stored in the project profile as `priority_weaknesses`. The profile's `current_level` is adjusted: escalated when scores ≥ 75, reduced when scores < 50.
3. **Vector indexing** → The knowledge indexer embeds `learning_progress` chunks into Qdrant. Each chunk contains the session number, current score, recommended focus areas, and priority weaknesses to address. These chunks are semantically searchable alongside `session_feedback`.
4. **Next session** → The Sparring Agent retrieves both `session_feedback` and `learning_progress` via semantic search (queries like *"learning progress evolution focus areas priority weaknesses"*) and injects them into the buyer's system prompt as **seller background**. The buyer sees the seller's weaknesses and past feedback. Crucially, a **focus instruction** is added: *"Push particularly hard on these topics: {priority_weaknesses}"*.
5. **Difficulty scaling** → The profile's `current_level` controls the buyer's attitude: `beginner` (friendly, collaborative), `intermediate` (professional but skeptical), `advanced` (firm, demanding, ROI-focused), `adversarial` (hostile, interrupts, challenges every claim). As the seller improves, the buyer becomes tougher; if performance drops, the buyer eases off.

**Dual consumption:** Both the Sparring Agent and the Suggestion Engine consume `learning_progress`. The Sparring Agent uses it to *challenge* the seller on weak areas; the Suggestion Engine uses it to *coach* the seller with hints grounded in those same focus areas and past evolution. The result is a closed reinforcement loop: practice → evaluation → targeted challenge + targeted hints → improved practice.

---

## Voice Features

### Speech-to-Text (STT) — Voice Input

The seller can click the **microphone button** in the Sparring Arena to speak their response instead of typing. The audio is:

1. Captured via the browser's `MediaRecorder` API
2. Sent as a `webm` audio blob to the `/api/stt` backend endpoint
3. Transcribed by **OpenAI Whisper** on the backend
4. The transcription is injected into the message input field, ready to send or edit

### Text-to-Speech (TTS) — Voice Output

Every message in the chat — buyer or seller — has a **"Read Aloud"** button (the avatar icon). When clicked:

- The message audio is synthesized and played through the browser
- A pulsing animation indicates that audio is actively playing; clicking again **stops** it

Two TTS providers are supported and switchable in **Settings**:

| Provider               | Quality          | Cost               | Notes                                   |
| ---------------------- | ---------------- | ------------------ | --------------------------------------- |
| **Browser TTS**        | Robotic / basic  | Free               | Uses the OS voice engine; works offline |
| **OpenAI TTS (TTS-1)** | Neural / natural | ~$0.015 / 1K chars | Response is cached on disk; recommended |

**TTS cache (technical):** OpenAI TTS responses are cached on disk in `tts_cache/` using an MD5 hash of `voice:text`. On cache hit, the backend serves the stored MP3 without calling the API, avoiding AI regeneration and reducing cost for repeated "Read Aloud" on the same message.

The OpenAI TTS supports six voice personas: **Alloy**, **Echo**, **Fable**, **Onyx**, **Nova**, **Shimmer** — each with a distinct personality. All are configurable from the Settings page.

---

## Scenario Setup & Context Configuration

The **Context Setup** page is the entry point for every sparring session. It supports two scenario creation modes:

### Synthetic + Document Upload Mode

Sellers define:

- **Target Client Name** — e.g. "Acme Corp"
- **Industry / Sector** — Fintech, Healthcare, SaaS, Manufacturing, Retail, Energy, Airlines
- **Buyer Persona** — VP of Operations, CTO, CFO, VP of Sales, VP of Marketing, Director of IT, Head of Procurement, Chief Risk Officer
- **Pain Points / Requirements** — Free-text description of the client's challenges

Optionally, one or more documents (**PDF, TXT, DOCX** up to 10 MB each) can be uploaded. These are chunked, embedded, and stored in Qdrant, making the seller's own product documentation, competitive battlecards, or case studies available to the AI Coach during sparring.

The backend then:

1. Queries **Perplexity AI** to research the real target company
2. Uses **OpenAI** to synthesize the full scenario, objection set, and buyer persona
3. Embeds and indexes all generated data into **Qdrant**

### Demo Mode

A pre-configured airline scenario (**SmartWings**) is loaded instantly — no research required. Ideal for exploring the product without setting up a fresh scenario.

---

## Settings

The **Settings** page provides full control over the sparring experience:

### Text-to-Speech Configuration

- Switch between **Browser Voice** (free, offline) and **OpenAI TTS** (premium, neural)
- Select from 6 OpenAI voice personas when using OpenAI TTS
- **Test Voice** button plays a sample phrase through the selected engine
- Cost estimate displayed for OpenAI TTS (~$0.10–$0.20 per 10-message session)

### Database Snapshots

The Snapshots panel allows point-in-time backup and restore of the entire SQLite database:

- **Take Snapshot** — saves the current state of the database with an optional text label
- Snapshot list displays: label, timestamp, file size, and per-table row counts
- **Restore** — replaces the live database with any historical snapshot (with confirmation dialog)
- **Delete** — permanently removes a snapshot

This is useful for preserving a "clean" training state before a live demo or important session, and for rolling back after accidental data changes.

---

## Persistent Architecture

The application uses a hybrid dual-database architecture:

- **Relational DB (SQLite / SQLAlchemy)**: Manages structured, relational data such as User Profiles, Projects, Sessions, and explicit scenario definitions.
- **Vector DB (Qdrant)**: Manages unstructured, semantic data. It stores embedded chunks of scenario profiles, anticipated objections, session feedback, and aggregated learning progress, enabling fast semantic search and the full RAG pipeline.

---

## Application Pages & Navigation

| Page               | Route          | Purpose                                                      |
| ------------------ | -------------- | ------------------------------------------------------------ |
| **Context Setup**  | `/`            | Define the scenario: client, industry, persona, documents    |
| **Briefing**       | `/briefing`    | Review the AI-generated client profile and objection set     |
| **Sparring Arena** | `/arena`       | Live real-time roleplay with voice input/output and AI coach |
| **Performance**    | `/performance` | Session scorecard with strengths, weaknesses, and evolution  |
| **History**        | `/history`     | Browse all past sessions and transcripts                     |
| **Settings**       | `/settings`    | Configure voice engine, TTS voice, and manage snapshots      |
| **Projects**       | `/projects`    | Manage saved scenarios and projects                          |

---

## Working Flow and Data Manipulation

### Application Data Flow

This diagram illustrates how data moves through the core pages of the frontend application:

```
┌─────────────────┐
│  ContextSetup   │ ◄── client, industry, persona, documents
│     Page        │
└────────┬────────┘
         │ setContextSetup()
         ▼
    ┌────────┐
    │ Store  │ (Zustand, persistent)
    └────────┘
         │
         ▼
┌─────────────────┐
│    Briefing     │ ◄── reads briefing data
│      Page       │
└────────┬────────┘
         │ navigate to arena
         ▼
┌─────────────────┐
│ SparringArena   │ ◄── reads/writes session data
│      Page       │     - messages (text + voice)
└────────┬────────┘     - stats
         │              - objections
         │ endSparringSession()
         ▼
┌─────────────────┐
│  Performance    │ ◄── reads performance data
│      Page       │     setPerformance()
└─────────────────┘
```

### AI Data Manipulation Flow

This diagram illustrates how AI agents interact with the databases and each other in the backend:

```
┌──────────────────┐           ┌──────────────────┐           ┌──────────────────┐
│   User & Client  │────(1)───▶│ Scenario Builder │────(2)───▶│ SQLite (Storage) │
│    Input Data    │           │ (Perplexity +    │           │ & Qdrant (Vector)│
└──────────────────┘           │  OpenAI)         │           └──────────────────┘
                               └──────────────────┘                    │
                                                                      (3)
┌──────────────────┐           ┌──────────────────┐                    │
│ Sparring Arena   │◀───(4)────│ Suggestion Engine│◀───────────────────┘
│ (User Chat +     │           │ (6-query RAG)    │
│  Voice I/O)      │           └──────────────────┘
└────────┬─────────┘
         │
        (5) Chat Transcript
         ▼
┌──────────────────┐           ┌──────────────────┐
│ Evaluation Engine│────(6)───▶│ SQLite (Scores)  │
│ (AI Judge)       │           │ & Qdrant (Vector)│
└──────────────────┘           └──────────────────┘
```

1. Setup data is enriched via **Perplexity AI** (Client context) and **OpenAI** (Scenario generation + document vectorization).
2. The scenario, objections, constraints, and uploaded documents are embedded and stored in **Qdrant** and **SQLite**.
3. During a session, the **Suggestion Engine** fires 6 parallel semantic queries against Qdrant, retrieving company profile, objections, constraints, past session feedback, learning progress, and uploaded docs.
4. The **Suggestion Engine** provides real-time contextually-grounded hints to the seller. Voice input is transcribed via **OpenAI Whisper (STT)** and responses can be read aloud via **OpenAI TTS** or browser TTS.
5. After the session, the full transcript is sent to the **Evaluation Engine**.
6. The engine grades the session, generates coaching feedback and evolution analysis, and stores scores in SQLite and semantic embeddings in Qdrant for future RAG lookups.

---

## Development & Setup

See [docs/architecture.mmd](docs/architecture.mmd) for run instructions, technologies, and system diagram.
