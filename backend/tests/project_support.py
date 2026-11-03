"""Shared helpers for project and fact API tests."""

from __future__ import annotations

from uuid import UUID, uuid4

from fastapi.testclient import TestClient


def create_project(
    client: TestClient,
    headers: dict[str, str],
    *,
    name: str | None = None,
    slug: str | None = None,
    location: str = "Pune, Maharashtra",
    description: str | None = "Residential project",
    rera_number: str | None = "P52100000000",
    status: str | None = None,
    expected_status: int = 201,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "name": name or f"Project {uuid4().hex[:10]}",
        "location": location,
        "description": description,
        "rera_number": rera_number,
    }
    if slug is not None:
        payload["slug"] = slug
    if status is not None:
        payload["status"] = status

    response = client.post("/api/v1/projects", json=payload, headers=headers)
    assert response.status_code == expected_status, response.text
    return response.json()


def create_fact(
    client: TestClient,
    headers: dict[str, str],
    project_id: UUID | str,
    *,
    category: str = "LOCATION",
    question: str = "Where is the project located?",
    answer: str = "The project is in Pune.",
    expected_status: int = 201,
) -> dict[str, object]:
    response = client.post(
        f"/api/v1/projects/{project_id}/facts",
        json={
            "category": category,
            "question": question,
            "answer": answer,
        },
        headers=headers,
    )
    assert response.status_code == expected_status, response.text
    return response.json()


def approve_fact(
    client: TestClient,
    headers: dict[str, str],
    fact_id: UUID | str,
    *,
    expected_status: int = 200,
) -> dict[str, object]:
    response = client.post(f"/api/v1/facts/{fact_id}/approve", headers=headers)
    assert response.status_code == expected_status, response.text
    return response.json()


def reject_fact(
    client: TestClient,
    headers: dict[str, str],
    fact_id: UUID | str,
    *,
    expected_status: int = 200,
) -> dict[str, object]:
    response = client.post(f"/api/v1/facts/{fact_id}/reject", headers=headers)
    assert response.status_code == expected_status, response.text
    return response.json()


def update_fact(
    client: TestClient,
    headers: dict[str, str],
    fact_id: UUID | str,
    payload: dict[str, object],
    *,
    expected_status: int = 200,
) -> dict[str, object]:
    response = client.patch(
        f"/api/v1/facts/{fact_id}",
        json=payload,
        headers=headers,
    )
    assert response.status_code == expected_status, response.text
    return response.json()
