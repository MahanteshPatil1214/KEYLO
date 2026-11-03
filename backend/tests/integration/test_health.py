"""Liveness and readiness endpoint tests."""

from __future__ import annotations

from collections.abc import Generator

from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import get_db
from app.main import app


class BrokenSession:
    """Session whose database call always fails."""

    def execute(self, *args: object, **kwargs: object) -> None:
        raise SQLAlchemyError(
            "could not connect to postgresql://user:password@db:5432/keylo"
        )

    def close(self) -> None:
        return None


def broken_db_dependency() -> Generator[BrokenSession, None, None]:
    yield BrokenSession()


def test_liveness_reports_running_application(client: TestClient) -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "Keylo API",
        "environment": "testing",
    }


def test_liveness_does_not_touch_the_database(client: TestClient) -> None:
    app.dependency_overrides[get_db] = broken_db_dependency
    try:
        response = client.get("/api/v1/health")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_readiness_reports_database_ok(
    client: TestClient,
    override_db: None,
) -> None:
    response = client.get("/api/v1/health/ready")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ready",
        "checks": {"database": "ok"},
    }


def test_readiness_returns_503_when_database_is_unavailable(
    client: TestClient,
) -> None:
    app.dependency_overrides[get_db] = broken_db_dependency
    try:
        response = client.get("/api/v1/health/ready")
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 503
    assert response.json() == {
        "status": "not_ready",
        "checks": {"database": "unavailable"},
    }
    body = response.text.lower()
    assert "password" not in body
    assert "postgresql" not in body
    assert "traceback" not in body
