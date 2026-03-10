"""
seed_demo_sessions.py
=====================
Populates SQLite + Qdrant with 3 realistic SmartWings pitch sessions
for project_id = "demo-smartwings-123".

Sessions 1 & 2 are completed (saved with scores).
Session 3 is the live "current" session — the profile and history are already
set, so the sparring agent will push hard on the weaknesses identified in S2.

Run from the backend/ directory:
    source .venv/bin/activate
    python scripts/seed_demo_sessions.py
"""
from __future__ import annotations
import json
import os
import sys
from datetime import datetime, timedelta

# ── allow importing from `app` ────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.storage.session_store import (
    init_db,
    save_scenario,
    save_session,
    save_score,
    _make_session,
    Session,
    SessionScore,
    SparringProfile,
    get_scenario,
)
from app.core.llm_client import LLMClient
from app.storage.vector_store import ensure_collection, index_chunks

# ── Scenario ──────────────────────────────────────────────────────────────────

SCENARIO_ID = "demo-smartwings-123"
PROJECT_ID = SCENARIO_ID
SCENARIO = {
    "scenario_id": SCENARIO_ID,
    "client_profile": {
        "name": "SmartWings",
        "size": "Enterprise Airline (3,400+ employees)",
        "budget_cycle": "Q4 annual review",
        "decision_timeline": "3 months",
        "buyer_persona": "CIO / VP of Customer Experience focused on operational efficiency and passenger CSAT",
    },
    "value_proposition": (
        "Ciklum provides a full-cycle AI-powered passenger activity tracking system that manages every "
        "interaction from ticket purchase through cancellations, claims, and missing luggage. Passengers "
        "interact via text, documents, or voice bots — with clear status at every step. Post-cycle AI "
        "agents generate CSAT metrics and flag anomalies. Average airlines see 40 % reduction in agent "
        "handling time and a 22-point CSAT lift within 6 months."
    ),
    "buying_constraints": [
        "Must integrate with legacy PSS (Sabre) without causing flight ops downtime",
        "Full GDPR and IATA data-handling compliance required",
        "ROI must be demonstrable within 12 months to CFO",
        "Internal team has no AI/ML specialists — implementation must be low-maintenance",
        "Union agreements limit how far automation can replace human agents",
    ],
    "objections": [
        {
            "id": "1",
            "title": "Integration Risk",
            "detail": "How do we know your AI system can safely integrate with our legacy Sabre PSS without causing downtime for flight operations?",
            "difficulty": "hard",
            "tested": False,
        },
        {
            "id": "2",
            "title": "AI Fraud Risk",
            "detail": "Handling missing luggage and claims via AI sounds risky. What happens if the AI approves a fraudulent claim or misclassifies a case?",
            "difficulty": "hard",
            "tested": False,
        },
        {
            "id": "3",
            "title": "Cost vs Loyalty",
            "detail": "We already have a large call center. Will replacing parts of it with AI actually improve passenger loyalty, or just cut costs and frustrate users?",
            "difficulty": "medium",
            "tested": False,
        },
        {
            "id": "4",
            "title": "Internal Maintenance Burden",
            "detail": "We don't have AI engineers. How much ongoing effort is needed from our team to maintain and re-train these models?",
            "difficulty": "medium",
            "tested": False,
        },
        {
            "id": "5",
            "title": "Data Privacy",
            "detail": "Passengers trust us with PII — passport details, payment info, health data for special assistance. How does Ciklum guarantee this is never exposed or used to train public models?",
            "difficulty": "hard",
            "tested": False,
        },
    ],
}

# ── Session 1: Beginner attempt — vague, nervous, poor objection handling ─────

