"""Integration tests for Module 7: Human Handoff.

Verifies:
- Buyers can request a human sales executive on active conversations.
- SYSTEM notification message is saved in conversation via Module 4.
- Prevention of duplicate active handoffs (409 Conflict).
- Admin can assign or reassign handoffs to active sales executives.
- Non-admin forbidden from assigning executives (403).
- Role-based visibility isolation (Sales Executives view only assigned handoffs; Admin views all).
- Status lifecycle transitions (PENDING -> ASSIGNED -> IN_PROGRESS -> RESOLVED / CANCELLED).
- Terminal status protection (cannot reopen RESOLVED or CANCELLED).
- Automatic conversation flagging when AI cannot answer using approved facts.
- Rejection of handoffs on closed conversations (400).
- Unauthenticated access rejection (401).
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.ai_assistant.client import GroqClient
from app.modules.ai_assistant.router import get_assistant_client
from app.modules.conversations.models import ConversationStatus, MessageSenderType
from app.modules.handoffs.models import HandoffReason, HandoffStatus
from app.modules.leads.models import LeadSource, LeadStatus
from app.modules.projects.models import ProjectStatus
from app.modules.users.models import RoleName, User
from tests.conversation_support import (
    create_conversation,
    list_messages,
    update_conversation_status,
)
from tests.handoff_support import (
    assign_handoff,
    get_handoff,
    list_handoffs,
    request_handoff,
    update_handoff_status,
)
from tests.lead_support import assign_lead, create_lead
from tests.project_support import create_fact, create_project


@pytest.fixture()
def admin_user(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.ADMIN, email="admin-handoff@example.com")


@pytest.fixture()
def admin_headers(
    auth_headers: Callable[..., dict[str, str]], admin_user: User
) -> dict[str, str]:
    return auth_headers(admin_user.email)


@pytest.fixture()
def buyer_user(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.BUYER, email="buyer-handoff1@example.com")


@pytest.fixture()
def buyer_headers(
    auth_headers: Callable[..., dict[str, str]], buyer_user: User
) -> dict[str, str]:
    return auth_headers(buyer_user.email)


@pytest.fixture()
def exec_user1(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.SALES_EXECUTIVE, email="exec-handoff1@example.com")


@pytest.fixture()
def exec_headers1(
    auth_headers: Callable[..., dict[str, str]], exec_user1: User
) -> dict[str, str]:
    return auth_headers(exec_user1.email)


@pytest.fixture()
def exec_user2(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.SALES_EXECUTIVE, email="exec-handoff2@example.com")


@pytest.fixture()
def exec_headers2(
    auth_headers: Callable[..., dict[str, str]], exec_user2: User
) -> dict[str, str]:
    return auth_headers(exec_user2.email)


@pytest.fixture()
def active_project(client: TestClient, admin_headers: dict[str, str]) -> dict[str, Any]:
    return create_project(
        client,
        admin_headers,
        name=f"Handoff Project {uuid4().hex[:6]}",
        status=ProjectStatus.ACTIVE,
    )


@pytest.fixture()
def buyer_lead(
    client: TestClient,
    active_project: dict[str, Any],
    buyer_user: User,
) -> dict[str, Any]:
    return create_lead(
        client,
        project_id=active_project["id"],
        full_name="Handoff Buyer",
        email=buyer_user.email,
        phone="+919811223344",
        source=LeadSource.WEBSITE,
        consent_to_contact=True,
    )


@pytest.fixture()
def active_conversation(
    client: TestClient,
    buyer_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> dict[str, Any]:
    return create_conversation(
        client,
        buyer_headers,
        project_id=active_project["id"],
        lead_id=buyer_lead["id"],
        initial_message="Hello, I have questions about parking and layout.",
    )


def test_buyer_can_request_handoff_success(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    active_conversation: dict[str, Any],
) -> None:
    """A buyer can escalate an active conversation to a human sales executive."""

    res = request_handoff(
        client,
        buyer_headers,
        conversation_id=active_conversation["id"],
        reason="BUYER_REQUESTED",
        notes="Buyer wants custom installment schedule.",
    )

    assert res["conversation_id"] == active_conversation["id"]
    assert res["status"] == HandoffStatus.PENDING.value
    assert res["reason"] == HandoffReason.BUYER_REQUESTED.value
    assert "Handoff Buyer" in res["summary"]
    assert "Additional notes: Buyer wants custom installment schedule." in res["summary"]

    # Verify Module 4 received the SYSTEM notification message
    msgs = list_messages(client, buyer_headers, active_conversation["id"])
    system_msgs = [
        m for m in msgs["items"] if m["sender_type"] == MessageSenderType.SYSTEM.value
    ]
    assert len(system_msgs) == 1
    assert "A sales executive has been notified" in system_msgs[0]["content"]


def test_prevent_duplicate_active_handoff(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    active_conversation: dict[str, Any],
) -> None:
    """Duplicate handoff requests on the same active handoff return 409 Conflict."""

    # First request succeeds
    request_handoff(
        client,
        buyer_headers,
        conversation_id=active_conversation["id"],
    )

    # Second request rejected
    res2 = client.post(
        "/api/v1/handoffs",
        json={"conversation_id": active_conversation["id"]},
        headers=buyer_headers,
    )
    assert res2.status_code == 409
    assert "already exists" in res2.json()["error"]["message"]


def test_admin_assign_and_reassign_handoff(
    client: TestClient,
    override_db: None,
    admin_headers: dict[str, str],
    buyer_headers: dict[str, str],
    exec_headers1: dict[str, str],
    exec_user1: User,
    exec_user2: User,
    active_conversation: dict[str, Any],
) -> None:
    """Admin can assign and reassign a handoff to active sales executives."""

    handoff = request_handoff(
        client,
        buyer_headers,
        conversation_id=active_conversation["id"],
    )
    assert handoff["status"] == HandoffStatus.PENDING.value
    assert handoff["executive_id"] is None

    # Non-admin cannot assign
    non_admin_res = client.post(
        f"/api/v1/handoffs/{handoff['id']}/assign",
        json={"executive_id": str(exec_user1.id)},
        headers=exec_headers1,
    )
    assert non_admin_res.status_code == 403

    # Admin assigns to exec_user1
    assigned = assign_handoff(
        client,
        admin_headers,
        handoff["id"],
        executive_id=exec_user1.id,
    )
    assert assigned["status"] == HandoffStatus.ASSIGNED.value
    assert assigned["executive_id"] == str(exec_user1.id)
    assert assigned["executive_name"] == exec_user1.full_name
    assert assigned["assigned_at"] is not None

    # Conversation receives notification of executive assignment
    msgs = list_messages(client, buyer_headers, active_conversation["id"])
    system_msgs = [
        m for m in msgs["items"] if m["sender_type"] == MessageSenderType.SYSTEM.value
    ]
    assert any(exec_user1.full_name in m["content"] for m in system_msgs)

    # Admin reassigns to exec_user2
    reassigned = assign_handoff(
        client,
        admin_headers,
        handoff["id"],
        executive_id=exec_user2.id,
    )
    assert reassigned["executive_id"] == str(exec_user2.id)
    assert reassigned["executive_name"] == exec_user2.full_name


def test_sales_executive_can_view_only_assigned_handoffs(
    client: TestClient,
    override_db: None,
    admin_headers: dict[str, str],
    buyer_headers: dict[str, str],
    exec_headers1: dict[str, str],
    exec_headers2: dict[str, str],
    exec_user1: User,
    active_conversation: dict[str, Any],
) -> None:
    """Sales executives have isolated access; they only see their assigned handoffs."""

    handoff = request_handoff(
        client,
        buyer_headers,
        conversation_id=active_conversation["id"],
    )
    assign_handoff(client, admin_headers, handoff["id"], executive_id=exec_user1.id)

    # Executive 1 sees the handoff in listing and detail
    list_exec1 = list_handoffs(client, exec_headers1)
    assert any(h["id"] == handoff["id"] for h in list_exec1["items"])
    detail_exec1 = get_handoff(client, exec_headers1, handoff["id"])
    assert detail_exec1["id"] == handoff["id"]

    # Executive 2 cannot see it in listing and gets 404 on direct lookup
    list_exec2 = list_handoffs(client, exec_headers2)
    assert not any(h["id"] == handoff["id"] for h in list_exec2["items"])
    detail_exec2 = client.get(f"/api/v1/handoffs/{handoff['id']}", headers=exec_headers2)
    assert detail_exec2.status_code == 404

    # Admin sees all handoffs
    list_admin = list_handoffs(client, admin_headers)
    assert any(h["id"] == handoff["id"] for h in list_admin["items"])


def test_sales_executive_update_status_and_resolution(
    client: TestClient,
    override_db: None,
    admin_headers: dict[str, str],
    buyer_headers: dict[str, str],
    exec_headers1: dict[str, str],
    exec_user1: User,
    active_conversation: dict[str, Any],
) -> None:
    """Assigned executive can progress status to IN_PROGRESS and RESOLVED with notes."""

    handoff = request_handoff(
        client,
        buyer_headers,
        conversation_id=active_conversation["id"],
    )
    assign_handoff(client, admin_headers, handoff["id"], executive_id=exec_user1.id)

    # Buyer cannot update handoff status (403)
    res_buyer = client.patch(
        f"/api/v1/handoffs/{handoff['id']}/status",
        json={"status": "IN_PROGRESS"},
        headers=buyer_headers,
    )
    assert res_buyer.status_code == 403

    # Executive marks IN_PROGRESS
    in_prog = update_handoff_status(
        client,
        exec_headers1,
        handoff["id"],
        status="IN_PROGRESS",
    )
    assert in_prog["status"] == HandoffStatus.IN_PROGRESS.value

    # Resolving requires resolution notes
    res_no_notes = client.patch(
        f"/api/v1/handoffs/{handoff['id']}/status",
        json={"status": "RESOLVED"},
        headers=exec_headers1,
    )
    assert res_no_notes.status_code == 422

    # Executive marks RESOLVED with notes
    resolved = update_handoff_status(
        client,
        exec_headers1,
        handoff["id"],
        status="RESOLVED",
        resolution_notes="Contacted buyer on phone; resolved payment scheme questions.",
    )
    assert resolved["status"] == HandoffStatus.RESOLVED.value
    assert resolved["resolution_notes"] == "Contacted buyer on phone; resolved payment scheme questions."
    assert resolved["resolved_at"] is not None
    assert resolved["resolved_by_id"] == str(exec_user1.id)

    # Terminal state: cannot transition from RESOLVED to IN_PROGRESS (400)
    reopen_res = client.patch(
        f"/api/v1/handoffs/{handoff['id']}/status",
        json={"status": "IN_PROGRESS"},
        headers=exec_headers1,
    )
    assert reopen_res.status_code == 400


def test_buyer_nested_conversation_handoff_route(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    active_conversation: dict[str, Any],
) -> None:
    """The convenience endpoint POST /api/v1/conversations/{id}/handoff works."""

    res = client.post(
        f"/api/v1/conversations/{active_conversation['id']}/handoff",
        headers=buyer_headers,
    )
    assert res.status_code == 201
    body = res.json()
    assert body["conversation_id"] == active_conversation["id"]
    assert body["status"] == HandoffStatus.PENDING.value


def test_ai_assistant_auto_flags_conversation_when_facts_unavailable(
    client: TestClient,
    override_db: None,
    admin_headers: dict[str, str],
    buyer_headers: dict[str, str],
    active_conversation: dict[str, Any],
) -> None:
    """When AI fallback is triggered, conversation is automatically flagged for handoff."""

    class MockUnavailableGroq(GroqClient):
        def __init__(self) -> None:
            super().__init__(
                api_key="mock-key",
                model="openai/gpt-oss-120b",
            )

        def generate_chat_completion(self, **kwargs: Any) -> str:
            return "This information is currently not in the verified project fact sheet and a sales executive will confirm."

    mock_client = MockUnavailableGroq()
    app.dependency_overrides[get_assistant_client] = lambda: mock_client
    try:
        chat_res = client.post(
            f"/api/v1/conversations/{active_conversation['id']}/chat",
            json={"message": "What is the exact penalty clause in contract?"},
            headers=buyer_headers,
        )
        assert chat_res.status_code == 200

        # Verify a handoff was automatically flagged in the database
        handoffs = list_handoffs(client, admin_headers, conversation_id=active_conversation["id"])
        matching = [
            h for h in handoffs["items"] if h["conversation_id"] == active_conversation["id"]
        ]
        assert len(matching) == 1
        assert matching[0]["reason"] == HandoffReason.FACT_UNAVAILABLE.value
    finally:
        app.dependency_overrides.pop(get_assistant_client, None)


def test_handoff_on_closed_conversation_rejected(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    active_conversation: dict[str, Any],
) -> None:
    """Cannot request a human handoff on a closed conversation."""

    update_conversation_status(
        client,
        buyer_headers,
        active_conversation["id"],
        status=ConversationStatus.CLOSED.value,
    )

    res = client.post(
        "/api/v1/handoffs",
        json={"conversation_id": active_conversation["id"]},
        headers=buyer_headers,
    )
    assert res.status_code == 400
    assert "CLOSED" in res.json()["error"]["message"]


def test_unauthenticated_requests_return_401(
    client: TestClient,
    override_db: None,
) -> None:
    random_id = str(uuid4())
    assert client.get("/api/v1/handoffs").status_code == 401
    assert client.post("/api/v1/handoffs", json={}).status_code == 401
    assert client.get(f"/api/v1/handoffs/{random_id}").status_code == 401
    assert client.post(f"/api/v1/handoffs/{random_id}/assign", json={}).status_code == 401
    assert client.patch(f"/api/v1/handoffs/{random_id}/status", json={}).status_code == 401

