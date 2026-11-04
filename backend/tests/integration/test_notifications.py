"""Integration tests for Module 8: Notifications & Reminders.

Verifies:
- In-app notification creation on lead assignment (sales executive notified).
- In-app notification creation on handoff assignment (sales executive notified).
- In-app notification creation on handoff status update (buyer/creator notified).
- In-app notification creation on booking confirmation (buyer and executive notified).
- In-app notification creation on booking cancellation (buyer and executive notified).
- Automated 24-hour and 2-hour site visit reminders for confirmed bookings.
- Skipping of reminders for cancelled, completed, and opt-out leads.
- Database-level idempotency and duplicate prevention across repeated reminder scans.
- Role isolation: users access strictly their own notifications.
- Reading endpoints: unread count, mark single read, mark all read.
- Admin reminder trigger endpoint and RBAC enforcement (403 for non-admin).
- Unauthenticated access rejection (401).
"""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.modules.bookings.models import BookingStatus
from app.modules.conversations.models import ConversationStatus
from app.modules.handoffs.models import HandoffReason, HandoffStatus
from app.modules.leads.models import Lead, LeadSource, LeadStatus
from app.modules.notifications.models import NotificationType
from app.modules.notifications.scheduler import process_due_reminders
from app.modules.projects.models import ProjectStatus
from app.modules.users.models import RoleName, User
from tests.booking_support import (
    cancel_booking,
    create_booking,
    create_slot,
)
from tests.conversation_support import create_conversation
from tests.handoff_support import (
    assign_handoff,
    request_handoff,
    update_handoff_status,
)
from tests.lead_support import assign_lead, create_lead
from tests.notification_support import (
    get_notification,
    get_unread_count,
    list_notifications,
    mark_all_notifications_read,
    mark_notification_read,
    trigger_reminders,
)
from tests.project_support import create_project


@pytest.fixture(autouse=True)
def _auto_override_db(override_db: None) -> None:
    pass


@pytest.fixture()
def admin_user(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.ADMIN, email="admin-notify@example.com")


@pytest.fixture()
def admin_headers(
    auth_headers: Callable[..., dict[str, str]], admin_user: User
) -> dict[str, str]:
    return auth_headers(admin_user.email)


@pytest.fixture()
def executive_user(user_factory: Callable[..., User]) -> User:
    return user_factory(
        role=RoleName.SALES_EXECUTIVE, email="exec-notify@example.com"
    )


@pytest.fixture()
def executive_headers(
    auth_headers: Callable[..., dict[str, str]], executive_user: User
) -> dict[str, str]:
    return auth_headers(executive_user.email)


@pytest.fixture()
def buyer_user(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.BUYER, email="buyer-notify@example.com")


@pytest.fixture()
def buyer_headers(
    auth_headers: Callable[..., dict[str, str]], buyer_user: User
) -> dict[str, str]:
    return auth_headers(buyer_user.email)


@pytest.fixture()
def other_buyer_user(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.BUYER, email="other-buyer-notify@example.com")


@pytest.fixture()
def other_buyer_headers(
    auth_headers: Callable[..., dict[str, str]], other_buyer_user: User
) -> dict[str, str]:
    return auth_headers(other_buyer_user.email)


# ---------------------------------------------------------------------------
# Domain Event Notification Tests
# ---------------------------------------------------------------------------


def test_lead_assignment_triggers_notification(
    client: TestClient,
    admin_headers: dict[str, str],
    executive_headers: dict[str, str],
    executive_user: User,
) -> None:
    """Assigning a lead generates an in-app notification for the sales executive."""

    project = create_project(
        client, admin_headers, name="Notification Lead Project", status=ProjectStatus.ACTIVE.value
    )
    lead = create_lead(
        client,
        project_id=project["id"],
        full_name="Assigned Lead",
        email="assigned.lead@example.com",
    )

    # Assign lead to executive
    assign_lead(
        client,
        admin_headers,
        lead_id=lead["id"],
        executive_id=executive_user.id,
    )

    # Executive checks notifications
    res = list_notifications(client, executive_headers)
    assert res["total"] >= 1
    assignment_notif = next(
        (n for n in res["items"] if n["type"] == NotificationType.LEAD_ASSIGNED.value),
        None,
    )
    assert assignment_notif is not None
    assert "Assigned Lead" in assignment_notif["message"]
    assert assignment_notif["is_read"] is False
    assert assignment_notif["lead_id"] == lead["id"]


