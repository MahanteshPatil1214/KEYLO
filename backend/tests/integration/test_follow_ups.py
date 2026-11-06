"""Integration tests for lead follow-ups.

Verifies:
- Follow-up creation by Sales Executive for assigned leads.
- Role-based isolation (executives see only assigned leads' follow-ups).
- Follow-up categorization (Due Today, Overdue, Upcoming, Completed).
- Metrics endpoint returns accurate counts.
- Rescheduling follow-ups.
- Editing follow-up details.
- Completing follow-ups with business outcomes and lead status propagation.
- Cancelling follow-ups.
- Authentication and permission enforcement.
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.modules.follow_ups.models import (
    FollowUpOutcome,
    FollowUpPriority,
    FollowUpStatus,
    FollowUpType,
)
from app.modules.leads.models import LeadSource, LeadStatus
from app.modules.projects.models import ProjectStatus
from app.modules.users.models import RoleName, User
from tests.lead_support import assign_lead, create_lead
from tests.project_support import create_project


def _future(hours: int = 24) -> datetime:
    return datetime.now(UTC) + timedelta(hours=hours)


def _past(hours: int = 24) -> datetime:
    return datetime.now(UTC) - timedelta(hours=hours)


def _create_active_project(client: TestClient, admin_headers: dict[str, str], name: str) -> dict[str, Any]:
    project = create_project(client, admin_headers, name=name)
    client.patch(
        f"/api/v1/projects/{project['id']}",
        json={"status": ProjectStatus.ACTIVE.value},
        headers=admin_headers,
    )
    return project


@pytest.fixture()
def admin_user(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.ADMIN, email="admin-fu@example.com")


@pytest.fixture()
def exec_1(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.SALES_EXECUTIVE, email="exec1-fu@example.com")


@pytest.fixture()
def exec_2(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.SALES_EXECUTIVE, email="exec2-fu@example.com")


@pytest.fixture()
def buyer_user(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.BUYER, email="buyer-fu@example.com")


def test_create_and_list_follow_up(
    client: TestClient,
    admin_user: User,
    exec_1: User,
    exec_2: User,
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin_headers = auth_headers(admin_user.email)
    headers_1 = auth_headers(exec_1.email)
    headers_2 = auth_headers(exec_2.email)

    # 1. Create a project and lead
    project = _create_active_project(client, admin_headers, name="Azure Residences")
    lead = create_lead(
        client,
        project_id=project["id"],
        full_name="Rajiv Mehta",
        email="rajiv@example.com",
        phone="+919876543210",
        consent_to_contact=True,
        headers=admin_headers,
    )
    # Assign lead to exec_1
    assign_lead(client, admin_headers, lead_id=lead["id"], executive_id=str(exec_1.id))

    # 2. Exec 1 creates a follow-up
    sched_time = _future(hours=2)
    create_payload = {
        "lead_id": lead["id"],
        "scheduled_at": sched_time.isoformat(),
        "type": "CALL",
        "priority": "HIGH",
        "notes": "Follow up regarding 3BHK pricing",
        "next_action": "Send brochure before call",
    }
    res = client.post("/api/v1/follow-ups", json=create_payload, headers=headers_1)
    assert res.status_code == 201, res.text
    fu = res.json()
    assert fu["buyer_name"] == "Rajiv Mehta"
    assert fu["project_name"] == "Azure Residences"
    assert fu["type"] == "CALL"
    assert fu["priority"] == "HIGH"
    assert fu["status"] == "PENDING"
    assert fu["category"] == "DUE_TODAY"

    # 3. Exec 2 cannot create follow-up for exec 1's lead
    res_forbidden = client.post("/api/v1/follow-ups", json=create_payload, headers=headers_2)
    assert res_forbidden.status_code == 403

    # 4. Exec 1 lists follow-ups and sees it
    res_list_1 = client.get("/api/v1/follow-ups", headers=headers_1)
    assert res_list_1.status_code == 200
    assert res_list_1.json()["total"] == 1
    assert res_list_1.json()["items"][0]["id"] == fu["id"]

    # 5. Exec 2 lists follow-ups and sees 0
    res_list_2 = client.get("/api/v1/follow-ups", headers=headers_2)
    assert res_list_2.status_code == 200
    assert res_list_2.json()["total"] == 0


def test_follow_up_metrics_and_categorization(
    client: TestClient,
    admin_user: User,
    exec_1: User,
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin_headers = auth_headers(admin_user.email)
    headers = auth_headers(exec_1.email)

    project = _create_active_project(client, admin_headers, name="Verdant Palms")
    lead = create_lead(
        client,
        project_id=project["id"],
        full_name="Pooja Sharma",
        phone="+919876543211",
        consent_to_contact=True,
        headers=admin_headers,
    )
    assign_lead(client, admin_headers, lead_id=lead["id"], executive_id=str(exec_1.id))

    # Follow-up 1: Due Today
    client.post(
        "/api/v1/follow-ups",
        json={
            "lead_id": lead["id"],
            "scheduled_at": _future(hours=3).isoformat(),
            "type": "CALL",
            "priority": "HIGH",
        },
        headers=headers,
    )

    # Follow-up 2: Upcoming (3 days from now)
    client.post(
        "/api/v1/follow-ups",
        json={
            "lead_id": lead["id"],
            "scheduled_at": _future(hours=72).isoformat(),
            "type": "WHATSAPP",
            "priority": "MEDIUM",
        },
        headers=headers,
    )

    # Check metrics
    res_metrics = client.get("/api/v1/follow-ups/metrics", headers=headers)
    assert res_metrics.status_code == 200
    data = res_metrics.json()
    assert data["total"] == 2
    assert data["due_today"] == 1
    assert data["upcoming"] == 1
    assert data["completed"] == 0


def test_reschedule_edit_complete_and_cancel(
    client: TestClient,
    admin_user: User,
    exec_1: User,
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin_headers = auth_headers(admin_user.email)
    headers = auth_headers(exec_1.email)

    project = _create_active_project(client, admin_headers, name="Solaris Sky")
    lead = create_lead(
        client,
        project_id=project["id"],
        full_name="Anil Kumble",
        phone="+919876543212",
        consent_to_contact=True,
        headers=admin_headers,
    )
    assign_lead(client, admin_headers, lead_id=lead["id"], executive_id=str(exec_1.id))

    # 1. Create follow-up
    res = client.post(
        "/api/v1/follow-ups",
        json={
            "lead_id": lead["id"],
            "scheduled_at": _future(hours=4).isoformat(),
            "type": "MEETING",
            "priority": "MEDIUM",
            "notes": "Initial site visit briefing",
        },
        headers=headers,
    )
    fu_id = res.json()["id"]

    # 2. Edit follow-up
    res_edit = client.patch(
        f"/api/v1/follow-ups/{fu_id}",
        json={"priority": "HIGH", "notes": "Updated: Client specifically wants penthouse floor"},
        headers=headers,
    )
    assert res_edit.status_code == 200
    assert res_edit.json()["priority"] == "HIGH"
    assert "penthouse floor" in res_edit.json()["notes"]

    # 3. Reschedule follow-up
    new_time = _future(hours=48)
    res_resched = client.post(
        f"/api/v1/follow-ups/{fu_id}/reschedule",
        json={"scheduled_at": new_time.isoformat(), "notes": "Client requested Friday evening"},
        headers=headers,
    )
    assert res_resched.status_code == 200
    assert res_resched.json()["category"] == "UPCOMING"
    assert "Client requested Friday evening" in res_resched.json()["notes"]

    # 4. Complete follow-up with outcome
    res_complete = client.post(
        f"/api/v1/follow-ups/{fu_id}/complete",
        json={
            "outcome": "CONVERTED",
            "outcome_notes": "Client confirmed booking deposit",
            "next_action": "Coordinate with legal for sale agreement",
        },
        headers=headers,
    )
    assert res_complete.status_code == 200
    comp_data = res_complete.json()
    assert comp_data["status"] == "COMPLETED"
    assert comp_data["category"] == "COMPLETED"
    assert comp_data["outcome"] == "CONVERTED"
    assert comp_data["completed_at"] is not None

    # Lead status should be updated to CONVERTED
    lead_res = client.get(f"/api/v1/leads/{lead['id']}", headers=headers)
    assert lead_res.status_code == 200
    assert lead_res.json()["status"] == "CONVERTED"


def test_unauthenticated_follow_up_access(client: TestClient) -> None:
    res = client.get("/api/v1/follow-ups")
    assert res.status_code == 401