SESSION_1_ID = "seed-session-sw-001"
SESSION_1_TRANSCRIPT = [
    {
        "role": "seller",
        "content": (
            "Hi, thank you for taking the time to meet with me today. I'm here from Ciklum and we have "
            "a really exciting AI solution that can help airlines like SmartWings. "
            "Basically, it's a passenger tracking system that uses artificial intelligence to handle "
            "lots of different customer interactions automatically. It's quite innovative and we've had "
            "a lot of interest from airlines recently."
        ),
    },
    {
        "role": "buyer",
        "content": (
            "That sounds pretty generic. Every vendor claims their AI is innovative. What specifically "
            "does your system do that we can't already do with our current customer support tools?"
        ),
    },
    {
        "role": "seller",
        "content": (
            "Right, great question. So our system covers the full passenger journey — it handles "
            "things like booking inquiries, cancellations, claims, luggage issues. It uses AI to "
            "automate the responses and route them appropriately. It's very comprehensive. "
            "We've worked with a number of clients and they generally see cost savings and improved "
            "customer satisfaction."
        ),
    },
    {
        "role": "buyer",
        "content": (
            "What does 'generally see cost savings' actually mean? Can you give me a number? "
            "And how would this integrate with our Sabre PSS? We can't have anything that risks "
            "touching our flight operations systems."
        ),
    },
    {
        "role": "seller",
        "content": (
            "In terms of numbers, it kind of depends on the implementation and the scope of what you "
            "roll out. Some clients save quite a bit, others less so. It really varies. "
            "Regarding Sabre integration — yes, we do work with legacy systems. Our team is experienced "
            "with integrations. We'd need to look at your specific setup of course, but generally "
            "speaking we have done this kind of thing before. It usually goes fine."
        ),
    },
    {
        "role": "buyer",
        "content": (
            "'Usually goes fine' is not very reassuring when we're talking about a system connected to "
            "flight operations. What's your actual track record with Sabre? And what happens if "
            "something goes wrong mid-integration?"
        ),
    },
    {
        "role": "seller",
        "content": (
            "I understand your concern. We take integration very seriously and have a thorough testing "
            "process. We would work closely with your IT team and have rollback procedures in place. "
            "I'd need to connect you with our technical team to go into the specifics. "
            "I think the important thing is that our AI solution overall is really well designed and "
            "your passengers would really see the difference in their experience. "
            "Would you be interested in setting up a demo with the technical team?"
        ),
    },
    {
        "role": "buyer",
        "content": (
            "Maybe. But I'm still not clear on the ROI, the integration risks, or how you handle our "
            "passengers' PII data. I need those answers before we go further."
        ),
    },
]

SESSION_1_SCORE = {
    "overall_score": 48,
    "objection_handling": 30,
    "communication_clarity": 62,
    "score_breakdown": {
        "clarity": 3,
        "relevance": 2,
        "groundedness": 1,
        "persuasiveness": 2,
        "objection_handling": 1,
        "conciseness": 3,
    },
    "strengths": [
        "Showed willingness to escalate to the technical team — a good instinct",
        "Maintained a professional, polite tone throughout the conversation",
        "Attempted to close with a next-step (demo request)",
    ],
    "weaknesses": [
        "No specific ROI numbers or case study references — vague 'cost savings' claim destroyed credibility",
        "Completely deflected the Sabre integration question without any concrete answer",
        "Did not address data privacy concerns at all despite the buyer explicitly raising them",
    ],
    "ai_feedback": (
        "This was a first attempt and that's clear. You opened well but immediately lost ground when "
        "pressed for specifics. The buyer asked about ROI twice and integration risk twice — these are "
        "the most critical questions in an enterprise sale and you had no satisfying answer for either. "
        "Saying costs 'generally' improve and integration 'usually goes fine' are the two phrases that "
        "lose deals. For your next session, prepare: (1) a concrete ROI metric (example: '40% handling "
        "time reduction at comparable airline customers'), and (2) a clear 3-step integration approach "
        "that specifically calls out how Ciklum has worked with Sabre or similar PSS systems before. "
        "These two things alone will transform your credibility."
    ),
    "evolution_analysis": (
        "This is your first session — so there is no baseline to compare against yet. The core "
        "pattern here is over-reliance on vague, generic language when the buyer challenges you. "
        "The good news: your instincts around tone and escalation to technical expertise are solid. "
        "Focus for session 2: lead with a concrete data point, and have a prepared answer for the "
        "integration question before you walk in."
    ),
    "next_difficulty": "beginner",
}

