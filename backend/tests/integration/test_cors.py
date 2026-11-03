"""CORS configuration tests."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_configured_origin_is_allowed(client: TestClient) -> None:
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://testserver",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://testserver"
    assert response.headers["access-control-allow-credentials"] == "true"


def test_unconfigured_origin_is_not_allowed(client: TestClient) -> None:
    response = client.get(
        "/api/v1/health",
        headers={"Origin": "http://untrusted.example"},
    )

    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers
