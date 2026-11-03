"""Shared helpers for lead API integration tests."""

from __future__ import annotations

from uuid import UUID, uuid4

from fastapi.testclient import TestClient

_DEFAULT = object()


def create_lead(
    client: TestClient,
    *,
    project_id: UUID | str,
    full_name: str = "A Buyer",
    email: str | None | object = _DEFAULT,
    phone: str | None | object = _DEFAULT,
    source: str = "WEBSITE",
    consent_to_contact: bool = True,
    budget_min: int | None = None,
    budget_max: int | None = None,
    preferred_configuration: str | None = None,
    headers: dict[str, str] | None = None,
    expected_status: int = 201,
) -> dict[str, object]:
    """Submit a lead via the public or authenticated intake endpoint."""

    if email is _DEFAULT:
        email = f"buyer-{uuid4().hex[:8]}@example.com"
    if phone is _DEFAULT:
        # 10-digit Indian-format mobile number
        phone = f"+9198{uuid4().int % 100000000:08d}"

    payload: dict[str, object] = {
        "full_name": full_name,
        "project_id": str(project_id),
        "source": source,
        "consent_to_contact": consent_to_contact,
    }
    if email is not None:
        payload["email"] = email
    if phone is not None:
        payload["phone"] = phone
    if budget_min is not None:
        payload["budget_min"] = budget_min
    if budget_max is not None:
        payload["budget_max"] = budget_max
    if preferred_configuration is not None:
        payload["preferred_configuration"] = preferred_configuration

    response = client.post("/api/v1/leads", json=payload, headers=headers)
    assert response.status_code == expected_status, response.text
    return response.json()


def assign_lead(
    client: TestClient,
    headers: dict[str, str],
    lead_id: UUID | str,
    *,
    executive_id: UUID | str,
    expected_status: int = 200,
) -> dict[str, object]:
    """Assign or reassign a lead to an executive."""

    response = client.post(
        f"/api/v1/leads/{lead_id}/assign",
        json={"executive_id": str(executive_id)},
        headers=headers,
    )
    assert response.status_code == expected_status, response.text
    return response.json()


def update_lead(
    client: TestClient,
    headers: dict[str, str],
    lead_id: UUID | str,
    payload: dict[str, object],
    *,
    expected_status: int = 200,
) -> dict[str, object]:
    """Patch permitted fields on an existing lead."""

    response = client.patch(
        f"/api/v1/leads/{lead_id}",
        json=payload,
        headers=headers,
    )
    assert response.status_code == expected_status, response.text
    return response.json()


def update_lead_status(
    client: TestClient,
    headers: dict[str, str],
    lead_id: UUID | str,
    *,
    status: str,
    expected_status: int = 200,
) -> dict[str, object]:
    """Update a lead's lifecycle status."""

    response = client.patch(
        f"/api/v1/leads/{lead_id}/status",
        json={"status": status},
        headers=headers,
    )
    assert response.status_code == expected_status, response.text
    return response.json()
