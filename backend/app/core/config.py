"""Environment-based application configuration."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from typing import Annotated, Any, Literal, Self

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

Environment = Literal["development", "testing", "production"]

_LOG_LEVELS = frozenset({"CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"})

_JWT_SECRET_MIN_LENGTH = 32
_JWT_PLACEHOLDER_MARKERS = ("change-me", "replace-me", "your-secret")

_DEFAULT_CORS_ORIGINS = (
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
)


class Settings(BaseSettings):
    """Central application settings loaded from environment variables and `.env`."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Keylo API"
    environment: Environment = "development"
    api_version: str = "v1"
    debug: bool = False
    database_url: SecretStr = Field(
        ...,
        description="SQLAlchemy database URL. Required; never commit the real value.",
    )
    # ``NoDecode`` lets the validator below accept either JSON or a
    # comma-separated environment value before pydantic-settings tries JSON.
    cors_allowed_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: list(_DEFAULT_CORS_ORIGINS),
        description="Explicit browser origins allowed to call the API.",
    )
    log_level: str = "INFO"
    jwt_secret_key: SecretStr = Field(
        ...,
        description="Symmetric JWT signing secret. Required; never commit the real value.",
    )
    jwt_algorithm: Literal["HS256", "HS384", "HS512"] = "HS256"
    jwt_issuer: str = "keylo-api"
    jwt_audience: str = "keylo-clients"
    access_token_expire_minutes: int = Field(default=30, ge=1, le=10080)
    refresh_token_expire_minutes: int = Field(
        default=10080, ge=1, le=525600, description="Lifetime of a refresh token in minutes (default 7 days)."
    )
    lead_create_rate_limit_per_minute: int = Field(default=30, ge=1, le=10000)
    groq_api_key: SecretStr | None = Field(
        default=None,
        description="Groq API key. Optional in dev/test; never log the real value.",
    )
    groq_model: str = Field(
        default="openai/gpt-oss-120b",
        description="Groq chat completion model.",
    )
    groq_timeout_seconds: float = Field(
        default=20.0,
        ge=1.0,
        le=120.0,
        description="Timeout for Groq API calls in seconds.",
    )
    groq_max_retries: int = Field(
        default=2,
        ge=0,
        le=5,
        description="Maximum retry attempts for Groq API calls.",
    )
    assistant_max_history_messages: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Maximum historical messages to pass into assistant prompt context.",
    )
    assistant_temperature: float = Field(
        default=0.2,
        ge=0.0,
        le=2.0,
        description="Sampling temperature for assistant chat completions.",
    )
    reminder_scheduler_enabled: bool = Field(
        default=True,
        description="Whether the background reminder scheduler task should run.",
    )
    reminder_poll_interval_seconds: int = Field(
        default=60,
        ge=1,
        le=3600,
        description="Interval in seconds between reminder scheduler checks.",
    )

    @property
    def api_v1_prefix(self) -> str:
        """Versioned API prefix derived from ``api_version``."""

        return f"/api/{self.api_version}"

    @field_validator("api_version")
    @classmethod
    def _validate_api_version(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not re.fullmatch(r"v\d+", normalized):
            raise ValueError("API_VERSION must look like 'v1'.")
        return normalized

    @field_validator("cors_allowed_origins", mode="before")
    @classmethod
    def _parse_cors_allowed_origins(cls, value: Any) -> Any:
        """Accept a JSON list or a comma-separated string from the environment."""

        if value is None:
            return []
        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return []
            if raw.startswith("["):
                try:
                    parsed = json.loads(raw)
                except json.JSONDecodeError as exc:
                    raise ValueError(
                        "CORS_ALLOWED_ORIGINS must be valid JSON or a comma-separated list."
                    ) from exc
                if not isinstance(parsed, list):
                    raise ValueError("CORS_ALLOWED_ORIGINS must be a list of origins.")
                return [str(origin).strip() for origin in parsed if str(origin).strip()]
            return [origin.strip() for origin in raw.split(",") if origin.strip()]
        return value

    @field_validator("groq_api_key", mode="before")
    @classmethod
    def _validate_groq_api_key(cls, value: Any) -> SecretStr | None:
        if value is None:
            return None
        if isinstance(value, SecretStr):
            cleaned = value.get_secret_value().strip()
            return SecretStr(cleaned) if cleaned else None
        if isinstance(value, str):
            cleaned = value.strip()
            return SecretStr(cleaned) if cleaned else None
        return value

    @field_validator("log_level", mode="before")
    @classmethod
    def _normalize_log_level(cls, value: Any) -> str:
        level = str(value).strip().upper()
        if level not in _LOG_LEVELS:
            allowed = ", ".join(sorted(_LOG_LEVELS))
            raise ValueError(f"LOG_LEVEL must be one of: {allowed}.")
        return level

    @field_validator("database_url")
    @classmethod
    def _validate_database_url(cls, value: SecretStr) -> SecretStr:
        url = value.get_secret_value().strip()
        if not url:
            raise ValueError("DATABASE_URL must not be empty.")
        return SecretStr(url)

    @field_validator("jwt_secret_key")
    @classmethod
    def _validate_jwt_secret_key(cls, value: SecretStr) -> SecretStr:
        secret = value.get_secret_value().strip()
        if len(secret) < _JWT_SECRET_MIN_LENGTH:
            raise ValueError(
                f"JWT_SECRET_KEY must be at least {_JWT_SECRET_MIN_LENGTH} characters."
            )
        return SecretStr(secret)

    @field_validator("jwt_issuer", "jwt_audience")
    @classmethod
    def _validate_jwt_claim_value(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("JWT_ISSUER and JWT_AUDIENCE must not be empty.")
        return normalized

    @model_validator(mode="after")
    def _validate_production_settings(self) -> Self:
        """Fail fast when production-critical configuration is unsafe."""

        if self.environment != "production":
            return self
        if self.debug:
            raise ValueError("DEBUG must be false in production.")
        if "cors_allowed_origins" not in self.model_fields_set:
            raise ValueError(
                "CORS_ALLOWED_ORIGINS must be configured explicitly in production."
            )
        if not self.cors_allowed_origins:
            raise ValueError(
                "CORS_ALLOWED_ORIGINS must list explicit origins in production."
            )
        if "*" in self.cors_allowed_origins:
            raise ValueError("Wildcard CORS origins are not allowed in production.")
        if not self.database_url.get_secret_value().startswith("postgresql"):
            raise ValueError("DATABASE_URL must use PostgreSQL in production.")
        jwt_secret = self.jwt_secret_key.get_secret_value().lower()
        if any(marker in jwt_secret for marker in _JWT_PLACEHOLDER_MARKERS):
            raise ValueError(
                "JWT_SECRET_KEY must not use a placeholder value in production."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide settings instance."""

    return Settings()
