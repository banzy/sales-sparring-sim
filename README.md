# Sales Sparring Simulator

### The Problem
B2B sales cycles are increasingly complex, requiring account executives to navigate nuanced buyer personas, specific industry constraints, and aggressive multi-stakeholder objections. Traditional sales training relies on static scripts, generic roleplay with peers, or post-mortem deal analysis, which fail to dynamically prepare sellers for the reality of rigorous discovery calls in specific, high-stakes scenarios.

### The Solution
The Sales Sparring Simulator is an AI-powered B2B sales roleplay and evaluation engine designed to bridge this gap. It leverages multi-agent LLM systems and Retrieval-Augmented Generation (RAG) to create highly dynamic conversation scenarios based on real-world target client telemetry, allowing sellers to practice against an adversarial AI buyer that acts, thinks, and pushes back like a real prospect.

**System Capabilities:**
- **Dynamic Adversarial Simulation:** Facilitates real-time, stateful natural language conversations using an adversarial buyer agent that actively tests objection handling and constraints navigation.
- **Context-Grounded Telemetry:** Integrates directly with search APIs (`Perplexity`) during scenario creation to ground the simulated buyer in accurate firmographics, sector context, and current strategic priorities of the target counterparty.
- **LLM-as-a-Judge Evaluation:** Employs a secondary evaluator agent to parse complete session transcripts, extracting structured performance data including communication clarity scoring, weakness identification, and objection triggered/handled ratio.
- **RAG-Driven Copilot:** Utilizes real-time vector semantic search over past session state and client demographics to surface contextual coaching advice inline with the ongoing conversation.

## AI Integration & Core Agents

This application extensively leverages AI to provide a highly dynamic, context-aware sparring environment and actionable feedback.

### LLM Providers
- **OpenAI**: Powers the core conversational synthesis, simulation logic, and complex reasoning tasks. It acts as the brain behind the sparring agent, the evaluation engine, and the suggestion engine.
- **Perplexity AI**: Utilized for real-time target client research. Before a scenario begins, Perplexity is queried to gather up-to-date market data, company profiles, and strategic insights to ground the simulation in reality.

### AI Agents & Learning Systems
The application operates through a system of specialized agents:
- **Sparring Agent (Adversarial Buyer)**: Simulates a realistic B2B buyer. It maintains a hidden internal state, responds naturally to the seller's pitch, and tracks objections triggered during the conversation.
- **Evaluation Engine (LLM-as-a-judge)**: Once a session concludes, this learning agent analyzes the full transcript. It generates a comprehensive scorecard, identifying strengths, weaknesses, objection handling performance, and provides actionable coaching advice.
- **Suggestion Engine (AI Coach)**: Acts as a real-time copilot during simulations, offering suggested responses to the seller based on exactly what the simulated buyer just said.

### RAG (Retrieval-Augmented Generation) & Vector Embeddings
To ensure all AI responses are highly relevant and personalized, the app uses a robust RAG pipeline:
- **Embeddings**: Text chunks representing company profiles, constraints, past user weaknesses, and coaching feedback are embedded into vectors using the LLM client.
- **Vector Database (Qdrant)**: As the central semantic knowledge base, Qdrant stores these embedded chunks.
- **Contextual Retrieval**: Instead of passing giant blocks of raw text into prompts, the Suggestion Engine and other modules dynamically retrieve only the most relevant knowledge. If a buyer raises a specific objection, the system retrieves past feedback on how the seller handled similar objections, ensuring coaching is progressive and context-aware.

### Agent Communication
Agents communicate implicitly via the shared persistence layer. The Sparring Agent generates dialogue and internal feedback; the Evaluation Engine processes this to create learning progress metrics; and finally, those metrics are embedded and retrieved by the Suggestion Engine in future sessions to tailor real-time hints.

## Persistent Architecture

The application uses a hybrid dual-database architecture:
- **Relational DB (SQLite/SQLAlchemy)**: Manages structured, relational data such as User Profiles, Projects, Sessions, and explicit scenario definitions.
- **Vector DB (Qdrant)**: Manages unstructured, semantic data. It stores embedded chunks of scenario profiles, anticipated objections, session feedback, and aggregated learning progress constraints, enabling fast semantic search and RAG capabilities.

## Working Flow and Data Manipulation

### Application Data Flow
This diagram illustrates how data moves through the core pages of the frontend application:
```
┌─────────────────┐
│  ContextSetup   │
│     Page        │
└────────┬────────┘
         │ setContextSetup()
         ▼
    ┌────────┐
    │ Store  │
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
│      Page       │     - messages
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
│   (User Chat)    │           │   (AI Coach)     │
└────────┬─────────┘           └──────────────────┘
         │
        (5) Chat Transcript
         ▼
┌──────────────────┐           ┌──────────────────┐
│ Evaluation Engine│────(6)───▶│ SQLite (Scores)  │
│ (AI Judge)       │           │ & Qdrant (Vector)│
└──────────────────┘           └──────────────────┘
```
1. Setup data is enriched via **Perplexity AI** (Client context) and **OpenAI** (Scenario generation).
2. The scenario and potential objections are embedded and stored in **Qdrant** and **SQLite**.
3. During a session, the **Suggestion Engine** performs RAG lookups in Qdrant (finding relevant profile data, past weaknesses, and matching objections).
4. The **Suggestion Engine** provides real-time contextual hints to the user.
5. After the session, the full transcript is sent to the **Evaluation Engine**.
6. The engine grades the session, generates coaching feedback, and stores it in SQLite (numeric scores) and Qdrant (semantic embeddings for future RAG lookups).

---

## Development & Setup

### How can I edit this code?

There are several ways of editing your application.

**Use Ciklum**
Changes made via Ciklum will be committed automatically to this repo.

**Use your preferred IDE**
If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Ciklum.

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone https://github.com/banzy/sales-sparring-sim

# Step 3: Install the necessary dependencies.
bun install

# Step 4: Start the development server with auto-reloading and an instant preview.
bun dev:all
```

**Edit a file directly in GitHub**
- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**
- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

### What technologies are used for this project?

This project is built with a modern web stack:

- **Frontend**: Vite, TypeScript, React, shadcn-ui, Tailwind CSS
- **State Management**: Zustand (Centralized, persistent, type-safe state)
- **Data Fetching**: React Query
- **Backend (API)**: FastAPI, Python, SQLAlchemy
- **AI/ML**: OpenAI, Perplexity AI, Qdrant (Vector DB)

### State Management

This project uses **Zustand** for centralized state management on the frontend. Key features:

- **Persistent State**: User configuration survives page refreshes
- **Type-Safe**: Full TypeScript support
- **DevTools**: Redux DevTools integration for debugging
- **Performance**: Optimized re-renders with selective subscriptions
