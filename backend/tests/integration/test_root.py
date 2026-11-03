"""Root endpoint tests."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_root_returns_application_information(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "name": "Keylo API",
        "environment": "testing",
        "api_version": "v1",
        "api_prefix": "/api/v1",
        "docs_url": "/docs",
    }
