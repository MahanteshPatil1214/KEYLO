"""Shared helpers for conversation and message integration tests."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi.testclient import TestClient


def create_conversation(
    client: TestClient,
    headers: dict[str, str],
    *,
    lead_id: UUID | str,
    project_id: UUID | str,
    buyer_id: UUID | str | None = None,
    initial_message: str | None = None,
    expected_status: int = 201,
) -> dict[str, Any]:
    """Initiate a conversation via POST /api/v1/conversations."""

    payload: dict[str, Any] = {
        "lead_id": str(lead_id),
        "project_id": str(project_id),
    }
    if buyer_id is not None:
        payload["buyer_id"] = str(buyer_id)
    if initial_message is not None:
        payload["initial_message"] = initial_message

    response = client.post("/api/v1/conversations", json=payload, headers=headers)
    assert response.status_code == expected_status, response.text
    return response.json()


def start_conversation(
    client: TestClient,
    headers: dict[str, str],
    *,
    project_id: UUID | str,
    full_name: str = "Start Conversation Buyer",
    email: str | None = "start-conv@example.com",
    phone: str | None = "+919811111111",
    source: str = "WEBSITE",
    consent_to_contact: bool = True,
    initial_message: str | None = None,
    expected_status: int = 201,
) -> dict[str, Any]:
    """Start a conversation via POST /api/v1/conversations/start (creates lead if needed)."""

    payload: dict[str, Any] = {
        "project_id": str(project_id),
        "full_name": full_name,
        "source": source,
        "consent_to_contact": consent_to_contact,
    }
    if email is not None:
        payload["email"] = email
    if phone is not None:
        payload["phone"] = phone
    if initial_message is not None:
        payload["initial_message"] = initial_message

    response = client.post("/api/v1/conversations/start", json=payload, headers=headers)
    assert response.status_code == expected_status, response.text
    return response.json()


def get_conversation(
    client: TestClient,
    headers: dict[str, str],
    conversation_id: UUID | str,
    *,
    expected_status: int = 200,
) -> dict[str, Any]:
    """Retrieve conversation details via GET /api/v1/conversations/{id}."""

    response = client.get(
        f"/api/v1/conversations/{conversation_id}",
        headers=headers,
    )
    assert response.status_code == expected_status, response.text
    return response.json()


def list_conversations(
    client: TestClient,
    headers: dict[str, str],
    *,
    params: dict[str, Any] | None = None,
    expected_status: int = 200,
) -> dict[str, Any]:
    """List conversations via GET /api/v1/conversations."""

    response = client.get(
        "/api/v1/conversations",
        params=params,
        headers=headers,
    )
    assert response.status_code == expected_status, response.text
    return response.json()


def update_conversation_status(
    client: TestClient,
    headers: dict[str, str],
    conversation_id: UUID | str,
    *,
    status: str,
    expected_status: int = 200,
) -> dict[str, Any]:
    """Update conversation status via PATCH /api/v1/conversations/{id}/status."""

    response = client.patch(
        f"/api/v1/conversations/{conversation_id}/status",
        json={"status": status},
        headers=headers,
    )
    assert response.status_code == expected_status, response.text
    return response.json()


def post_message(
    client: TestClient,
    headers: dict[str, str],
    conversation_id: UUID | str,
    *,
    content: str,
    sender_type: str | None = None,
    expected_status: int = 201,
) -> dict[str, Any]:
    """Post a message via POST /api/v1/conversations/{id}/messages."""

    payload: dict[str, Any] = {"content": content}
    if sender_type is not None:
        payload["sender_type"] = sender_type

    response = client.post(
        f"/api/v1/conversations/{conversation_id}/messages",
        json=payload,
        headers=headers,
    )
    assert response.status_code == expected_status, response.text
    return response.json()


def list_messages(
    client: TestClient,
    headers: dict[str, str],
    conversation_id: UUID | str,
    *,
    params: dict[str, Any] | None = None,
    expected_status: int = 200,
) -> dict[str, Any]:
    """List messages via GET /api/v1/conversations/{id}/messages."""

    response = client.get(
        f"/api/v1/conversations/{conversation_id}/messages",
        params=params,
        headers=headers,
    )
    assert response.status_code == expected_status, response.text
    return response.json()


def get_message(
    client: TestClient,
    headers: dict[str, str],
    message_id: UUID | str,
    *,
    expected_status: int = 200,
) -> dict[str, Any]:
    """Retrieve an individual message via GET /api/v1/messages/{id}."""

    response = client.get(
        f"/api/v1/messages/{message_id}",
        headers=headers,
    )
    assert response.status_code == expected_status, response.text
    return response.json()

