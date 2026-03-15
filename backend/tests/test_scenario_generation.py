from __future__ import annotations

import os
import re
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")
os.environ.setdefault("QDRANT_URL", "http://localhost:6333")
os.environ.setdefault("QDRANT_API_KEY", "test-qdrant-key")

from app.modules import scenario_builder, suggestion_engine


class ScenarioBuilderTests(unittest.TestCase):
    def test_normalize_generated_scenario_preserves_requested_project_identity(self) -> None:
        scenario = scenario_builder._normalize_generated_scenario(
            {
                "client_profile": {
                    "name": "SmartWings",
                    "size": "Enterprise",
                    "budget_cycle": "Q4",
                    "decision_timeline": "3 months",
                    "buyer_persona": "VP of Operations",
                },
                "value_proposition": "Legacy value proposition",
                "buying_constraints": ["Legacy constraint"],
                "objections": [],
            },
            client_name="Acme Corp",
            sector="saas",
            requirements="Needs a secure migration plan",
            buyer_persona="Chief Technology Officer",
            client_research={"summary": "Fresh research"},
        )

        self.assertEqual(scenario["client_profile"]["name"], "Acme Corp")
        self.assertEqual(
            scenario["client_profile"]["buyer_persona"],
            "Chief Technology Officer",
        )
        self.assertEqual(
            scenario["generation_context"],
            {
                "client_name": "Acme Corp",
                "sector": "saas",
                "requirements": "Needs a secure migration plan",
                "buyer_persona": "Chief Technology Officer",
            },
        )
        self.assertEqual(scenario["client_research"], {"summary": "Fresh research"})
        self.assertRegex(
            scenario["scenario_id"],
            re.compile(r"^scenario_acme_corp_[a-f0-9]{8}$"),
        )


class SuggestionEngineTests(unittest.TestCase):
    @patch.object(suggestion_engine.vector_store, "search")
    @patch.object(suggestion_engine._llm, "embed_single")
    def test_uploaded_doc_retrieval_is_scoped_to_uploaded_document_vectors(
        self,
        embed_single_mock,
        search_mock,
    ) -> None:
        embed_single_mock.return_value = [0.1, 0.2, 0.3]
        search_mock.return_value = [
            {
                "text": "Proof point from the uploaded battlecard.",
                "metadata": {
                    "filename": "battlecard.pdf",
                    "doc_type": "uploaded_document",
                },
            }
        ]

        result = suggestion_engine._retrieve_docs(
            "Need a proof point for rollout risk",
            "scenario_acme_12345678",
            top_k=3,
        )

        search_mock.assert_called_once_with(
            [0.1, 0.2, 0.3],
            top_k=3,
            filters={
                "project_id": "scenario_acme_12345678",
                "doc_type": "uploaded_document",
            },
        )
        self.assertIn("battlecard.pdf", result)


if __name__ == "__main__":
    unittest.main()
