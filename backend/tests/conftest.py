"""Pytest fixtures.

Test configuration is forced before importing the application so the suite can
never fall back to a developer's `.env` or normal database. Database-backed
checks use an isolated in-memory SQLite engine through dependency overrides.
"""

from __future__ import annotations

import os
import secrets
from collections.abc import Generator

_TEST_ENVIRONMENT = {
    "APP_NAME": "Keylo API",
    "ENVIRONMENT": "testing",
    "API_VERSION": "v1",
    "DEBUG": "false",
    "DATABASE_URL": (
        "postgresql+psycopg2://keylo_test:"
        f"{secrets.token_urlsafe(16)}@localhost:5432/keylo_test"
    ),
    "CORS_ALLOWED_ORIGINS": '["http://testserver"]',
    "LOG_LEVEL": "WARNING",
}
os.environ.update(_TEST_ENVIRONMENT)

import pytest  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.engine import Engine  # noqa: E402
from sqlalchemy.orm import Session, sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.core.config import Settings  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.main import app, create_app  # noqa: E402


@pytest.fixture(scope="session")
def test_settings() -> Settings:
    return Settings(_env_file=None)


@pytest.fixture(scope="session")
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def sqlite_engine() -> Generator[Engine, None, None]:
    """Create a fresh in-memory database for each test that needs one."""

    test_engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=test_engine)
    try:
        yield test_engine
    finally:
        Base.metadata.drop_all(bind=test_engine)
        test_engine.dispose()


@pytest.fixture()
def test_session_factory(
    sqlite_engine: Engine,
) -> sessionmaker[Session]:
    return sessionmaker(
        bind=sqlite_engine,
        autoflush=False,
        expire_on_commit=False,
    )


@pytest.fixture()
def override_db(
    test_session_factory: sessionmaker[Session],
) -> Generator[None, None, None]:
    """Replace the application's database dependency with the test database."""

    def _get_db() -> Generator[Session, None, None]:
        session = test_session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = _get_db
    try:
        yield
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture()
def isolated_app(test_settings: Settings) -> FastAPI:
    """A fresh application instance for tests that add temporary routes."""

    return create_app(test_settings)
