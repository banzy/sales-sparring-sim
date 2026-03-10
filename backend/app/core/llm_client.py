"""LLM wrapper supporting OpenAI and Perplexity for generation and embeddings."""
import json
import logging
import re
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
    def __init__(self, provider: str | None = None):
        """
        Initialize the LLM client.
        
        Args:
            provider: Force a specific provider ("openai" or "perplexity").
                      If None, uses LLM_PROVIDER from settings.
        """
        settings = get_settings()
        self.provider = provider or settings.llm_provider
        
        if self.provider == "perplexity":
            self._init_perplexity(settings)
        else:
            self._init_openai(settings)
        
        self.openai_client = OpenAI(api_key=settings.openai_api_key)
        self.embedding_model = settings.openai_embedding_model

    def _init_openai(self, settings):
        """Initialize OpenAI as the primary provider."""
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model
        self.supports_json_mode = True

    def _init_perplexity(self, settings):
        """Initialize Perplexity as the primary provider."""
        if not settings.perplexity_api_key:
            raise LLMServiceError(
                "PERPLEXITY_API_KEY not set in backend/.env.",
                status_code=500,
            )
        self.client = OpenAI(
            api_key=settings.perplexity_api_key,
            base_url="https://api.perplexity.ai",
        )
        self.model = settings.perplexity_model
        self.supports_json_mode = False

    def _translate_error(self, exc: Exception, provider: str = "OpenAI") -> LLMServiceError:
        if isinstance(exc, AuthenticationError):
            logger.warning("%s authentication failed: %s", provider, exc.__class__.__name__)
            return LLMServiceError(
                f"{provider} authentication failed. Check API key in backend/.env.",
                status_code=500,
            )

        if isinstance(exc, PermissionDeniedError):
            logger.warning("%s permission denied: %s", provider, exc.__class__.__name__)
            return LLMServiceError(
                f"{provider} rejected this request. Check your project permissions and model access.",
                status_code=502,
            )

        if isinstance(exc, RateLimitError):
            logger.warning("%s rate limit hit: %s", provider, exc.__class__.__name__)
            return LLMServiceError(
                f"{provider} rate limit reached. Retry in a moment.",
                status_code=503,
            )

        if isinstance(exc, APIConnectionError):
            logger.warning("%s connection error: %s", provider, exc.__class__.__name__)
            return LLMServiceError(
                f"Could not reach {provider}. Check network access and try again.",
                status_code=503,
            )

        if isinstance(exc, APIError):
            logger.warning("%s API error: %s", provider, exc.__class__.__name__)
            return LLMServiceError(
                f"{provider} returned an unexpected error.",
                status_code=502,
            )

        logger.exception("Unexpected %s error", provider)
        return LLMServiceError(f"Unexpected {provider} error.", status_code=500)

    def _generate_openai(self, system_prompt: str, user_prompt: str, json_mode: bool = False) -> str:
        """Generate using OpenAI."""
        kwargs = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.7,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        
        response = self.client.chat.completions.create(**kwargs)
        return response.choices[0].message.content.strip()

    def _generate_perplexity(self, system_prompt: str, user_prompt: str) -> str:
        """Generate using Perplexity."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
        )
        return response.choices[0].message.content.strip()

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        """Generate a plain-text response."""
        try:
            if self.provider == "perplexity":
                return self._generate_perplexity(system_prompt, user_prompt)
            return self._generate_openai(system_prompt, user_prompt)
        except Exception as exc:
            raise self._translate_error(exc, self.provider.title()) from exc

    def _extract_json_from_text(self, text: str) -> dict[str, Any]:
        """Extract JSON from text that may contain markdown code blocks or extra content."""
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
        if json_match:
            return json.loads(json_match.group(1).strip())
        
        brace_match = re.search(r'\{[\s\S]*\}', text)
        if brace_match:
            return json.loads(brace_match.group(0))
        
        return json.loads(text)

    def generate_json(self, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        """Generate a structured JSON response."""
        json_instruction = "\nYou MUST respond with valid JSON only. No markdown, no explanation, just the JSON object."
        raw = ""
        
        try:
            if self.provider == "perplexity":
                raw = self._generate_perplexity(
                    system_prompt + json_instruction,
                    user_prompt,
                )
                return self._extract_json_from_text(raw)
            else:
                raw = self._generate_openai(
                    system_prompt + json_instruction,
                    user_prompt,
                    json_mode=True,
                )
                return json.loads(raw)
        except json.JSONDecodeError as exc:
            logger.error("Failed to parse JSON from LLM response: %s", raw[:500])
            raise LLMServiceError("LLM returned invalid JSON.", status_code=502) from exc
        except Exception as exc:
            raise self._translate_error(exc, self.provider.title()) from exc

    def embed(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a list of texts (always uses OpenAI)."""
        try:
            response = self.openai_client.embeddings.create(
                model=self.embedding_model,
                input=texts,
            )
        except Exception as exc:
            raise self._translate_error(exc, "OpenAI") from exc
        return [item.embedding for item in response.data]

    def embed_single(self, text: str) -> list[float]:
        """Convenience method for a single text embedding."""
        return self.embed([text])[0]