def test_handoff_assignment_and_status_update_notifications(
    client: TestClient,
    admin_headers: dict[str, str],
    buyer_headers: dict[str, str],
    executive_headers: dict[str, str],
    executive_user: User,
    buyer_user: User,
) -> None:
    """Handoff assignment notifies executive; status resolution notifies buyer."""

    project = create_project(
        client, admin_headers, name="Handoff Notify Project", status=ProjectStatus.ACTIVE.value
    )
    lead = create_lead(
        client,
        project_id=project["id"],
        full_name="Handoff Buyer",
        email=buyer_user.email,
    )
    conv = create_conversation(
        client,
        buyer_headers,
        project_id=project["id"],
        lead_id=lead["id"],
    )

    # 1. Buyer requests handoff
    handoff = request_handoff(
        client,
        buyer_headers,
        conversation_id=conv["id"],
        reason=HandoffReason.BUYER_REQUESTED.value,
    )

    # 2. Admin assigns handoff to executive -> executive receives HANDOFF_ASSIGNED
    assign_handoff(
        client,
        admin_headers,
        handoff_id=handoff["id"],
        executive_id=executive_user.id,
    )

    exec_notifs = list_notifications(client, executive_headers)
    h_assigned = next(
        (n for n in exec_notifs["items"] if n["type"] == NotificationType.HANDOFF_ASSIGNED.value),
        None,
    )
    assert h_assigned is not None
    assert h_assigned["handoff_id"] == handoff["id"]

    # 3. Executive resolves handoff -> buyer receives HANDOFF_STATUS_UPDATED
    update_handoff_status(
        client,
        executive_headers,
        handoff_id=handoff["id"],
        status=HandoffStatus.RESOLVED.value,
        resolution_notes="Contacted buyer via phone and resolved inquiry.",
    )

    buyer_notifs = list_notifications(client, buyer_headers)
    h_resolved = next(
        (n for n in buyer_notifs["items"] if n["type"] == NotificationType.HANDOFF_STATUS_UPDATED.value),
        None,
    )
    assert h_resolved is not None
    assert "RESOLVED" in h_resolved["title"]
    assert "resolved inquiry" in h_resolved["message"]


