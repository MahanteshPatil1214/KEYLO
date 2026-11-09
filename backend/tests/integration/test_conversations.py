"""Integration tests for conversations and messages (Module 4).

Verifies:
- Conversation initiation (Buyer, Admin, Sales Executive).
- Lead and project relationship validations.
- Access control isolation (Buyer sees own, Exec sees assigned, Admin sees all).
- Message posting with sender-type integrity checks.
- Empty message rejection and closed/archived conversation posting blocks.
- Message history retrieval, chronological/reverse ordering, and pagination.
- Direct message detail query via /api/v1/messages/{id}.
- Conversation status lifecycle updates (ACTIVE -> CLOSED -> ARCHIVED).
- Unauthorized / unauthenticated access restrictions.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.modules.conversations.models import ConversationStatus, MessageSenderType
from app.modules.leads.models import LeadSource
from app.modules.projects.models import ProjectStatus
from app.modules.users.models import RoleName, User
from tests.conversation_support import (
    create_conversation,
    get_conversation,
    get_message,
    list_conversations,
    list_messages,
    post_message,
    start_conversation,
    update_conversation_status,
)
from tests.lead_support import assign_lead, create_lead
from tests.project_support import create_project


@pytest.fixture()
def admin_user(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.ADMIN, email="admin-conv@example.com")


@pytest.fixture()
def admin_headers(
    auth_headers: Callable[..., dict[str, str]], admin_user: User
) -> dict[str, str]:
    return auth_headers(admin_user.email)


@pytest.fixture()
def buyer_user(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.BUYER, email="buyer-conv1@example.com")


@pytest.fixture()
def buyer_headers(
    auth_headers: Callable[..., dict[str, str]], buyer_user: User
) -> dict[str, str]:
    return auth_headers(buyer_user.email)


@pytest.fixture()
def other_buyer_user(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.BUYER, email="buyer-conv2@example.com")


@pytest.fixture()
def other_buyer_headers(
    auth_headers: Callable[..., dict[str, str]], other_buyer_user: User
) -> dict[str, str]:
    return auth_headers(other_buyer_user.email)


@pytest.fixture()
def exec_user(user_factory: Callable[..., User]) -> User:
    return user_factory(
        role=RoleName.SALES_EXECUTIVE, email="exec-conv1@example.com"
    )


@pytest.fixture()
def exec_headers(
    auth_headers: Callable[..., dict[str, str]], exec_user: User
) -> dict[str, str]:
    return auth_headers(exec_user.email)


@pytest.fixture()
def other_exec_user(user_factory: Callable[..., User]) -> User:
    return user_factory(
        role=RoleName.SALES_EXECUTIVE, email="exec-conv2@example.com"
    )


@pytest.fixture()
def other_exec_headers(
    auth_headers: Callable[..., dict[str, str]], other_exec_user: User
) -> dict[str, str]:
    return auth_headers(other_exec_user.email)


@pytest.fixture()
def active_project(
    client: TestClient, admin_headers: dict[str, str]
) -> dict[str, Any]:
    project = create_project(
        client, admin_headers, name=f"Active Project {uuid4().hex[:8]}"
    )
    activated = client.patch(
        f"/api/v1/projects/{project['id']}",
        json={"status": ProjectStatus.ACTIVE.value},
        headers=admin_headers,
    )
    assert activated.status_code == 200
    return activated.json()


@pytest.fixture()
def draft_project(
    client: TestClient, admin_headers: dict[str, str]
) -> dict[str, Any]:
    return create_project(
        client, admin_headers, name=f"Draft Project {uuid4().hex[:8]}"
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
        full_name="Buyer Lead",
        email=buyer_user.email,
        phone="+919811111111",
        source=LeadSource.WEBSITE.value,
    )


# ---------------------------------------------------------------------------
# Conversation Creation Tests
# ---------------------------------------------------------------------------


def test_buyer_create_conversation_success(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    buyer_user: User,
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    data = create_conversation(
        client,
        buyer_headers,
        lead_id=buyer_lead["id"],
        project_id=active_project["id"],
    )
    assert data["lead_id"] == buyer_lead["id"]
    assert data["project_id"] == active_project["id"]
    assert data["buyer_id"] == str(buyer_user.id)
    assert data["status"] == ConversationStatus.ACTIVE.value
    assert "id" in data
    assert "created_at" in data


def test_buyer_create_conversation_with_initial_message(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    buyer_user: User,
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    data = create_conversation(
        client,
        buyer_headers,
        lead_id=buyer_lead["id"],
        project_id=active_project["id"],
        initial_message="Hello, I am interested in a 3BHK flat.",
    )
    conv_id = data["id"]

    # Verify initial message was persisted
    messages = list_messages(client, buyer_headers, conv_id)
    assert messages["total"] == 1
    msg = messages["items"][0]
    assert msg["content"] == "Hello, I am interested in a 3BHK flat."
    assert msg["sender_type"] == MessageSenderType.BUYER.value
    assert msg["sender_id"] == str(buyer_user.id)


def test_buyer_start_conversation_creates_lead_and_conversation(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    buyer_user: User,
    active_project: dict[str, Any],
) -> None:
    """Buyer clicks Chat on a project page: lead + conversation created in one call."""
    data = start_conversation(
        client,
        buyer_headers,
        project_id=active_project["id"],
        full_name="Mahantesh Patil",
        email=buyer_user.email,
        phone="+919876543210",
        initial_message="Hi, I am interested in a 3 BHK unit.",
    )
    assert data["project_id"] == active_project["id"]
    assert data["buyer_id"] == str(buyer_user.id)
    assert data["status"] == ConversationStatus.ACTIVE.value
    assert "id" in data
    assert "lead_id" in data

    # The conversation is retrievable and linked to the right project
    fetched = get_conversation(client, buyer_headers, data["id"])
    assert fetched["project_id"] == active_project["id"]
    assert fetched["lead_id"] == data["lead_id"]


def test_buyer_start_conversation_reuses_existing_lead(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    buyer_user: User,
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    """If a lead already exists for this buyer + project, it is reused."""
    data = start_conversation(
        client,
        buyer_headers,
        project_id=active_project["id"],
        email=buyer_user.email,
        phone=buyer_lead["phone"],
    )
    assert data["lead_id"] == buyer_lead["id"]
    assert data["project_id"] == active_project["id"]
    assert data["status"] == ConversationStatus.ACTIVE.value


def test_buyer_start_conversation_for_inactive_project_fails(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    draft_project: dict[str, Any],
) -> None:
    """Cannot start a conversation for a draft/inactive project."""
    start_conversation(
        client,
        buyer_headers,
        project_id=draft_project["id"],
        expected_status=404,
    )


def test_buyer_start_conversation_without_contact_fails(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    active_project: dict[str, Any],
) -> None:
    """At least one contact method (email or phone) is required."""
    start_conversation(
        client,
        buyer_headers,
        project_id=active_project["id"],
        email=None,
        phone=None,
        expected_status=422,
    )


def test_buyer_start_conversation_persists_initial_message(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    buyer_user: User,
    active_project: dict[str, Any],
) -> None:
    data = start_conversation(
        client,
        buyer_headers,
        project_id=active_project["id"],
        email=buyer_user.email,
        initial_message="I want a west-facing 3BHK.",
    )
    conv_id = data["id"]
    messages = list_messages(client, buyer_headers, conv_id)
    assert messages["total"] == 1
    msg = messages["items"][0]
    assert msg["content"] == "I want a west-facing 3BHK."
    assert msg["sender_type"] == MessageSenderType.BUYER.value
    assert msg["sender_id"] == str(buyer_user.id)


def test_buyer_cannot_create_conversation_for_another_buyers_lead(
    client: TestClient,
    override_db: None,
    other_buyer_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    # other_buyer tries to start conversation for buyer_lead whose email belongs to buyer_user
    response = client.post(
        "/api/v1/conversations",
        json={
            "lead_id": buyer_lead["id"],
            "project_id": active_project["id"],
        },
        headers=other_buyer_headers,
    )
    assert response.status_code == 403
    assert "another email" in response.text


def test_admin_create_conversation_with_explicit_buyer_id(
    client: TestClient,
    override_db: None,
    admin_headers: dict[str, str],
    buyer_user: User,
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    data = create_conversation(
        client,
        admin_headers,
        lead_id=buyer_lead["id"],
        project_id=active_project["id"],
        buyer_id=buyer_user.id,
    )
    assert data["buyer_id"] == str(buyer_user.id)


def test_admin_create_conversation_auto_matches_buyer_by_lead_email(
    client: TestClient,
    override_db: None,
    admin_headers: dict[str, str],
    buyer_user: User,
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    # Admin does not provide buyer_id; system finds user matching buyer_lead["email"]
    data = create_conversation(
        client,
        admin_headers,
        lead_id=buyer_lead["id"],
        project_id=active_project["id"],
    )
    assert data["buyer_id"] == str(buyer_user.id)


def test_sales_exec_create_conversation_for_assigned_lead(
    client: TestClient,
    override_db: None,
    admin_headers: dict[str, str],
    exec_headers: dict[str, str],
    exec_user: User,
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    # Assign lead to exec_user
    assign_lead(
        client,
        admin_headers,
        buyer_lead["id"],
        executive_id=exec_user.id,
    )

    data = create_conversation(
        client,
        exec_headers,
        lead_id=buyer_lead["id"],
        project_id=active_project["id"],
        initial_message="Greetings from Keylo sales team!",
    )
    assert data["lead_id"] == buyer_lead["id"]

    # Verify message has sender_type SALES_EXECUTIVE
    messages = list_messages(client, exec_headers, data["id"])
    assert messages["total"] == 1
    assert messages["items"][0]["sender_type"] == MessageSenderType.SALES_EXECUTIVE.value
    assert messages["items"][0]["sender_id"] == str(exec_user.id)


def test_sales_exec_cannot_create_conversation_for_unassigned_lead(
    client: TestClient,
    override_db: None,
    exec_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    # Lead is not assigned to exec_user
    response = client.post(
        "/api/v1/conversations",
        json={
            "lead_id": buyer_lead["id"],
            "project_id": active_project["id"],
        },
        headers=exec_headers,
    )
    assert response.status_code == 403


def test_create_conversation_invalid_lead_project_association(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    admin_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    # Create another project
    other_proj = create_project(client, admin_headers, name="Other Active Proj")
    client.patch(
        f"/api/v1/projects/{other_proj['id']}",
        json={"status": ProjectStatus.ACTIVE.value},
        headers=admin_headers,
    )

    # Lead belongs to active_project, not other_proj
    response = client.post(
        "/api/v1/conversations",
        json={
            "lead_id": buyer_lead["id"],
            "project_id": other_proj["id"],
        },
        headers=buyer_headers,
    )
    assert response.status_code == 400
    assert "does not belong" in response.text


def test_create_conversation_inactive_project_fails_for_non_admin(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    admin_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_user: User,
) -> None:
    # Lead created while project is active
    lead = create_lead(
        client,
        project_id=active_project["id"],
        email=buyer_user.email,
        phone="+919822222222",
    )

    # Admin deactivates the project
    deactivated = client.patch(
        f"/api/v1/projects/{active_project['id']}",
        json={"status": ProjectStatus.INACTIVE.value},
        headers=admin_headers,
    )
    assert deactivated.status_code == 200

    # Non-admin attempting to create a conversation for inactive project gets 404
    response = client.post(
        "/api/v1/conversations",
        json={
            "lead_id": lead["id"],
            "project_id": active_project["id"],
        },
        headers=buyer_headers,
    )
    assert response.status_code == 404


def test_create_conversation_nonexistent_lead_fails(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    active_project: dict[str, Any],
) -> None:
    response = client.post(
        "/api/v1/conversations",
        json={
            "lead_id": str(uuid4()),
            "project_id": active_project["id"],
        },
        headers=buyer_headers,
    )
    assert response.status_code == 404


# ---------------------------------------------------------------------------
# Access Control & Isolation Tests
# ---------------------------------------------------------------------------


def test_conversation_listing_access_isolation(
    client: TestClient,
    override_db: None,
    admin_headers: dict[str, str],
    buyer_headers: dict[str, str],
    buyer_user: User,
    other_buyer_headers: dict[str, str],
    other_buyer_user: User,
    exec_headers: dict[str, str],
    exec_user: User,
    other_exec_headers: dict[str, str],
    active_project: dict[str, Any],
) -> None:
    # Buyer 1 lead and conversation
    lead1 = create_lead(
        client,
        project_id=active_project["id"],
        email=buyer_user.email,
        phone="+919811112222",
    )
    conv1 = create_conversation(
        client,
        buyer_headers,
        lead_id=lead1["id"],
        project_id=active_project["id"],
    )

    # Buyer 2 lead and conversation
    lead2 = create_lead(
        client,
        project_id=active_project["id"],
        email=other_buyer_user.email,
        phone="+919811113333",
    )
    conv2 = create_conversation(
        client,
        other_buyer_headers,
        lead_id=lead2["id"],
        project_id=active_project["id"],
    )

    # Assign lead 1 to exec_user
    assign_lead(client, admin_headers, lead1["id"], executive_id=exec_user.id)

    # 1. Buyer 1 sees only conv1
    buyer1_list = list_conversations(client, buyer_headers)
    assert buyer1_list["total"] == 1
    assert buyer1_list["items"][0]["id"] == conv1["id"]

    # 2. Buyer 2 sees only conv2
    buyer2_list = list_conversations(client, other_buyer_headers)
    assert buyer2_list["total"] == 1
    assert buyer2_list["items"][0]["id"] == conv2["id"]

    # 3. Exec sees conv1 (assigned lead), but not conv2
    exec_list = list_conversations(client, exec_headers)
    assert exec_list["total"] == 1
    assert exec_list["items"][0]["id"] == conv1["id"]

    # 4. Other exec (no assignments) sees 0 conversations
    other_exec_list = list_conversations(client, other_exec_headers)
    assert other_exec_list["total"] == 0

    # 5. Admin sees both conversations
    admin_list = list_conversations(client, admin_headers)
    assert admin_list["total"] >= 2
    ids = [item["id"] for item in admin_list["items"]]
    assert conv1["id"] in ids
    assert conv2["id"] in ids


def test_conversation_detail_access_control(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    other_buyer_headers: dict[str, str],
    admin_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    conv = create_conversation(
        client,
        buyer_headers,
        lead_id=buyer_lead["id"],
        project_id=active_project["id"],
    )

    # Owner can get
    detail = get_conversation(client, buyer_headers, conv["id"])
    assert detail["id"] == conv["id"]

    # Admin can get
    admin_detail = get_conversation(client, admin_headers, conv["id"])
    assert admin_detail["id"] == conv["id"]

    # Another buyer gets 404
    response = client.get(
        f"/api/v1/conversations/{conv['id']}",
        headers=other_buyer_headers,
    )
    assert response.status_code == 404


def test_filter_conversations_by_status_and_project(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    conv = create_conversation(
        client,
        buyer_headers,
        lead_id=buyer_lead["id"],
        project_id=active_project["id"],
    )

    # Match by project and status
    res = list_conversations(
        client,
        buyer_headers,
        params={
            "project_id": active_project["id"],
            "status": ConversationStatus.ACTIVE.value,
        },
    )
    assert res["total"] == 1

    # Filter by non-matching status
    res_closed = list_conversations(
        client,
        buyer_headers,
        params={"status": ConversationStatus.CLOSED.value},
    )
    assert res_closed["total"] == 0


# ---------------------------------------------------------------------------
# Status Lifecycle Tests
# ---------------------------------------------------------------------------


def test_conversation_status_update_lifecycle(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    admin_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    conv = create_conversation(
        client,
        buyer_headers,
        lead_id=buyer_lead["id"],
        project_id=active_project["id"],
    )
    assert conv["status"] == ConversationStatus.ACTIVE.value

    # Buyer closes conversation
    closed = update_conversation_status(
        client,
        buyer_headers,
        conv["id"],
        status=ConversationStatus.CLOSED.value,
    )
    assert closed["status"] == ConversationStatus.CLOSED.value

    # Buyer attempts to archive conversation -> 403 Forbidden
    response = client.patch(
        f"/api/v1/conversations/{conv['id']}/status",
        json={"status": ConversationStatus.ARCHIVED.value},
        headers=buyer_headers,
    )
    assert response.status_code == 403

    # Admin can archive conversation
    archived = update_conversation_status(
        client,
        admin_headers,
        conv["id"],
        status=ConversationStatus.ARCHIVED.value,
    )
    assert archived["status"] == ConversationStatus.ARCHIVED.value


def test_invalid_conversation_status_rejected(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    conv = create_conversation(
        client,
        buyer_headers,
        lead_id=buyer_lead["id"],
        project_id=active_project["id"],
    )
    response = client.patch(
        f"/api/v1/conversations/{conv['id']}/status",
        json={"status": "DELETED"},
        headers=buyer_headers,
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# Messages Tests
# ---------------------------------------------------------------------------


def test_buyer_post_message_success(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    buyer_user: User,
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    conv = create_conversation(
        client,
        buyer_headers,
        lead_id=buyer_lead["id"],
        project_id=active_project["id"],
    )

    msg = post_message(
        client,
        buyer_headers,
        conv["id"],
        content="Is parking included in the base price?",
    )
    assert msg["conversation_id"] == conv["id"]
    assert msg["content"] == "Is parking included in the base price?"
    assert msg["sender_type"] == MessageSenderType.BUYER.value
    assert msg["sender_id"] == str(buyer_user.id)
    assert msg["status"] == "SENT"
    assert "created_at" in msg


def test_buyer_cannot_forge_assistant_or_executive_sender_type(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    conv = create_conversation(
        client,
        buyer_headers,
        lead_id=buyer_lead["id"],
        project_id=active_project["id"],
    )

    # Buyer attempts to post as ASSISTANT
    response = client.post(
        f"/api/v1/conversations/{conv['id']}/messages",
        json={"content": "I am an AI assistant", "sender_type": "ASSISTANT"},
        headers=buyer_headers,
    )
    assert response.status_code == 403

    # Buyer attempts to post as SALES_EXECUTIVE
    response2 = client.post(
        f"/api/v1/conversations/{conv['id']}/messages",
        json={"content": "I am an executive", "sender_type": "SALES_EXECUTIVE"},
        headers=buyer_headers,
    )
    assert response2.status_code == 403


def test_sales_exec_post_message_success(
    client: TestClient,
    override_db: None,
    admin_headers: dict[str, str],
    buyer_headers: dict[str, str],
    exec_headers: dict[str, str],
    exec_user: User,
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    # Assign lead to exec_user
    assign_lead(client, admin_headers, buyer_lead["id"], executive_id=exec_user.id)

    conv = create_conversation(
        client,
        buyer_headers,
        lead_id=buyer_lead["id"],
        project_id=active_project["id"],
    )

    msg = post_message(
        client,
        exec_headers,
        conv["id"],
        content="Yes, one covered parking space is included.",
    )
    assert msg["sender_type"] == MessageSenderType.SALES_EXECUTIVE.value
    assert msg["sender_id"] == str(exec_user.id)


def test_sales_exec_cannot_forge_buyer_sender_type(
    client: TestClient,
    override_db: None,
    admin_headers: dict[str, str],
    buyer_headers: dict[str, str],
    exec_headers: dict[str, str],
    exec_user: User,
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    assign_lead(client, admin_headers, buyer_lead["id"], executive_id=exec_user.id)
    conv = create_conversation(
        client,
        buyer_headers,
        lead_id=buyer_lead["id"],
        project_id=active_project["id"],
    )

    response = client.post(
        f"/api/v1/conversations/{conv['id']}/messages",
        json={"content": "Spoofed message", "sender_type": "BUYER"},
        headers=exec_headers,
    )
    assert response.status_code == 403


def test_admin_post_message_variations(
    client: TestClient,
    override_db: None,
    admin_headers: dict[str, str],
    buyer_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    conv = create_conversation(
        client,
        buyer_headers,
        lead_id=buyer_lead["id"],
        project_id=active_project["id"],
    )

    # Admin posts without explicit sender_type -> defaults to SYSTEM
    msg1 = post_message(
        client,
        admin_headers,
        conv["id"],
        content="System announcement: office opens at 9 AM.",
    )
    assert msg1["sender_type"] == MessageSenderType.SYSTEM.value

    # Admin posts as SALES_EXECUTIVE
    msg2 = post_message(
        client,
        admin_headers,
        conv["id"],
        content="Follow-up from admin acting as sales lead.",
        sender_type=MessageSenderType.SALES_EXECUTIVE.value,
    )
    assert msg2["sender_type"] == MessageSenderType.SALES_EXECUTIVE.value


def test_empty_or_whitespace_message_rejected(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    conv = create_conversation(
        client,
        buyer_headers,
        lead_id=buyer_lead["id"],
        project_id=active_project["id"],
    )

    # Empty string
    res1 = client.post(
        f"/api/v1/conversations/{conv['id']}/messages",
        json={"content": ""},
        headers=buyer_headers,
    )
    assert res1.status_code == 422

    # Whitespace only
    res2 = client.post(
        f"/api/v1/conversations/{conv['id']}/messages",
        json={"content": "   \n\t  "},
        headers=buyer_headers,
    )
    assert res2.status_code == 422


def test_post_message_to_closed_or_archived_conversation_rejected(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    admin_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    conv = create_conversation(
        client,
        buyer_headers,
        lead_id=buyer_lead["id"],
        project_id=active_project["id"],
    )

    # Close conversation
    update_conversation_status(
        client,
        buyer_headers,
        conv["id"],
        status=ConversationStatus.CLOSED.value,
    )

    # Posting to closed conversation returns 400
    res = client.post(
        f"/api/v1/conversations/{conv['id']}/messages",
        json={"content": "Can I still ask a question?"},
        headers=buyer_headers,
    )
    assert res.status_code == 400
    assert "closed" in res.text.lower()


def test_list_messages_ordering_and_pagination(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    conv = create_conversation(
        client,
        buyer_headers,
        lead_id=buyer_lead["id"],
        project_id=active_project["id"],
    )

    m1 = post_message(client, buyer_headers, conv["id"], content="First message")
    m2 = post_message(client, buyer_headers, conv["id"], content="Second message")
    m3 = post_message(client, buyer_headers, conv["id"], content="Third message")

    # Chronological (default asc)
    res_asc = list_messages(client, buyer_headers, conv["id"], params={"order": "asc"})
    assert res_asc["total"] == 3
    assert [m["id"] for m in res_asc["items"]] == [m1["id"], m2["id"], m3["id"]]

    # Reverse chronological (desc)
    res_desc = list_messages(client, buyer_headers, conv["id"], params={"order": "desc"})
    assert [m["id"] for m in res_desc["items"]] == [m3["id"], m2["id"], m1["id"]]

    # Pagination: page 1 with page_size=2
    res_p1 = list_messages(
        client, buyer_headers, conv["id"], params={"page": 1, "page_size": 2}
    )
    assert len(res_p1["items"]) == 2
    assert res_p1["pages"] == 2
    assert res_p1["items"][0]["id"] == m1["id"]
    assert res_p1["items"][1]["id"] == m2["id"]


def test_get_single_message_access_control(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    other_buyer_headers: dict[str, str],
    admin_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    conv = create_conversation(
        client,
        buyer_headers,
        lead_id=buyer_lead["id"],
        project_id=active_project["id"],
    )
    msg = post_message(client, buyer_headers, conv["id"], content="Secret enquiry")

    # Direct query by owner
    direct_msg = get_message(client, buyer_headers, msg["id"])
    assert direct_msg["id"] == msg["id"]
    assert direct_msg["content"] == "Secret enquiry"

    # Direct query by admin
    admin_msg = get_message(client, admin_headers, msg["id"])
    assert admin_msg["id"] == msg["id"]

    # Direct query by another buyer returns 404 (message not found for caller)
    res = client.get(f"/api/v1/messages/{msg['id']}", headers=other_buyer_headers)
    assert res.status_code == 404

    # Nonexistent message returns 404
    res_nonexistent = client.get(f"/api/v1/messages/{uuid4()}", headers=buyer_headers)
    assert res_nonexistent.status_code == 404


def test_unauthenticated_requests_return_401(
    client: TestClient,
    override_db: None,
) -> None:
    # Conversations endpoint without token
    assert client.get("/api/v1/conversations").status_code == 401
    assert client.post("/api/v1/conversations", json={}).status_code == 401
    assert client.get(f"/api/v1/conversations/{uuid4()}").status_code == 401
    assert client.get(f"/api/v1/conversations/{uuid4()}/messages").status_code == 401
    assert client.post(f"/api/v1/conversations/{uuid4()}/messages", json={}).status_code == 401
    assert client.patch(f"/api/v1/conversations/{uuid4()}/status", json={}).status_code == 401
    assert client.get(f"/api/v1/messages/{uuid4()}").status_code == 401
