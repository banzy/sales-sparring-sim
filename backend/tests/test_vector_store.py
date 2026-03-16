from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

os.environ.setdefault("OPENAI_API_KEY", "test-openai-key")
os.environ.setdefault("QDRANT_URL", "http://localhost:6333")
os.environ.setdefault("QDRANT_API_KEY", "test-qdrant-key")

from app.storage import vector_store


class QueryPointsClient:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    def query_points(self, **kwargs):
        self.calls.append(kwargs)
        return SimpleNamespace(
            points=[
                SimpleNamespace(
                    payload={"text": "Modern result", "project_id": "scenario-1"},
                    score=0.92,
                )
            ]
        )


class LegacySearchClient:
    def __init__(self) -> None:
        self.calls: list[dict] = []

    def search(self, **kwargs):
        self.calls.append(kwargs)
        return [
            SimpleNamespace(
                payload={"text": "Legacy result", "project_id": "scenario-2"},
                score=0.75,
            )
        ]


class VectorStoreSearchTests(unittest.TestCase):
    def test_search_uses_query_points_when_available(self) -> None:
        client = QueryPointsClient()
        settings = SimpleNamespace(qdrant_collection="sales_sparring_kb")

        with patch.object(vector_store, "get_settings", return_value=settings), patch.object(
            vector_store, "_get_client", return_value=client
        ):
            hits = vector_store.search(
                [0.1, 0.2, 0.3],
                top_k=4,
                filters={"project_id": "scenario-1"},
            )

        self.assertEqual(hits, [{"text": "Modern result", "score": 0.92, "metadata": {"project_id": "scenario-1"}}])
        self.assertEqual(client.calls[0]["query"], [0.1, 0.2, 0.3])
        self.assertEqual(client.calls[0]["limit"], 4)
        self.assertIsNotNone(client.calls[0]["query_filter"])

    def test_search_falls_back_to_legacy_search_api(self) -> None:
        client = LegacySearchClient()
        settings = SimpleNamespace(qdrant_collection="sales_sparring_kb")

        with patch.object(vector_store, "get_settings", return_value=settings), patch.object(
            vector_store, "_get_client", return_value=client
        ):
            hits = vector_store.search([0.4, 0.5], top_k=2)

        self.assertEqual(hits, [{"text": "Legacy result", "score": 0.75, "metadata": {"project_id": "scenario-2"}}])
        self.assertEqual(client.calls[0]["query_vector"], [0.4, 0.5])
        self.assertEqual(client.calls[0]["limit"], 2)
        self.assertIsNone(client.calls[0]["query_filter"])


if __name__ == "__main__":
    unittest.main()