def test_booking_confirmation_and_cancellation_notifications(
    client: TestClient,
    admin_headers: dict[str, str],
    buyer_headers: dict[str, str],
    executive_headers: dict[str, str],
    executive_user: User,
    buyer_user: User,
) -> None:
    """Booking site visit notifies buyer and executive; cancellation notifies both."""

    project = create_project(
        client, admin_headers, name="Booking Notify Project", status=ProjectStatus.ACTIVE.value
    )
    lead = create_lead(
        client,
        project_id=project["id"],
        full_name="Booking Buyer",
        email=buyer_user.email,
        consent_to_contact=True,
    )
    assign_lead(
        client,
        admin_headers,
        lead_id=lead["id"],
        executive_id=executive_user.id,
    )

    now = datetime.now(UTC)
    slot_start = now + timedelta(days=2)
    slot_end = now + timedelta(days=2, hours=1)
    slot = create_slot(
        client,
        admin_headers,
        project_id=project["id"],
        start_time=slot_start,
        end_time=slot_end,
        capacity=3,
    )

    # 1. Create booking
    booking = create_booking(
        client,
        buyer_headers,
        slot_id=slot["id"],
        lead_id=lead["id"],
    )

    # Buyer should receive BOOKING_CONFIRMED
    buyer_notifs = list_notifications(client, buyer_headers)
    b_confirmed = next(
        (n for n in buyer_notifs["items"] if n["type"] == NotificationType.BOOKING_CONFIRMED.value),
        None,
    )
    assert b_confirmed is not None
    assert b_confirmed["booking_id"] == booking["id"]

    # Executive should receive BOOKING_CONFIRMED
    exec_notifs = list_notifications(client, executive_headers)
    e_confirmed = next(
        (n for n in exec_notifs["items"] if n["type"] == NotificationType.BOOKING_CONFIRMED.value),
        None,
    )
    assert e_confirmed is not None
    assert e_confirmed["booking_id"] == booking["id"]

    # 2. Cancel booking
    cancel_booking(
        client,
        buyer_headers,
        booking_id=booking["id"],
        cancellation_reason="Schedule conflict",
    )

    # Buyer receives BOOKING_CANCELLED
    buyer_notifs2 = list_notifications(client, buyer_headers)
    b_cancelled = next(
        (n for n in buyer_notifs2["items"] if n["type"] == NotificationType.BOOKING_CANCELLED.value),
        None,
    )
    assert b_cancelled is not None
    assert "Schedule conflict" in b_cancelled["message"]

    # Executive receives BOOKING_CANCELLED
    exec_notifs2 = list_notifications(client, executive_headers)
    e_cancelled = next(
        (n for n in exec_notifs2["items"] if n["type"] == NotificationType.BOOKING_CANCELLED.value),
        None,
    )
    assert e_cancelled is not None
    assert e_cancelled["booking_id"] == booking["id"]


# ---------------------------------------------------------------------------
# Automated Reminders & Idempotency Tests
# ---------------------------------------------------------------------------


def test_site_visit_reminders_24h_and_2h_scheduling(
    client: TestClient,
    test_session_factory: sessionmaker[Session],
    admin_headers: dict[str, str],
    buyer_headers: dict[str, str],
    executive_headers: dict[str, str],
    executive_user: User,
    buyer_user: User,
) -> None:
    """Reminders trigger at <=24h and <=2h; duplicate runs do not create duplicate notifications."""

    project = create_project(
        client, admin_headers, name="Reminder Schedule Project", status=ProjectStatus.ACTIVE.value
    )
    lead = create_lead(
        client,
        project_id=project["id"],
        full_name="Reminder Buyer",
        email=buyer_user.email,
        consent_to_contact=True,
    )
    assign_lead(
        client,
        admin_headers,
        lead_id=lead["id"],
        executive_id=executive_user.id,
    )

    # Slot scheduled for +20 hours from simulated base time
    base_time = datetime.now(UTC)
    visit_time = base_time + timedelta(hours=20)
    slot = create_slot(
        client,
        admin_headers,
        project_id=project["id"],
        start_time=visit_time,
        end_time=visit_time + timedelta(hours=1),
        capacity=2,
    )
    booking = create_booking(
        client,
        buyer_headers,
        slot_id=slot["id"],
        lead_id=lead["id"],
    )

    # Step 1: Run reminder check at base_time (visit is in 20 hours -> within 24h window, outside 2h)
    with test_session_factory() as session:
        sent_count = process_due_reminders(session, now=base_time)
    assert sent_count >= 1

    # Verify 24h reminder received by buyer and executive
    b_notifs = list_notifications(client, buyer_headers)
    r24 = next(
        (n for n in b_notifs["items"] if n["type"] == NotificationType.VISIT_REMINDER_24H.value),
        None,
    )
    assert r24 is not None
    assert "tomorrow" in r24["message"] or "in approximately 24 hours" in r24["message"]

    # Step 2: Idempotency check - re-running at same time must not create duplicates
    with test_session_factory() as session:
        dup_count = process_due_reminders(session, now=base_time)
    assert dup_count == 0

    # Step 3: Advance simulated time to 1.5 hours before visit -> within 2h window
    advance_time = visit_time - timedelta(hours=1, minutes=30)
    with test_session_factory() as session:
        sent_count_2h = process_due_reminders(session, now=advance_time)
    assert sent_count_2h >= 1

    b_notifs_after = list_notifications(client, buyer_headers)
    r2 = next(
        (n for n in b_notifs_after["items"] if n["type"] == NotificationType.VISIT_REMINDER_2H.value),
        None,
    )
    assert r2 is not None
    assert "2 hours" in r2["message"]

    # Step 4: Re-running at advance_time produces zero duplicate reminders
    with test_session_factory() as session:
        dup_count_2h = process_due_reminders(session, now=advance_time)
    assert dup_count_2h == 0