# ── Session 2: Intermediate — measurably better, still weak on privacy/close ─

SESSION_2_ID = "seed-session-sw-002"
SESSION_2_TRANSCRIPT = [
    {
        "role": "seller",
        "content": (
            "Good morning. I appreciate your time. "
            "I'll be direct — Ciklum's AI passenger activity system delivers, on average, a 40% "
            "reduction in agent handling time and a 22-point CSAT uplift within 6 months for airline "
            "clients of similar size to SmartWings. I'd like to show you how we'd get there for you. "
            "Can I start by asking: what's your single biggest pain point in passenger communications today?"
        ),
    },
    {
        "role": "buyer",
        "content": (
            "Missing luggage and claims are a nightmare — it clogs the call centre and passengers "
            "are furious when responses take days. But I've heard this 40% figure from other AI "
            "vendors too. What makes yours different, and how would it actually work with our Sabre PSS?"
        ),
    },
    {
        "role": "seller",
        "content": (
            "Great — missing luggage is exactly where we've seen the fastest ROI. Our AI handles the "
            "full claims intake, status updates, and escalation. Passengers get real-time SMS and "
            "app updates; only genuinely complex cases reach your agents. "
            "On Sabre — we have a pre-built connector for Sabre SynXis and PSS modules. "
            "We deploy through a middleware layer, which means we never touch flight ops systems "
            "directly. We run a 4-week parallel pilot first, so if anything looks wrong we catch it "
            "before it affects live operations. Would it help to walk through the technical architecture?"
        ),
    },
    {
        "role": "buyer",
        "content": (
            "A middleware layer sounds sensible, but I need specifics. Have you actually done a Sabre "
            "integration before, or are you selling us a first attempt? And what failsafe do you have "
            "if the AI makes a mistake on a claim — say it approves a fraudulent one?"
        ),
    },
    {
        "role": "seller",
        "content": (
            "We've delivered three integrations with Sabre PSS — I can share reference contacts "
            "from two airline customers post-call if that's useful. "
            "On fraud: our system runs a two-tier check. Tier 1 is automated AI triage. Any claim "
            "flagged as anomalous or above a configurable currency threshold immediately routes to a "
            "human agent — your team retains full approval control for high-risk cases. "
            "Tier 2 is an audit trail: every AI decision is logged with confidence scores so your "
            "compliance team can review. You're not handing a blank cheque to the AI — your agents "
            "stay in the loop where it matters."
        ),
    },
    {
        "role": "buyer",
        "content": (
            "That's actually a solid answer. But my CFO will ask about ROI within 12 months. "
            "How do I build that business case? And honestly — we have union agreements that limit "
            "how much we can automate. Will this work without shrinking our call centre headcount?"
        ),
    },
    {
        "role": "seller",
        "content": (
            "The union constraint is one we see often and our model fits well here. "
            "The AI takes over the repetitive, high-volume tier-0 contacts — status checks, "
            "simple rebooking, lost luggage registration. Your agents stay on the floor but handle "
            "escalations and complex empathy-heavy cases. In practice, productivity per agent goes up, "
            "headcount stays flat, and you handle volume growth without hiring. "
            "For the CFO: if your call centre handles 2 million passenger contacts yearly and we "
            "deflect 35-40% of them, that's 700,000+ fewer agent-handled cases. At a conservative "
            "$4 cost-per-contact, that's $2.8M in savings against a typical implementation cost of "
            "under $600K. ROI inside 12 months is very achievable, and I can build a customised "
            "financial model with your actual numbers."
        ),
    },
    {
        "role": "buyer",
        "content": (
            "Those numbers are compelling if they hold up. But I need to know about data security. "
            "Our passengers give us passport numbers, payment info, medical flags for special assistance "
            "requests. How does Ciklum handle all of that? And is any of this data used to train AI models?"
        ),
    },
    {
        "role": "seller",
        "content": (
            "All data stays within a dedicated tenant environment — we don't use a shared model. "
            "Your passenger data is encrypted and we are fully GDPR compliant. "
            "We don't use your data to train base models — it stays yours. "
            "I can send you our security documentation if you'd like to review the details."
        ),
    },
    {
        "role": "buyer",
        "content": (
            "That's fine as far as it goes, but I need more detail — certifications, exactly where "
            "the data is hosted, what happens if there's a breach. This needs to go through our CISO. "
            "Where are we on next steps?"
        ),
    },
    {
        "role": "seller",
        "content": (
            "Absolutely — I'll send you our full security dossier including SOC 2 Type II report and "
            "our data residency options, which include EU-hosted deployment on AWS Frankfurt. "
            "For next steps: I'd suggest a technical deep-dive call with your IT and CISO team in "
            "the next two weeks, and I'll prepare the customised ROI model for your CFO in parallel. "
            "Does that work for you?"
        ),
    },
    {
        "role": "buyer",
        "content": (
            "Yes, that works. I'll involve the CISO and IT lead. Send the model and the security pack "
            "by end of week."
        ),
    },
]

