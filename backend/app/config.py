from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from functools import lru_cache

ENV_FILE = Path(__file__).resolve().parents[1] / ".env"
BACKEND_DIR = ENV_FILE.parent


class Settings(BaseSettings):
    # LLM Provider Selection
    llm_provider: str = "openai"  # "openai" or "perplexity"

    # OpenAI
    openai_api_key: str
    openai_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"

    # Perplexity
    perplexity_api_key: str | None = None
    perplexity_model: str = "sonar"

    # Qdrant
    qdrant_url: str
    qdrant_api_key: str
    qdrant_collection: str = "sales_sparring_kb"

    # Hugging Face
    hf_token: str | None = None

    # Database
    database_url: str = "sqlite:///./sparring.db"

    @field_validator("openai_api_key", "qdrant_api_key")
    @classmethod
    def strip_api_keys(cls, v: str) -> str:
        return v.strip() if v else v

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        sqlite_prefix = "sqlite:///"
        if not v.startswith(sqlite_prefix):
            return v

        db_path = v[len(sqlite_prefix):]
        if db_path == ":memory:":
            return v

        path_obj = Path(db_path)
        if path_obj.is_absolute():
            return v

        resolved = (BACKEND_DIR / path_obj).resolve()
        return f"{sqlite_prefix}{resolved.as_posix()}"

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
