from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache


class Settings(BaseSettings):
    # OpenAI
    openai_api_key: str
    openai_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"

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

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
