"""Shared helpers for visit slot and booking API tests."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi.testclient import TestClient


def create_slot(
    client: TestClient,
    headers: dict[str, str],
    *,
    project_id: UUID | str,
    start_time: datetime,
    end_time: datetime,
    capacity: int = 1,
    notes: str | None = None,
    is_active: bool = True,
    expected_status: int = 201,
) -> dict[str, Any]:
    """Create a visit slot via POST /api/v1/slots."""

    payload: dict[str, Any] = {
        "project_id": str(project_id),
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "capacity": capacity,
        "is_active": is_active,
    }
    if notes is not None:
        payload["notes"] = notes

    response = client.post("/api/v1/slots", json=payload, headers=headers)
    assert response.status_code == expected_status, response.text
    return response.json()


def get_slot(
    client: TestClient,
    headers: dict[str, str],
    slot_id: UUID | str,
    *,
    expected_status: int = 200,
) -> dict[str, Any]:
    """Get visit slot details via GET /api/v1/slots/{slot_id}."""

    response = client.get(f"/api/v1/slots/{slot_id}", headers=headers)
    assert response.status_code == expected_status, response.text
    return response.json()


def list_slots(
    client: TestClient,
    headers: dict[str, str],
    *,
    params: dict[str, Any] | None = None,
    expected_status: int = 200,
) -> dict[str, Any]:
    """List visit slots via GET /api/v1/slots."""

    response = client.get("/api/v1/slots", params=params, headers=headers)
    assert response.status_code == expected_status, response.text
    return response.json()


def get_available_slots(
    client: TestClient,
    headers: dict[str, str],
    project_id: UUID | str,
    *,
    params: dict[str, Any] | None = None,
    expected_status: int = 200,
) -> dict[str, Any]:
    """Look up available slots via GET /api/v1/slots/available."""

    query = {"project_id": str(project_id)}
    if params:
        query.update(params)

    response = client.get("/api/v1/slots/available", params=query, headers=headers)
    assert response.status_code == expected_status, response.text
    return response.json()


def update_slot(
    client: TestClient,
    headers: dict[str, str],
    slot_id: UUID | str,
    payload: dict[str, Any],
    *,
    expected_status: int = 200,
) -> dict[str, Any]:
    """Update a visit slot via PATCH /api/v1/slots/{slot_id}."""

    response = client.patch(f"/api/v1/slots/{slot_id}", json=payload, headers=headers)
    assert response.status_code == expected_status, response.text
    return response.json()


def deactivate_slot(
    client: TestClient,
    headers: dict[str, str],
    slot_id: UUID | str,
    *,
    expected_status: int = 200,
) -> dict[str, Any]:
    """Deactivate a visit slot via DELETE /api/v1/slots/{slot_id}."""

    response = client.delete(f"/api/v1/slots/{slot_id}", headers=headers)
    assert response.status_code == expected_status, response.text
    return response.json()


def create_booking(
    client: TestClient,
    headers: dict[str, str],
    *,
    slot_id: UUID | str,
    lead_id: UUID | str,
    notes: str | None = None,
    expected_status: int = 201,
) -> dict[str, Any]:
    """Reserve a site visit booking via POST /api/v1/bookings."""

    payload: dict[str, Any] = {
        "slot_id": str(slot_id),
        "lead_id": str(lead_id),
    }
    if notes is not None:
        payload["notes"] = notes

    response = client.post("/api/v1/bookings", json=payload, headers=headers)
    assert response.status_code == expected_status, response.text
    return response.json()


def get_booking(
    client: TestClient,
    headers: dict[str, str],
    booking_id: UUID | str,
    *,
    expected_status: int = 200,
) -> dict[str, Any]:
    """Retrieve booking detail via GET /api/v1/bookings/{booking_id}."""

    response = client.get(f"/api/v1/bookings/{booking_id}", headers=headers)
    assert response.status_code == expected_status, response.text
    return response.json()


def list_bookings(
    client: TestClient,
    headers: dict[str, str],
    *,
    params: dict[str, Any] | None = None,
    expected_status: int = 200,
) -> dict[str, Any]:
    """List bookings via GET /api/v1/bookings."""

    response = client.get("/api/v1/bookings", params=params, headers=headers)
    assert response.status_code == expected_status, response.text
    return response.json()


def cancel_booking(
    client: TestClient,
    headers: dict[str, str],
    booking_id: UUID | str,
    *,
    cancellation_reason: str | None = None,
    expected_status: int = 200,
) -> dict[str, Any]:
    """Cancel a booking via POST /api/v1/bookings/{booking_id}/cancel."""

    payload: dict[str, Any] = {}
    if cancellation_reason is not None:
        payload["cancellation_reason"] = cancellation_reason

    response = client.post(
        f"/api/v1/bookings/{booking_id}/cancel",
        json=payload,
        headers=headers,
    )
    assert response.status_code == expected_status, response.text
    return response.json()


def update_booking_status(
    client: TestClient,
    headers: dict[str, str],
    booking_id: UUID | str,
    *,
    status: str,
    notes: str | None = None,
    expected_status: int = 200,
) -> dict[str, Any]:
    """Update booking outcome via PATCH /api/v1/bookings/{booking_id}/status."""

    payload: dict[str, Any] = {"status": status}
    if notes is not None:
        payload["notes"] = notes

    response = client.patch(
        f"/api/v1/bookings/{booking_id}/status",
        json=payload,
        headers=headers,
    )
    assert response.status_code == expected_status, response.text
    return response.json()

