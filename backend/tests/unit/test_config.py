"""Configuration validation tests."""

from __future__ import annotations

import secrets
from typing import Any

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def make_settings(**overrides: Any) -> Settings:
    values: dict[str, Any] = {
        "environment": "development",
        "database_url": (
            "postgresql+psycopg2://keylo:"
            f"{secrets.token_urlsafe(16)}@localhost:5432/keylo_db"
        ),
        "cors_allowed_origins": ["http://localhost:3000"],
        "log_level": "INFO",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


def test_development_defaults() -> None:
    settings = make_settings()

    assert settings.app_name == "Keylo API"
    assert settings.environment == "development"
    assert settings.api_version == "v1"
    assert settings.api_v1_prefix == "/api/v1"
    assert settings.debug is False


def test_settings_are_read_from_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    database_password = secrets.token_urlsafe(16)

    monkeypatch.setenv("APP_NAME", "Environment API")
    monkeypatch.setenv("ENVIRONMENT", "testing")
    monkeypatch.setenv("API_VERSION", "v2")
    monkeypatch.setenv("DEBUG", "true")
    monkeypatch.setenv(
        "DATABASE_URL",
        f"postgresql+psycopg2://env_user:{database_password}@db:5432/env_db",
    )
    monkeypatch.setenv(
        "CORS_ALLOWED_ORIGINS", "http://one.example, http://two.example"
    )
    monkeypatch.setenv("LOG_LEVEL", "debug")

    settings = Settings(_env_file=None)

    assert settings.app_name == "Environment API"
    assert settings.environment == "testing"
    assert settings.api_version == "v2"
    assert settings.api_v1_prefix == "/api/v2"
    assert settings.debug is True
    assert settings.cors_allowed_origins == [
        "http://one.example",
        "http://two.example",
    ]
    assert settings.log_level == "DEBUG"


def test_cors_origins_accept_json_list() -> None:
    settings = make_settings(
        cors_allowed_origins='["http://localhost:3000", "http://localhost:5173"]'
    )

    assert settings.cors_allowed_origins == [
        "http://localhost:3000",
        "http://localhost:5173",
    ]


def test_database_url_is_masked_in_settings_representation() -> None:
    database_password = secrets.token_urlsafe(16)
    settings = make_settings(
        database_url=(
            "postgresql+psycopg2://keylo:"
            f"{database_password}@localhost:5432/keylo_db"
        )
    )

    assert database_password not in repr(settings)
    assert database_password not in str(settings)
    assert database_password in settings.database_url.get_secret_value()


@pytest.mark.parametrize("log_level", ["verbose", "not-a-level", ""])
def test_invalid_log_level_is_rejected(log_level: str) -> None:
    with pytest.raises(ValidationError):
        make_settings(log_level=log_level)


def test_invalid_api_version_is_rejected() -> None:
    with pytest.raises(ValidationError):
        make_settings(api_version="1")


def test_invalid_environment_is_rejected() -> None:
    with pytest.raises(ValidationError):
        make_settings(environment="staging")


def test_production_requires_debug_disabled() -> None:
    with pytest.raises(ValidationError):
        make_settings(environment="production", debug=True)


def test_production_requires_explicit_cors_origins() -> None:
    with pytest.raises(ValidationError):
        make_settings(environment="production", cors_allowed_origins=[])


def test_production_requires_cors_setting_even_when_defaults_exist(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql+psycopg2://keylo:"
        f"{secrets.token_urlsafe(16)}@db:5432/keylo_db",
    )
    monkeypatch.delenv("CORS_ALLOWED_ORIGINS", raising=False)

    with pytest.raises(ValidationError):
        Settings(_env_file=None)


def test_production_rejects_wildcard_cors_origin() -> None:
    with pytest.raises(ValidationError):
        make_settings(environment="production", cors_allowed_origins=["*"])


def test_production_requires_postgresql_database_url() -> None:
    with pytest.raises(ValidationError):
        make_settings(
            environment="production",
            database_url="sqlite+pysqlite:///./keylo.db",
        )


def test_valid_production_settings_are_accepted() -> None:
    settings = make_settings(
        environment="production",
        debug=False,
        cors_allowed_origins=["https://app.keylo.example"],
        database_url=(
            "postgresql+psycopg2://keylo:"
            f"{secrets.token_urlsafe(16)}@db:5432/keylo_db"
        ),
    )

    assert settings.environment == "production"
    assert settings.api_v1_prefix == "/api/v1"
