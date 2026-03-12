"""
One-off backfill for relevance/groundedness metrics in session_scores.

This script intentionally avoids importing the full backend stack or calling the LLM.
It writes known-good values for the seeded SmartWings demo sessions directly into
the local SQLite database (backend/sparring.db).

Usage (from backend/):
  python scripts/backfill_session_metrics.py
"""

from __future__ import annotations

import sqlite3
from pathlib import Path


# These IDs/scores come from backend/scripts/seed_demo_sessions.py
SEED_BACKFILL = {
    # SESSION_1_ID
    "seed-session-sw-001": {
        # score_breakdown.relevance = 2 (1–10 scale) → 20 / 100
        "relevance": 20,
        # score_breakdown.groundedness = 1 → 10 / 100
        "groundedness": 10,
    },
    # SESSION_2_ID
    "seed-session-sw-002": {
        # score_breakdown.relevance = 4 → 40 / 100
        "relevance": 40,
        # score_breakdown.groundedness = 3 → 30 / 100
        "groundedness": 30,
    },
}


def backfill() -> None:
    db_path = Path(__file__).resolve().parent.parent / "sparring.db"
    if not db_path.exists():
        print(f"Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    try:
        cursor = conn.cursor()

        total_updated = 0
        for session_id, scores in SEED_BACKFILL.items():
            cursor.execute(
                """
                UPDATE session_scores
                SET relevance = COALESCE(relevance, :relevance),
                    groundedness = COALESCE(groundedness, :groundedness)
                WHERE session_id = :session_id
                """,
                {
                    "session_id": session_id,
                    "relevance": scores["relevance"],
                    "groundedness": scores["groundedness"],
                },
            )
            updated = cursor.rowcount
            total_updated += updated
            print(f"  ✓ {session_id}: {updated} row(s) updated")

        conn.commit()
        print(f"Backfill complete. Total rows updated: {total_updated}")
    finally:
        conn.close()


if __name__ == "__main__":
    backfill()

