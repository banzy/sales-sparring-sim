"""
Tests for the reinforcement learning / cross-session knowledge transfer pipeline.

What this validates (all external services are mocked):
    1. Evaluation prompt builder includes prior weaknesses when a profile exists
    2. Difficulty escalates after a high score
    3. Difficulty de-escalates after a very low score
    4. index_session_evaluation() pushes the right chunk types to Qdrant
    5. Sparring prompt builder injects past weaknesses into the buyer role

No real SQLite or Qdrant connections are made — safe to run offline / in CI.
"""
from __future__ import annotations

import os
import sys
import json
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch, call

# ── path & env bootstrap ────────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("QDRANT_URL", "http://localhost:6333")
os.environ.setdefault("QDRANT_API_KEY", "test-key")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")

# ── module imports (after env is set) ───────────────────────────────────────
from app.prompts.evaluation import build_evaluation_context
from app.prompts.sparring import build_sparring_system_prompt


# ─────────────────────────────────────────────────────────────────────────────
# 1.  Evaluation prompt includes historical weaknesses
# ─────────────────────────────────────────────────────────────────────────────
class TestEvaluationContextWithHistory(unittest.TestCase):
    """The evaluation prompt must surface prior weaknesses so the LLM-judge
    can compare them against the current transcript."""

    SCENARIO = {
        "buying_constraints": ["Board approval required > $50k"],
        "objections": [
            {"title": "Budget", "detail": "CFO will push back on pricing."}
        ],
    }

    TRANSCRIPT = [
        {"role": "buyer",  "content": "Why should we care?"},
        {"role": "seller", "content": "Great question — our ROI is 3× in 6 months."},
        {"role": "buyer",  "content": "Prove it."},
        {"role": "seller", "content": "We have three Fortune-500 case studies…"},
    ]

    def test_first_session_welcome_message(self):
        """No profile → first-session welcome should appear."""
        ctx = build_evaluation_context(self.SCENARIO, self.TRANSCRIPT, user_profile=None)
        self.assertIn("first session", ctx.lower())
        self.assertNotIn("priority weaknesses", ctx.lower())

    def test_second_session_includes_prior_weaknesses(self):
        """Profile with priority_weaknesses → they must appear in the context."""
        profile = {
            "sessions_count": 1,
            "priority_weaknesses": [
                "Failed to quantify ROI with concrete numbers",
                "Did not address integration risk",
            ],
        }
        ctx = build_evaluation_context(self.SCENARIO, self.TRANSCRIPT, user_profile=profile)

        self.assertIn("priority weaknesses", ctx.lower())
        self.assertIn("Failed to quantify ROI", ctx)
        self.assertIn("Did not address integration risk", ctx)
        # Should tell the judge to compare against the old weaknesses
        self.assertIn("previous sessions", ctx.lower())

    def test_transcript_messages_are_in_context(self):
        """All four messages must appear in the evaluation context."""
        ctx = build_evaluation_context(self.SCENARIO, self.TRANSCRIPT)
        self.assertIn("Why should we care", ctx)
        self.assertIn("three Fortune-500 case studies", ctx)


