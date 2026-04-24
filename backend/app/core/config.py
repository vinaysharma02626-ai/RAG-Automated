import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    APP_NAME: str = "RAG Automation"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production-please")

    # CORS
    ALLOWED_ORIGINS: List[str] = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173"
    ).split(",")

    # File storage
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./data/uploads")
    INDEX_DIR: str = os.getenv("INDEX_DIR", "./data/indexes")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./data/rag.db")

    # Upload limits
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
    MAX_DOCS_PER_SESSION: int = int(os.getenv("MAX_DOCS_PER_SESSION", "20"))

    # Chunking defaults
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "512"))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "64"))
    MAX_CHUNKS_PER_DOC: int = int(os.getenv("MAX_CHUNKS_PER_DOC", "1000"))

    # Retrieval
    TOP_K_RETRIEVAL: int = int(os.getenv("TOP_K_RETRIEVAL", "20"))
    TOP_N_RERANK: int = int(os.getenv("TOP_N_RERANK", "5"))
    VECTOR_WEIGHT: float = float(os.getenv("VECTOR_WEIGHT", "0.6"))
    BM25_WEIGHT: float = float(os.getenv("BM25_WEIGHT", "0.4"))

    # LLM Provider: "groq", "huggingface", "openrouter", "ollama"
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "groq")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "llama-3.1-8b-instant")
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "")
    LLM_MAX_TOKENS: int = int(os.getenv("LLM_MAX_TOKENS", "1024"))
    LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.1"))

    # Embedding Provider: "huggingface", "local", "ollama"
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "local")
    EMBEDDING_MODEL: str = os.getenv(
        "EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"
    )
    EMBEDDING_API_KEY: str = os.getenv("EMBEDDING_API_KEY", "")
    EMBEDDING_DIM: int = int(os.getenv("EMBEDDING_DIM", "384"))

    # Rate limiting
    RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "30"))
    RATE_LIMIT_WINDOW: int = int(os.getenv("RATE_LIMIT_WINDOW", "60"))

    # Timeouts (seconds)
    INGESTION_TIMEOUT: int = int(os.getenv("INGESTION_TIMEOUT", "300"))
    QUERY_TIMEOUT: int = int(os.getenv("QUERY_TIMEOUT", "60"))

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