SESSION_2_SCORE = {
    "overall_score": 67,
    "objection_handling": 62,
    "communication_clarity": 76,
    "score_breakdown": {
        "clarity": 4,
        "relevance": 4,
        "groundedness": 3,
        "persuasiveness": 4,
        "objection_handling": 3,
        "conciseness": 3,
    },
    "strengths": [
        "Strong opening with a concrete ROI figure (40% handling time / 22-pt CSAT) — immediately established credibility",
        "Excellent handling of integration risk: pre-built Sabre connector, middleware layer, parallel pilot — structured and reassuring",
        "Union / headcount objection addressed with nuance and a credible productivity argument",
        "Solid ROI business case with real numbers that the CFO can validate",
    ],
    "weaknesses": [
        "Data privacy answer was thin — said 'dedicated tenant' and 'GDPR' but gave no certifications, hosting specifics, or breach protocols",
        "Close was too passive — proposed a call in 'two weeks' without locking a specific date or owner",
        "Conciseness dipped in the ROI section — the calculation was strong but could have been tighter",
    ],
    "ai_feedback": (
        "A significant improvement over your first session. You came in with data, handled the "
        "Sabre integration question with real confidence and structure (pre-built connector + "
        "middleware + parallel pilot is a great three-part answer), and your ROI calculation was "
        "genuinely compelling. The union constraint answer showed product-market empathy. "
        "Two things to fix for next time: (1) Data privacy is a red flag for airlines — you need a "
        "rehearsed, specific answer ready: SOC 2 Type II, ISO 27001, EU hosting options, explicit "
        "'your data is never used to train shared models', and a breach notification SLA. When the "
        "buyer asks, you should be able to rattle this off without hesitation. (2) Close stronger. "
        "Instead of 'two weeks', propose a specific date and make the buyer confirm it on the call. "
        "Vague next steps kill deals in procurement cycles."
    ),
    "evolution_analysis": (
        "Comparing this to Session 1, the improvement is substantial and unmistakable. "
        "You eliminated the 'vague cost savings' problem entirely and replaced it with a structured "
        "ROI argument. The integration handling went from a complete deflection to one of the strongest "
        "parts of your pitch. These are the two areas where your coach directly challenged you and "
        "you clearly worked on them. "
        "For Session 3, the focus must be data privacy and commercial close. The buyer is signalling "
        "they are close to moving forward — your job next time is to walk in with a crisp privacy "
        "answer (SOC 2 + ISO 27001 + data residency + breach SLA) and to close with a locked date "
        "rather than an open window. If you do those two things well, this deal moves to procurement."
    ),
    "next_difficulty": "intermediate",
}


# ── Qdrant session memory texts ───────────────────────────────────────────────

