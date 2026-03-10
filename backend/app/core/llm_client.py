"""OpenAI LLM wrapper for generation and embeddings."""
import json
import logging
from typing import Any
from openai import (
    APIConnectionError,
    APIError,
    AuthenticationError,
    OpenAI,
    PermissionDeniedError,
    RateLimitError,
)
from app.config import get_settings

logger = logging.getLogger(__name__)


class LLMServiceError(RuntimeError):
    def __init__(self, message: str, *, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


class LLMClient:
    def __init__(self):
        settings = get_settings()
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model
        self.embedding_model = settings.openai_embedding_model

    def _translate_error(self, exc: Exception) -> LLMServiceError:
        if isinstance(exc, AuthenticationError):
            logger.warning("OpenAI authentication failed: %s", exc.__class__.__name__)
            return LLMServiceError(
                "OpenAI authentication failed. Check OPENAI_API_KEY in backend/.env.",
                status_code=500,
            )

        if isinstance(exc, PermissionDeniedError):
            logger.warning("OpenAI permission denied: %s", exc.__class__.__name__)
            return LLMServiceError(
                "OpenAI rejected this request. Check your project permissions and model access.",
                status_code=502,
            )

        if isinstance(exc, RateLimitError):
            logger.warning("OpenAI rate limit hit: %s", exc.__class__.__name__)
            return LLMServiceError(
                "OpenAI rate limit reached. Retry in a moment.",
                status_code=503,
            )

        if isinstance(exc, APIConnectionError):
            logger.warning("OpenAI connection error: %s", exc.__class__.__name__)
            return LLMServiceError(
                "Could not reach OpenAI. Check network access and try again.",
                status_code=503,
            )

        if isinstance(exc, APIError):
            logger.warning("OpenAI API error: %s", exc.__class__.__name__)
            return LLMServiceError(
                "OpenAI returned an unexpected error.",
                status_code=502,
            )

        return LLMServiceError("Unexpected LLM error.", status_code=500)

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        """Generate a plain-text response."""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
            )
        except Exception as exc:
            raise self._translate_error(exc) from exc
        return response.choices[0].message.content.strip()

    def generate_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        """Generate a structured JSON response using OpenAI JSON mode."""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt + "\nYou MUST respond with valid JSON only."},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
            )
        except Exception as exc:
            raise self._translate_error(exc) from exc
        raw = response.choices[0].message.content.strip()
        return json.loads(raw)

    def embed(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a list of texts."""
        # OpenAI embeddings API can handle batches
        try:
            response = self.client.embeddings.create(
                model=self.embedding_model,
                input=texts,
            )
        except Exception as exc:
            raise self._translate_error(exc) from exc
        return [item.embedding for item in response.data]

    def embed_single(self, text: str) -> list[float]:
        """Convenience method for a single text embedding."""
        return self.embed([text])[0]
