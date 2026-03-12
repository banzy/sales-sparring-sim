# Sales Sparring Simulator

Welcome to the Sales Sparring Simulator project! This application is designed to help sales professionals practice and improve their B2B pitches, handle objections, and navigate complex buying constraints through realistic, AI-driven simulations.

## 🧠 AI Integration & Core Agents

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

## 💾 Persistent Architecture

The application uses a hybrid dual-database architecture:
- **Relational DB (SQLite/SQLAlchemy)**: Manages structured, relational data such as User Profiles, Projects, Sessions, and explicit scenario definitions.
- **Vector DB (Qdrant)**: Manages unstructured, semantic data. It stores embedded chunks of scenario profiles, anticipated objections, session feedback, and aggregated learning progress constraints, enabling fast semantic search and RAG capabilities.

## 🔄 Working Flow and Data Manipulation

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

## 💻 Development & Setup

### How can I edit this code?

There are several ways of editing your application.

**Use Ciklum**
Changes made via Ciklum will be committed automatically to this repo.

**Use your preferred IDE**
If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Ciklum.

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev:all
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

#### Documentation
- `ZUSTAND_MIGRATION.md` - Detailed migration guide
- `STATE_FLOW.md` - Architecture and data flow
- `QUICK_REFERENCE.md` - Quick reference for common patterns
- `BEFORE_AFTER_COMPARISON.md` - Comparison with previous approach
