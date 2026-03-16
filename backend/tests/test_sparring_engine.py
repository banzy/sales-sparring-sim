from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")
os.environ.setdefault("QDRANT_URL", "http://localhost:6333")
os.environ.setdefault("QDRANT_API_KEY", "test-qdrant-key")

from app.models.schemas import SparringChatResponse
from app.modules import sparring_engine


class SparringEngineResponseNormalizationTests(unittest.TestCase):
    def test_next_turn_normalizes_malformed_turn_feedback(self) -> None:
        scenario = {
            "objections": [
                {"id": "budget", "title": "Budget", "detail": "We do not have budget approval."}
            ]
        }

        with patch.object(
            sparring_engine._llm,
            "generate_json",
            return_value={
                "buyer_response": "Show me proof this will pay off.",
                "turn_feedback": {
                    "handled_well": "handled_well",
                    "comment": ["not a string"],
                    "weakness_tags": "No proof offered",
                },
                "objections_triggered": [{"id": "budget", "title": "Budget"}],
            },
        ):
            result = sparring_engine.next_turn(
                scenario=scenario,
                profile={},
                history=[],
                user_reply="We can improve your margins quickly.",
            )

        parsed = SparringChatResponse(**result)

        self.assertEqual(parsed.buyer_response, "Show me proof this will pay off.")
        self.assertFalse(parsed.turn_feedback.handled_well)
        self.assertEqual(parsed.turn_feedback.comment, "Feedback unavailable.")
        self.assertEqual(parsed.turn_feedback.weakness_tags, ["No proof offered"])
        self.assertEqual(parsed.objections_triggered[0].id, "budget")

    def test_normalize_turn_feedback_accepts_common_boolean_strings(self) -> None:
        feedback = sparring_engine._normalize_turn_feedback(
            {
                "handled_well": "true",
                "comment": "Good answer.",
                "weakness_tags": ["Could add more data"],
            }
        )

        self.assertTrue(feedback["handled_well"])
        self.assertEqual(feedback["comment"], "Good answer.")
        self.assertEqual(feedback["weakness_tags"], ["Could add more data"])


if __name__ == "__main__":
    unittest.main()