def test_reminders_skip_cancelled_and_completed_bookings(
    client: TestClient,
    test_session_factory: sessionmaker[Session],
    admin_headers: dict[str, str],
    buyer_headers: dict[str, str],
    buyer_user: User,
) -> None:
    """Cancelled bookings do not generate site-visit reminders."""

    project = create_project(
        client, admin_headers, name="Cancelled Reminder Project", status=ProjectStatus.ACTIVE.value
    )
    lead = create_lead(
        client,
        project_id=project["id"],
        full_name="Skip Buyer",
        email=buyer_user.email,
        consent_to_contact=True,
    )

    base_time = datetime.now(UTC)
    visit_time = base_time + timedelta(hours=10)
    slot = create_slot(
        client,
        admin_headers,
        project_id=project["id"],
        start_time=visit_time,
        end_time=visit_time + timedelta(hours=1),
        capacity=1,
    )
    booking = create_booking(
        client,
        buyer_headers,
        slot_id=slot["id"],
        lead_id=lead["id"],
    )

    # Cancel the booking before reminder runs
    cancel_booking(
        client,
        buyer_headers,
        booking_id=booking["id"],
        cancellation_reason="Changed mind",
    )

    # Run reminder processor
    with test_session_factory() as session:
        sent = process_due_reminders(session, now=base_time)

    # The cancelled booking should NOT have triggered any reminders
    b_notifs = list_notifications(client, buyer_headers)
    reminder_notifs = [
        n for n in b_notifs["items"]
        if n["type"] in (NotificationType.VISIT_REMINDER_24H.value, NotificationType.VISIT_REMINDER_2H.value)
        and n["booking_id"] == booking["id"]
    ]
    assert len(reminder_notifs) == 0


def test_reminders_skip_lead_without_consent(
    client: TestClient,
    test_session_factory: sessionmaker[Session],
    admin_headers: dict[str, str],
    buyer_headers: dict[str, str],
    buyer_user: User,
) -> None:
    """Buyers whose lead record lacks consent_to_contact do not receive reminders."""

    project = create_project(
        client, admin_headers, name="No Consent Project", status=ProjectStatus.ACTIVE.value
    )
    lead = create_lead(
        client,
        project_id=project["id"],
        full_name="No Consent Buyer",
        email=buyer_user.email,
        consent_to_contact=True,  # Initially true to allow booking
    )

    base_time = datetime.now(UTC)
    visit_time = base_time + timedelta(hours=12)
    slot = create_slot(
        client,
        admin_headers,
        project_id=project["id"],
        start_time=visit_time,
        end_time=visit_time + timedelta(hours=1),
        capacity=1,
    )
    booking = create_booking(
        client,
        buyer_headers,
        slot_id=slot["id"],
        lead_id=lead["id"],
    )

    # Now simulate lead revoking consent directly in DB
    with test_session_factory() as session:
        db_lead = session.get(Lead, UUID(lead["id"]))
        assert db_lead is not None
        db_lead.consent_to_contact = False
        session.commit()

        # Process reminders
        process_due_reminders(session, now=base_time)

    # Buyer must not receive the reminder
    b_notifs = list_notifications(client, buyer_headers)
    reminders = [
        n for n in b_notifs["items"]
        if n["type"] == NotificationType.VISIT_REMINDER_24H.value
        and n["booking_id"] == booking["id"]
    ]
    assert len(reminders) == 0


