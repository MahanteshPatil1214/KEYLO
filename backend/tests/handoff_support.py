"""Helper functions for human handoff integration tests."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi.testclient import TestClient


def request_handoff(
    client: TestClient,
    headers: dict[str, str],
    *,
    conversation_id: UUID | str,
    reason: str = "BUYER_REQUESTED",
    notes: str | None = None,
    expected_status: int = 201,
) -> dict[str, Any]:
    """Request a human handoff via the POST /api/v1/handoffs endpoint."""

    payload: dict[str, Any] = {
        "conversation_id": str(conversation_id),
        "reason": reason,
    }
    if notes is not None:
        payload["notes"] = notes

    response = client.post("/api/v1/handoffs", json=payload, headers=headers)
    assert response.status_code == expected_status, response.text
    return response.json() if expected_status in (200, 201) else {}


def list_handoffs(
    client: TestClient,
    headers: dict[str, str],
    *,
    expected_status: int = 200,
    **params: Any,
) -> dict[str, Any]:
    """Retrieve handoffs matching filters via GET /api/v1/handoffs."""

    response = client.get("/api/v1/handoffs", headers=headers, params=params)
    assert response.status_code == expected_status, response.text
    return response.json() if expected_status == 200 else {}


def get_handoff(
    client: TestClient,
    headers: dict[str, str],
    handoff_id: UUID | str,
    *,
    expected_status: int = 200,
) -> dict[str, Any]:
    """Retrieve handoff details via GET /api/v1/handoffs/{id}."""

    response = client.get(f"/api/v1/handoffs/{handoff_id}", headers=headers)
    assert response.status_code == expected_status, response.text
    return response.json() if expected_status == 200 else {}


def assign_handoff(
    client: TestClient,
    headers: dict[str, str],
    handoff_id: UUID | str,
    *,
    executive_id: UUID | str,
    expected_status: int = 200,
) -> dict[str, Any]:
    """Assign or reassign an executive via POST /api/v1/handoffs/{id}/assign."""

    payload = {"executive_id": str(executive_id)}
    response = client.post(
        f"/api/v1/handoffs/{handoff_id}/assign", json=payload, headers=headers
    )
    assert response.status_code == expected_status, response.text
    return response.json() if expected_status == 200 else {}


def update_handoff_status(
    client: TestClient,
    headers: dict[str, str],
    handoff_id: UUID | str,
    *,
    status: str,
    resolution_notes: str | None = None,
    expected_status: int = 200,
) -> dict[str, Any]:
    """Transition status via PATCH /api/v1/handoffs/{id}/status."""

    payload: dict[str, Any] = {"status": status}
    if resolution_notes is not None:
        payload["resolution_notes"] = resolution_notes

    response = client.patch(
        f"/api/v1/handoffs/{handoff_id}/status", json=payload, headers=headers
    )
    assert response.status_code == expected_status, response.text
    return response.json() if expected_status == 200 else {}