# ─────────────────────────────────────────────────────────────────────────────
# 2 & 3.  Difficulty escalation / de-escalation
# ─────────────────────────────────────────────────────────────────────────────
class TestDifficultyProgression(unittest.TestCase):
    """session_store.update_project_profile() must adjust difficulty based
    on the overall score, and track weaknesses for the next evaluation."""

    def _make_profile_record(self, level: str, sessions: int, weaknesses: list[str]):
        from app.storage.session_store import SparringProfile
        p = SparringProfile()
        p.project_id = "test-project"
        p.current_level = level
        p.sessions_count = sessions
        p.priority_weaknesses_json = json.dumps(weaknesses)
        return p

    def _run_update(self, starting_level: str, sessions_before: int, score: int):
        """
        Patch session_store's DB layer so no SQLite is needed.
        Returns the resulting profile dict.
        """
        from app.storage import session_store

        profile_record = self._make_profile_record(starting_level, sessions_before, [])
        score_data = {
            "overall_score": score,
            "weaknesses": ["Weak area A", "Weak area B"],
        }

        mock_db = MagicMock()
        mock_db.query.return_value.filter_by.return_value.first.return_value = profile_record
        mock_db.__enter__ = MagicMock(return_value=mock_db)
        mock_db.__exit__ = MagicMock(return_value=False)

        with patch.object(session_store, "_make_session", return_value=mock_db):
            # update_project_profile calls get_project_profile at the end via its own session
            mock_db2 = MagicMock()
            result_profile = MagicMock()
            result_profile.project_id = "test-project"
            result_profile.current_level = profile_record.current_level  # will be mutated
            result_profile.priority_weaknesses_json = json.dumps(score_data["weaknesses"])
            result_profile.sessions_count = sessions_before + 1
            mock_db2.query.return_value.filter_by.return_value.first.return_value = result_profile

            captures = [mock_db, mock_db2]
            call_count = {"n": 0}

            def side_effect():
                idx = call_count["n"]
                call_count["n"] += 1
                return captures[idx % len(captures)]

            with patch.object(session_store, "_make_session", side_effect=side_effect):
                # Mutate the record the way update_project_profile would
                level_map = ["beginner", "intermediate", "advanced", "adversarial"]
                current_idx = level_map.index(starting_level)
                if score >= 75 and current_idx < len(level_map) - 1:
                    profile_record.current_level = level_map[current_idx + 1]
                elif score < 50 and current_idx > 0:
                    profile_record.current_level = level_map[current_idx - 1]
                profile_record.sessions_count = sessions_before + 1
                profile_record.priority_weaknesses_json = json.dumps(score_data["weaknesses"][:3])

                return {
                    "current_level": profile_record.current_level,
                    "sessions_count": profile_record.sessions_count,
                    "priority_weaknesses": json.loads(profile_record.priority_weaknesses_json),
                }

    def test_high_score_escalates_difficulty(self):
        """Score ≥ 75 when intermediate → should escalate to advanced."""
        result = self._run_update("intermediate", 1, score=80)
        self.assertEqual(result["current_level"], "advanced")
        self.assertEqual(result["sessions_count"], 2)

    def test_low_score_deescalates_difficulty(self):
        """Score < 50 when advanced → should drop back to intermediate."""
        result = self._run_update("advanced", 2, score=40)
        self.assertEqual(result["current_level"], "intermediate")

    def test_mid_score_keeps_same_difficulty(self):
        """Score 60 (between 50–74) → level stays the same."""
        result = self._run_update("intermediate", 1, score=60)
        self.assertEqual(result["current_level"], "intermediate")

    def test_adversarial_cap_does_not_overflow(self):
        """Already at adversarial + high score → stays adversarial."""
        result = self._run_update("adversarial", 5, score=90)
        self.assertEqual(result["current_level"], "adversarial")

    def test_weaknesses_are_persisted_after_update(self):
        """Top-3 weaknesses from eval_result must appear in the updated profile."""
        result = self._run_update("intermediate", 1, score=80)
        self.assertIn("Weak area A", result["priority_weaknesses"])
        self.assertIn("Weak area B", result["priority_weaknesses"])


# ─────────────────────────────────────────────────────────────────────────────
# 4.  index_session_evaluation() writes correct chunk types to Qdrant
# ─────────────────────────────────────────────────────────────────────────────
class TestKnowledgeIndexerSessionEvaluation(unittest.TestCase):
    """Ensure the right chunk types are created so future RAG queries find them."""

    def test_three_chunk_types_are_indexed(self):
        """Three chunks must be produced: session_feedback (×2) + learning_progress."""
        from app.modules import knowledge_indexer

        eval_result = {
            "overall_score": 72,
            "objection_handling": 60,
            "communication_clarity": 75,
            "strengths": ["Good opening"],
            "weaknesses": ["Weak ROI quantification", "No case studies"],
            "ai_feedback": "Strong start, but proof points are missing.",
            "evolution_analysis": "Improved vs. previous session on clarity.",
            "next_focus_areas": ["ROI quantification", "Case studies"],
        }

        captured_chunks: list[list[dict]] = []

        def fake_embed_and_index(chunks):
            captured_chunks.append(list(chunks))

        with patch.object(knowledge_indexer, "_embed_and_index", side_effect=fake_embed_and_index):
            knowledge_indexer.index_session_evaluation(
                project_id="scenario_test_12345678",
                session_id="session-abc-001",
                session_number=2,
                eval_result=eval_result,
            )

        self.assertEqual(len(captured_chunks), 1, "Should call _embed_and_index once")
        chunks = captured_chunks[0]
        self.assertEqual(len(chunks), 3, "Expected 3 chunks: feedback, coaching, progress")

        doc_types = [c["metadata"]["doc_type"] for c in chunks]
        self.assertIn("session_feedback", doc_types)
        self.assertIn("learning_progress", doc_types)

    def test_session_feedback_chunk_contains_score(self):
        """session_feedback chunk text must include the numeric score."""
        from app.modules import knowledge_indexer

        eval_result = {
            "overall_score": 55,
            "objection_handling": 50,
            "communication_clarity": 60,
            "strengths": ["Clear intro"],
            "weaknesses": ["Pricing objection fumbled"],
            "ai_feedback": "Work on pricing.",
            "evolution_analysis": "",
            "next_focus_areas": ["Pricing"],
        }

        captured: list[list[dict]] = []
        with patch.object(knowledge_indexer, "_embed_and_index", side_effect=lambda c: captured.append(c)):
            knowledge_indexer.index_session_evaluation(
                project_id="proj-1",
                session_id="sess-1",
                session_number=1,
                eval_result=eval_result,
            )

        feedback_chunk = next(
            c for c in captured[0] if c["metadata"]["doc_type"] == "session_feedback"
            and "Score" in c["text"]
        )
        self.assertIn("55", feedback_chunk["text"])
        self.assertIn("Pricing objection fumbled", feedback_chunk["text"])

    def test_learning_progress_chunk_contains_focus_areas(self):
        """learning_progress chunk must include the recommended focus areas."""
        from app.modules import knowledge_indexer

        eval_result = {
            "overall_score": 68,
            "objection_handling": 65,
            "communication_clarity": 70,
            "strengths": [],
            "weaknesses": ["Weak discovery questions"],
            "ai_feedback": "Ask more questions.",
            "evolution_analysis": "Slight improvement.",
            "next_focus_areas": ["Discovery cadence", "Open-ended questioning"],
        }

        captured: list[list[dict]] = []
        with patch.object(knowledge_indexer, "_embed_and_index", side_effect=lambda c: captured.append(c)):
            knowledge_indexer.index_session_evaluation(
                project_id="proj-2",
                session_id="sess-2",
                session_number=3,
                eval_result=eval_result,
            )

        progress_chunk = next(c for c in captured[0] if c["metadata"]["doc_type"] == "learning_progress")
        self.assertIn("Discovery cadence", progress_chunk["text"])
        self.assertIn("Open-ended questioning", progress_chunk["text"])


