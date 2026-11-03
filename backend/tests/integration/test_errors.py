"""Consistent error response tests."""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel


class Payload(BaseModel):
    quantity: int


def test_unknown_route_uses_error_envelope(client: TestClient) -> None:
    response = client.get("/does-not-exist")

    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "NOT_FOUND"
    assert body["error"]["message"] == "Not Found"
    assert body["error"]["details"] == []


def test_http_exception_uses_error_envelope(isolated_app: FastAPI) -> None:
    @isolated_app.get("/__test__/forbidden", include_in_schema=False)
    def forbidden() -> None:
        raise HTTPException(status_code=403, detail="You do not have access")

    with TestClient(isolated_app) as test_client:
        response = test_client.get("/__test__/forbidden")

    assert response.status_code == 403
    assert response.json() == {
        "success": False,
        "error": {
            "code": "FORBIDDEN",
            "message": "You do not have access",
            "details": [],
        },
    }


def test_validation_error_uses_error_envelope_without_echoing_input(
    isolated_app: FastAPI,
) -> None:
    @isolated_app.post("/__test__/validate", include_in_schema=False)
    def validate(payload: Payload) -> Payload:
        return payload

    with TestClient(isolated_app) as test_client:
        response = test_client.post(
            "/__test__/validate",
            json={"quantity": "not-an-integer"},
        )

    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert body["error"]["message"] == "Request validation failed"
    assert body["error"]["details"][0]["field"] == "quantity"
    assert "not-an-integer" not in response.text
    assert "input" not in response.text


def test_unexpected_error_returns_safe_generic_response(isolated_app: FastAPI) -> None:
    @isolated_app.get("/__test__/boom", include_in_schema=False)
    def boom() -> None:
        raise RuntimeError("internal database detail")

    with TestClient(isolated_app, raise_server_exceptions=False) as test_client:
        response = test_client.get("/__test__/boom")

    assert response.status_code == 500
    assert response.json() == {
        "success": False,
        "error": {
            "code": "INTERNAL_ERROR",
            "message": "An unexpected error occurred",
            "details": [],
        },
    }
    assert "internal database detail" not in response.text
    assert "Traceback" not in response.text
