"""OpenAI LLM wrapper for generation and embeddings."""
import json
from typing import Any
from openai import OpenAI
from app.config import get_settings


class LLMClient:
    def __init__(self):
        settings = get_settings()
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model
        self.embedding_model = settings.openai_embedding_model

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        """Generate a plain-text response."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()

    def generate_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        """Generate a structured JSON response using OpenAI JSON mode."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt + "\nYou MUST respond with valid JSON only."},
                {"role": "user", "content": user_prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        raw = response.choices[0].message.content.strip()
        return json.loads(raw)

    def embed(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a list of texts."""
        # OpenAI embeddings API can handle batches
        response = self.client.embeddings.create(
            model=self.embedding_model,
            input=texts,
        )
        return [item.embedding for item in response.data]

    def embed_single(self, text: str) -> list[float]:
        """Convenience method for a single text embedding."""
        return self.embed([text])[0]