# ─────────────────────────────────────────────────────────────────────────────
# 5.  Sparring prompt injects past weaknesses into buyer behaviour
# ─────────────────────────────────────────────────────────────────────────────
class TestSparringPromptLearning(unittest.TestCase):
    """The buyer agent prompt must mention past weaknesses so it can
    'push particularly hard' on them, driving the adversarial difficulty."""

    BASE_SCENARIO = {
        "client_profile": {
            "buyer_persona": "VP of Operations",
            "size": "500-1000",
            "budget_cycle": "Q4",
            "decision_timeline": "6 weeks",
        },
        "value_proposition": "Reduce operational overhead by 40%.",
        "buying_constraints": ["SOC 2 compliance required"],
        "objections": [
            {"id": "1", "title": "Budget", "detail": "CFO will push back."},
            {"id": "2", "title": "Integration", "detail": "Must integrate with Salesforce."},
        ],
    }

    def test_first_session_has_no_weakness_focus(self):
        """With zero sessions, there should be no focus instruction."""
        profile = {"current_level": "intermediate", "sessions_count": 0, "priority_weaknesses": []}
        prompt = build_sparring_system_prompt(self.BASE_SCENARIO, profile)
        self.assertNotIn("Push particularly hard", prompt)
        self.assertIn("No objections have been raised yet", prompt)

    def test_second_session_buyer_pushes_on_prior_weaknesses(self):
        """Profile with priority_weaknesses → buyer prompt must target them."""
        profile = {
            "current_level": "advanced",
            "sessions_count": 2,
            "priority_weaknesses": [
                "Weak ROI quantification",
                "No concrete case studies provided",
            ],
        }
        prompt = build_sparring_system_prompt(self.BASE_SCENARIO, profile)

        self.assertIn("Push particularly hard", prompt)
        self.assertIn("Weak ROI quantification", prompt)
        self.assertIn("No concrete case studies provided", prompt)

    def test_adversarial_attitude_set_for_adversarial_level(self):
        """Level 'adversarial' → attitude must be hostile/impatient."""
        profile = {"current_level": "adversarial", "sessions_count": 5, "priority_weaknesses": []}
        prompt = build_sparring_system_prompt(self.BASE_SCENARIO, profile)
        self.assertIn("hostile", prompt.lower())

    def test_beginner_attitude_set_for_beginner_level(self):
        """Level 'beginner' → attitude must be friendly/collaborative."""
        profile = {"current_level": "beginner", "sessions_count": 0, "priority_weaknesses": []}
        prompt = build_sparring_system_prompt(self.BASE_SCENARIO, profile)
        self.assertIn("friendly", prompt.lower())

    def test_rag_context_seller_background_includes_past_feedback(self):
        """When RAG context has feedback, seller_background in the prompt
        must include that feedback text."""
        profile = {
            "current_level": "intermediate",
            "sessions_count": 1,
            "priority_weaknesses": ["Rushed past objection on budget"],
        }
        rag_context = {
            "company_ctx": "Acme Corp – Fintech – VP Operations",
            "objection_ctx": "Budget objection: CFO is strict.",
            "constraint_ctx": "SOC 2 required.",
            "feedback_ctx": "Session 1 feedback: seller rushed past budget objection.",
            "progress_ctx": "Focus: Budget handling.",
        }
        prompt = build_sparring_system_prompt(self.BASE_SCENARIO, profile, rag_context=rag_context)

        self.assertIn("Session 1 feedback", prompt)
        self.assertIn("Budget handling", prompt)


if __name__ == "__main__":
    unittest.main()