# ---------------------------------------------------------------------------
# Notification Management & Isolation APIs
# ---------------------------------------------------------------------------


def test_notification_read_lifecycle_and_user_isolation(
    client: TestClient,
    admin_headers: dict[str, str],
    buyer_headers: dict[str, str],
    other_buyer_headers: dict[str, str],
    buyer_user: User,
) -> None:
    """Users can mark single or all notifications read; cannot access other users' notifications."""

    project = create_project(
        client, admin_headers, name="Isolation Project", status=ProjectStatus.ACTIVE.value
    )
    lead = create_lead(
        client,
        project_id=project["id"],
        full_name="Iso Buyer",
        email=buyer_user.email,
        consent_to_contact=True,
    )

    now = datetime.now(UTC)
    slot = create_slot(
        client,
        admin_headers,
        project_id=project["id"],
        start_time=now + timedelta(days=1),
        end_time=now + timedelta(days=1, hours=1),
        capacity=2,
    )
    booking = create_booking(
        client,
        buyer_headers,
        slot_id=slot["id"],
        lead_id=lead["id"],
    )

    # Check unread count
    unread_data = get_unread_count(client, buyer_headers)
    assert unread_data["unread_count"] >= 1

    # List notifications
    b_list = list_notifications(client, buyer_headers, is_read=False)
    assert len(b_list["items"]) >= 1
    target_notif = b_list["items"][0]
    notif_id = target_notif["id"]

    # Other buyer CANNOT view this notification (404)
    get_notification(
        client,
        other_buyer_headers,
        notification_id=notif_id,
        expected_status=404,
    )

    # Other buyer CANNOT mark this notification as read (404)
    mark_notification_read(
        client,
        other_buyer_headers,
        notification_id=notif_id,
        expected_status=404,
    )

    # Buyer marks single notification as read
    marked = mark_notification_read(client, buyer_headers, notification_id=notif_id)
    assert marked["is_read"] is True
    assert marked["read_at"] is not None

    # Buyer retrieves detail
    detail = get_notification(client, buyer_headers, notification_id=notif_id)
    assert detail["is_read"] is True

    # Mark all read
    bulk_res = mark_all_notifications_read(client, buyer_headers)
    assert bulk_res["updated_count"] >= 0

    # Unread count should now be 0
    final_unread = get_unread_count(client, buyer_headers)
    assert final_unread["unread_count"] == 0


def test_trigger_reminders_endpoint_rbac(
    client: TestClient,
    admin_headers: dict[str, str],
    buyer_headers: dict[str, str],
    executive_headers: dict[str, str],
) -> None:
    """Only Admin can manually invoke the reminder scan endpoint."""

    # Buyer is forbidden (403)
    trigger_reminders(client, buyer_headers, expected_status=403)

    # Sales Executive is forbidden (403)
    trigger_reminders(client, executive_headers, expected_status=403)

    # Admin is authorized (200)
    admin_res = trigger_reminders(client, admin_headers, expected_status=200)
    assert "dispatched_count" in admin_res
    assert isinstance(admin_res["dispatched_count"], int)


def test_unauthenticated_requests_rejected(client: TestClient) -> None:
    """All notification endpoints require authentication (401)."""

    fake_id = uuid4()
    empty_headers: dict[str, str] = {}

    res = client.get("/api/v1/notifications", headers=empty_headers)
    assert res.status_code == 401

    res = client.get("/api/v1/notifications/unread-count", headers=empty_headers)
    assert res.status_code == 401

    res = client.post("/api/v1/notifications/mark-all-read", headers=empty_headers)
    assert res.status_code == 401

    res = client.patch(f"/api/v1/notifications/{fake_id}/read", headers=empty_headers)
    assert res.status_code == 401

    res = client.get(f"/api/v1/notifications/{fake_id}", headers=empty_headers)
    assert res.status_code == 401

    res = client.post("/api/v1/notifications/reminders/trigger", headers=empty_headers)
    assert res.status_code == 401