SESSION_MEMORY_TEXTS = [
    {
        "text": (
            "[Session 1 — Seller key moment]\n"
            "In terms of numbers, it kind of depends on the implementation and the scope of what you "
            "roll out. Some clients save quite a bit, others less so. It really varies. "
            "Regarding Sabre integration — yes, we do work with legacy systems. Our team is experienced "
            "with integrations. It usually goes fine."
        ),
        "metadata": {
            "type": "session_memory",
            "session_id": SESSION_1_ID,
            "session_number": 1,
            "project_id": PROJECT_ID,
            "score": 48,
            "label": "vague_roi_integration_deflection",
        },
    },
    {
        "text": (
            "[Session 1 — AI Coach Advice]\n"
            "Prepare: (1) a concrete ROI metric — example: 40 percent handling time reduction at "
            "comparable airline customers. (2) A clear 3-step integration approach that specifically "
            "calls out how Ciklum has worked with Sabre or similar PSS systems before. "
            "These two things alone will transform your credibility."
        ),
        "metadata": {
            "type": "session_memory",
            "session_id": SESSION_1_ID,
            "session_number": 1,
            "project_id": PROJECT_ID,
            "score": 48,
            "label": "coaching_advice_s1",
        },
    },
    {
        "text": (
            "[Session 2 — Seller key moment]\n"
            "On Sabre: we have a pre-built connector for Sabre SynXis and PSS modules. "
            "We deploy through a middleware layer, which means we never touch flight ops systems "
            "directly. We run a 4-week parallel pilot first, so if anything looks wrong we catch it "
            "before it affects live operations. We've delivered three integrations with Sabre PSS — "
            "I can share reference contacts from two airline customers post-call."
        ),
        "metadata": {
            "type": "session_memory",
            "session_id": SESSION_2_ID,
            "session_number": 2,
            "project_id": PROJECT_ID,
            "score": 67,
            "label": "improved_integration_answer",
        },
    },
    {
        "text": (
            "[Session 2 — ROI argument]\n"
            "If your call centre handles 2 million passenger contacts yearly and we deflect 35-40 "
            "percent of them, that's 700,000+ fewer agent-handled cases. At a conservative $4 "
            "cost-per-contact, that's $2.8M in savings against a typical implementation cost of under "
            "$600K. ROI inside 12 months is very achievable."
        ),
        "metadata": {
            "type": "session_memory",
            "session_id": SESSION_2_ID,
            "session_number": 2,
            "project_id": PROJECT_ID,
            "score": 67,
            "label": "roi_calculation",
        },
    },
    {
        "text": (
            "[Session 2 — Weakness: Data Privacy]\n"
            "Seller answer: 'All data stays within a dedicated tenant environment. Your passenger data "
            "is encrypted and we are fully GDPR compliant. We don't use your data to train base models.' "
            "Coach note: This answer lacked specifics. Missing: SOC 2 Type II certification, ISO 27001, "
            "EU data residency (AWS Frankfurt), breach notification SLA. The CISO will expect all of "
            "these. Seller must be able to deliver this without hesitation in Session 3."
        ),
        "metadata": {
            "type": "session_memory",
            "session_id": SESSION_2_ID,
            "session_number": 2,
            "project_id": PROJECT_ID,
            "score": 67,
            "label": "weakness_data_privacy",
        },
    },
    {
        "text": (
            "[Session 2 — Coaching Advice]\n"
            "Data privacy is a red flag for airlines. Rehearsed answer for next session: "
            "SOC 2 Type II, ISO 27001, EU-hosted deployment (AWS Frankfurt), data never used to train "
            "shared models, breach notification SLA under 72 hours in line with GDPR Article 33. "
            "Close stronger — propose a specific date on the call, not an open two-week window."
        ),
        "metadata": {
            "type": "session_memory",
            "session_id": SESSION_2_ID,
            "session_number": 2,
            "project_id": PROJECT_ID,
            "score": 67,
            "label": "coaching_advice_s2",
        },
    },
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _session_exists(db, session_id: str) -> bool:
    return db.query(Session).filter_by(id=session_id).first() is not None


def _profile_exists(db) -> bool:
    return db.query(SparringProfile).filter_by(project_id=PROJECT_ID).first() is not None


def _insert_session(db, session_id: str, transcript: list[dict], score: dict,
                    days_ago: int) -> None:
    ts = datetime.utcnow() - timedelta(days=days_ago)

    session_record = Session(
        id=session_id,
        project_id=PROJECT_ID,
        scenario_id=SCENARIO_ID,
        transcript_json=json.dumps(transcript),
        created_at=ts,
    )
    db.merge(session_record)

    score_record = SessionScore(
        session_id=session_id,
        project_id=PROJECT_ID,
        overall_score=score["overall_score"],
        objection_handling=score["objection_handling"],
        communication_clarity=score["communication_clarity"],
        weaknesses_json=json.dumps(score.get("weaknesses", [])),
        created_at=ts,
    )
    db.add(score_record)
    db.commit()


def _upsert_profile(db) -> None:
    profile = db.query(SparringProfile).filter_by(project_id=PROJECT_ID).first()
    if not profile:
        profile = SparringProfile(project_id=PROJECT_ID)
        db.add(profile)

    profile.current_level = "intermediate"
    profile.sessions_count = 2
    profile.priority_weaknesses_json = json.dumps(
        SESSION_2_SCORE["weaknesses"][:3]
    )
    profile.updated_at = datetime.utcnow()
    db.commit()


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print(f"🌱  Seeding demo session data for SmartWings / project='{PROJECT_ID}' …\n")

    # 1. Init DB tables
    init_db()

    # 2. Save scenario
    existing = get_scenario(SCENARIO_ID)
    if existing:
        print(f"ℹ️  Scenario '{SCENARIO_ID}' already exists — skipping.")
    else:
        save_scenario(SCENARIO_ID, SCENARIO)
        print(f"✅  SmartWings scenario saved.")

    # 3. Insert sessions
    db = _make_session()
    try:
        if _session_exists(db, SESSION_1_ID):
            print(f"ℹ️  Session 1 ({SESSION_1_ID}) already exists — skipping.")
        else:
            _insert_session(db, SESSION_1_ID, SESSION_1_TRANSCRIPT, SESSION_1_SCORE, days_ago=6)
            print(f"✅  Session 1 inserted (score={SESSION_1_SCORE['overall_score']}, "
                  f"id={SESSION_1_ID}).")

        if _session_exists(db, SESSION_2_ID):
            print(f"ℹ️  Session 2 ({SESSION_2_ID}) already exists — skipping.")
        else:
            _insert_session(db, SESSION_2_ID, SESSION_2_TRANSCRIPT, SESSION_2_SCORE, days_ago=2)
            print(f"✅  Session 2 inserted (score={SESSION_2_SCORE['overall_score']}, "
                  f"id={SESSION_2_ID}).")

        # 4. Upsert sparring profile
        _upsert_profile(db)
        print(f"✅  SparringProfile for '{PROJECT_ID}' set: "
              f"sessions_count=2, level=intermediate.")
    finally:
        db.close()

    # 5. Embed session memories into Qdrant
    print("\n🧠  Embedding session memories into Qdrant …")
    try:
        llm = LLMClient()
        ensure_collection()

        texts = [m["text"] for m in SESSION_MEMORY_TEXTS]
        embeddings = llm.embed(texts)

        chunks = [
            {
                "embedding": emb,
                "text": mem["text"],
                "metadata": mem["metadata"],
            }
            for emb, mem in zip(embeddings, SESSION_MEMORY_TEXTS)
        ]
        index_chunks(chunks)
        print(f"✅  {len(chunks)} session memory vectors upserted to Qdrant.")
    except Exception as exc:
        print(f"⚠️  Qdrant upsert failed (continuing anyway): {exc}")

    print(
        "\n🎉  Done!  Load the SmartWings Demo scenario in the app and "
        "start Session 3 — the agent will push on data privacy and closing.\n"
    )


if __name__ == "__main__":
    main()
