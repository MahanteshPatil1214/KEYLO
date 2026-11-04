"""Helper functions for notification & reminder integration tests."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi.testclient import TestClient


def list_notifications(
    client: TestClient,
    headers: dict[str, str],
    *,
    expected_status: int = 200,
    **params: Any,
) -> dict[str, Any]:
    """Retrieve notifications matching filters via GET /api/v1/notifications."""

    response = client.get("/api/v1/notifications", headers=headers, params=params)
    assert response.status_code == expected_status, response.text
    return response.json() if expected_status == 200 else {}


def get_unread_count(
    client: TestClient,
    headers: dict[str, str],
    *,
    expected_status: int = 200,
) -> dict[str, Any]:
    """Retrieve unread notification count via GET /api/v1/notifications/unread-count."""

    response = client.get("/api/v1/notifications/unread-count", headers=headers)
    assert response.status_code == expected_status, response.text
    return response.json() if expected_status == 200 else {}


def mark_notification_read(
    client: TestClient,
    headers: dict[str, str],
    notification_id: UUID | str,
    *,
    expected_status: int = 200,
) -> dict[str, Any]:
    """Mark a single notification as read via PATCH /api/v1/notifications/{id}/read."""

    response = client.patch(
        f"/api/v1/notifications/{notification_id}/read", headers=headers
    )
    assert response.status_code == expected_status, response.text
    return response.json() if expected_status == 200 else {}


def mark_all_notifications_read(
    client: TestClient,
    headers: dict[str, str],
    *,
    expected_status: int = 200,
) -> dict[str, Any]:
    """Mark all unread notifications as read via POST /api/v1/notifications/mark-all-read."""

    response = client.post("/api/v1/notifications/mark-all-read", headers=headers)
    assert response.status_code == expected_status, response.text
    return response.json() if expected_status == 200 else {}


def get_notification(
    client: TestClient,
    headers: dict[str, str],
    notification_id: UUID | str,
    *,
    expected_status: int = 200,
) -> dict[str, Any]:
    """Retrieve a single notification via GET /api/v1/notifications/{id}."""

    response = client.get(f"/api/v1/notifications/{notification_id}", headers=headers)
    assert response.status_code == expected_status, response.text
    return response.json() if expected_status == 200 else {}


def trigger_reminders(
    client: TestClient,
    headers: dict[str, str],
    *,
    expected_status: int = 200,
) -> dict[str, Any]:
    """Manually invoke the reminder processor via POST /api/v1/notifications/reminders/trigger."""

    response = client.post("/api/v1/notifications/reminders/trigger", headers=headers)
    assert response.status_code == expected_status, response.text
    return response.json() if expected_status == 200 else {}

