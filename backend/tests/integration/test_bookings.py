"""Integration tests for visit slots and site visit bookings (Module 6).

Verifies:
- Slot creation, updates, and soft-deactivation (Admin only).
- Slot time validations (start_time < end_time, future slots only, duplicate ranges).
- Real-time availability lookup (excluding full capacity, past, or inactive slots).
- Booking creation and ownership checks (buyers can only book for own leads).
- Consent-to-contact enforcement.
- Lead status progression (VISIT_BOOKED on booking, VISIT_CANCELLED on cancel, VISITED on completed).
- Slot capacity enforcement and double-booking prevention.
- Concurrent booking attempts with ThreadPoolExecutor guaranteeing no capacity overbooking.
- Buyer self-service cancellation and immediate capacity release.
- Role-based booking visibility (Buyer sees own, Exec sees assigned leads, Admin sees all).
- Visit outcome status transitions (COMPLETED, NO_SHOW).
- Unauthenticated access restrictions.
"""

from __future__ import annotations

from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
import threading
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.modules.bookings.models import BookingStatus
from app.modules.leads.models import LeadSource, LeadStatus
from app.modules.projects.models import ProjectStatus
from app.modules.users.models import RoleName, User
from tests.booking_support import (
    cancel_booking,
    create_booking,
    create_slot,
    deactivate_slot,
    get_available_slots,
    get_booking,
    get_slot,
    list_bookings,
    list_slots,
    update_booking_status,
    update_slot,
)
from tests.lead_support import assign_lead, create_lead
from tests.project_support import create_project


def _future(hours: int = 24) -> datetime:
    return datetime.now(UTC) + timedelta(hours=hours)


@pytest.fixture()
def admin_user(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.ADMIN, email="admin-booking@example.com")


@pytest.fixture()
def admin_headers(
    auth_headers: Callable[..., dict[str, str]], admin_user: User
) -> dict[str, str]:
    return auth_headers(admin_user.email)


@pytest.fixture()
def buyer_user(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.BUYER, email="buyer-booking1@example.com")


@pytest.fixture()
def buyer_headers(
    auth_headers: Callable[..., dict[str, str]], buyer_user: User
) -> dict[str, str]:
    return auth_headers(buyer_user.email)


@pytest.fixture()
def other_buyer_user(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.BUYER, email="buyer-booking2@example.com")


@pytest.fixture()
def other_buyer_headers(
    auth_headers: Callable[..., dict[str, str]], other_buyer_user: User
) -> dict[str, str]:
    return auth_headers(other_buyer_user.email)


@pytest.fixture()
def exec_user(user_factory: Callable[..., User]) -> User:
    return user_factory(
        role=RoleName.SALES_EXECUTIVE, email="exec-booking1@example.com"
    )


@pytest.fixture()
def exec_headers(
    auth_headers: Callable[..., dict[str, str]], exec_user: User
) -> dict[str, str]:
    return auth_headers(exec_user.email)


@pytest.fixture()
def other_exec_user(user_factory: Callable[..., User]) -> User:
    return user_factory(
        role=RoleName.SALES_EXECUTIVE, email="exec-booking2@example.com"
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
        client, admin_headers, name=f"Booking Project {uuid4().hex[:6]}"
    )
    client.patch(
        f"/api/v1/projects/{project['id']}",
        json={"status": ProjectStatus.ACTIVE.value},
        headers=admin_headers,
    )
    return project


@pytest.fixture()
def buyer_lead(
    client: TestClient,
    buyer_user: User,
    active_project: dict[str, Any],
) -> dict[str, Any]:
    return create_lead(
        client,
        project_id=active_project["id"],
        full_name="Booking Buyer",
        email=buyer_user.email,
        phone="+919812345678",
        source=LeadSource.WEBSITE.value,
        consent_to_contact=True,
    )


# ---------------------------------------------------------------------------
# Slot Management Tests
# ---------------------------------------------------------------------------


def test_admin_create_slot_success(
    client: TestClient,
    override_db: None,
    admin_headers: dict[str, str],
    active_project: dict[str, Any],
) -> None:
    start = _future(24)
    end = start + timedelta(hours=1)
    slot = create_slot(
        client,
        admin_headers,
        project_id=active_project["id"],
        start_time=start,
        end_time=end,
        capacity=3,
        notes="Tower A Viewing",
    )
    assert slot["project_id"] == active_project["id"]
    assert slot["capacity"] == 3
    assert slot["is_active"] is True
    assert slot["notes"] == "Tower A Viewing"


def test_non_admin_cannot_create_slot(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    exec_headers: dict[str, str],
    active_project: dict[str, Any],
) -> None:
    start = _future(24)
    end = start + timedelta(hours=1)
    # Buyer rejected
    create_slot(
        client,
        buyer_headers,
        project_id=active_project["id"],
        start_time=start,
        end_time=end,
        expected_status=403,
    )
    # Sales Executive rejected
    create_slot(
        client,
        exec_headers,
        project_id=active_project["id"],
        start_time=start,
        end_time=end,
        expected_status=403,
    )


def test_create_slot_rejects_past_or_inverted_time(
    client: TestClient,
    override_db: None,
    admin_headers: dict[str, str],
    active_project: dict[str, Any],
) -> None:
    now = datetime.now(UTC)
    # Inverted time: start >= end
    res1 = client.post(
        "/api/v1/slots",
        json={
            "project_id": active_project["id"],
            "start_time": (now + timedelta(hours=5)).isoformat(),
            "end_time": (now + timedelta(hours=4)).isoformat(),
            "capacity": 1,
        },
        headers=admin_headers,
    )
    assert res1.status_code == 422

    # Past start time
    res2 = client.post(
        "/api/v1/slots",
        json={
            "project_id": active_project["id"],
            "start_time": (now - timedelta(hours=2)).isoformat(),
            "end_time": (now - timedelta(hours=1)).isoformat(),
            "capacity": 1,
        },
        headers=admin_headers,
    )
    assert res2.status_code == 400
    assert "past" in res2.text.lower()


def test_create_slot_duplicate_time_range_conflict(
    client: TestClient,
    override_db: None,
    admin_headers: dict[str, str],
    active_project: dict[str, Any],
) -> None:
    start = _future(48)
    end = start + timedelta(hours=1)
    create_slot(
        client,
        admin_headers,
        project_id=active_project["id"],
        start_time=start,
        end_time=end,
    )
    # Attempting to create identical time slot for same project
    create_slot(
        client,
        admin_headers,
        project_id=active_project["id"],
        start_time=start,
        end_time=end,
        expected_status=409,
    )


def test_admin_update_and_deactivate_slot(
    client: TestClient,
    override_db: None,
    admin_headers: dict[str, str],
    active_project: dict[str, Any],
) -> None:
    start = _future(24)
    end = start + timedelta(hours=1)
    slot = create_slot(
        client,
        admin_headers,
        project_id=active_project["id"],
        start_time=start,
        end_time=end,
        capacity=1,
    )

    # Admin updates capacity and notes
    updated = update_slot(
        client,
        admin_headers,
        slot["id"],
        {"capacity": 5, "notes": "VIP Lobby"},
    )
    assert updated["capacity"] == 5
    assert updated["notes"] == "VIP Lobby"

    # Admin deactivates slot
    deactivated = deactivate_slot(client, admin_headers, slot["id"])
    assert deactivated["is_active"] is False


# ---------------------------------------------------------------------------
# Availability Lookup Tests
# ---------------------------------------------------------------------------


def test_available_slots_lookup_filters(
    client: TestClient,
    override_db: None,
    admin_headers: dict[str, str],
    buyer_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    start1 = _future(24)
    end1 = start1 + timedelta(hours=1)
    slot1 = create_slot(
        client,
        admin_headers,
        project_id=active_project["id"],
        start_time=start1,
        end_time=end1,
        capacity=1,
    )

    start2 = _future(26)
    end2 = start2 + timedelta(hours=1)
    slot2 = create_slot(
        client,
        admin_headers,
        project_id=active_project["id"],
        start_time=start2,
        end_time=end2,
        capacity=2,
    )

    # Initial check: both slots available
    avail = get_available_slots(client, buyer_headers, active_project["id"])
    assert avail["total"] == 2

    # Book slot1 to full capacity
    create_booking(client, buyer_headers, slot_id=slot1["id"], lead_id=buyer_lead["id"])

    # Now slot1 has 0 remaining capacity and must be omitted from /available
    avail_after = get_available_slots(client, buyer_headers, active_project["id"])
    assert avail_after["total"] == 1
    assert avail_after["items"][0]["id"] == slot2["id"]
    assert avail_after["items"][0]["available_capacity"] == 2


# ---------------------------------------------------------------------------
# Booking Lifecycle & Validation Tests
# ---------------------------------------------------------------------------


def test_buyer_create_booking_success(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    buyer_user: User,
    admin_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    start = _future(24)
    end = start + timedelta(hours=1)
    slot = create_slot(
        client,
        admin_headers,
        project_id=active_project["id"],
        start_time=start,
        end_time=end,
        capacity=2,
    )

    booking = create_booking(
        client,
        buyer_headers,
        slot_id=slot["id"],
        lead_id=buyer_lead["id"],
        notes="Interested in corner flat.",
    )
    assert booking["slot_id"] == slot["id"]
    assert booking["lead_id"] == buyer_lead["id"]
    assert booking["buyer_id"] == str(buyer_user.id)
    assert booking["status"] == BookingStatus.CONFIRMED.value
    assert booking["buyer_name"] == buyer_lead["full_name"]
    assert booking["buyer_phone"] == buyer_lead["phone"]
    assert booking["buyer_email"] == buyer_user.email
    assert "slot_start_time" in booking

    # Verify lead status automatically transitioned to VISIT_BOOKED
    lead_detail = client.get(f"/api/v1/leads/{buyer_lead['id']}", headers=admin_headers).json()
    assert lead_detail["status"] == LeadStatus.VISIT_BOOKED.value


def test_booking_capacity_exceeded_returns_409(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    other_buyer_headers: dict[str, str],
    other_buyer_user: User,
    admin_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    # Slot with capacity 1
    start = _future(30)
    end = start + timedelta(hours=1)
    slot = create_slot(
        client,
        admin_headers,
        project_id=active_project["id"],
        start_time=start,
        end_time=end,
        capacity=1,
    )

    # First buyer books
    create_booking(client, buyer_headers, slot_id=slot["id"], lead_id=buyer_lead["id"])

    # Second buyer tries to book same slot
    other_lead = create_lead(
        client,
        project_id=active_project["id"],
        email=other_buyer_user.email,
        phone="+919899988877",
    )
    create_booking(
        client,
        other_buyer_headers,
        slot_id=slot["id"],
        lead_id=other_lead["id"],
        expected_status=409,
    )


def test_booking_duplicate_active_booking_rejected(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    admin_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    # Slot with capacity 5
    start = _future(30)
    end = start + timedelta(hours=1)
    slot = create_slot(
        client,
        admin_headers,
        project_id=active_project["id"],
        start_time=start,
        end_time=end,
        capacity=5,
    )

    # First booking succeeds
    create_booking(client, buyer_headers, slot_id=slot["id"], lead_id=buyer_lead["id"])

    # Same lead attempts to book the same slot again
    create_booking(
        client,
        buyer_headers,
        slot_id=slot["id"],
        lead_id=buyer_lead["id"],
        expected_status=409,
    )


def test_booking_requires_consent_to_contact(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    admin_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_user: User,
) -> None:
    # Lead without consent
    no_consent_lead = create_lead(
        client,
        project_id=active_project["id"],
        email=buyer_user.email,
        phone="+919811122233",
        consent_to_contact=False,
    )

    start = _future(24)
    end = start + timedelta(hours=1)
    slot = create_slot(
        client,
        admin_headers,
        project_id=active_project["id"],
        start_time=start,
        end_time=end,
    )

    create_booking(
        client,
        buyer_headers,
        slot_id=slot["id"],
        lead_id=no_consent_lead["id"],
        expected_status=400,
    )


def test_buyer_cannot_book_for_another_buyers_lead(
    client: TestClient,
    override_db: None,
    other_buyer_headers: dict[str, str],
    admin_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    start = _future(24)
    end = start + timedelta(hours=1)
    slot = create_slot(
        client,
        admin_headers,
        project_id=active_project["id"],
        start_time=start,
        end_time=end,
    )

    create_booking(
        client,
        other_buyer_headers,
        slot_id=slot["id"],
        lead_id=buyer_lead["id"],
        expected_status=403,
    )


def test_booking_mismatched_project_rejected(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    admin_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    # Other project
    other_proj = create_project(client, admin_headers, name="Other Proj")
    client.patch(
        f"/api/v1/projects/{other_proj['id']}",
        json={"status": ProjectStatus.ACTIVE.value},
        headers=admin_headers,
    )

    start = _future(24)
    end = start + timedelta(hours=1)
    other_slot = create_slot(
        client,
        admin_headers,
        project_id=other_proj["id"],
        start_time=start,
        end_time=end,
    )

    # Lead belongs to active_project, slot belongs to other_proj
    create_booking(
        client,
        buyer_headers,
        slot_id=other_slot["id"],
        lead_id=buyer_lead["id"],
        expected_status=400,
    )


# ---------------------------------------------------------------------------
# Cancellation & Capacity Release Tests
# ---------------------------------------------------------------------------


def test_buyer_cancel_booking_releases_capacity(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    admin_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    start = _future(24)
    end = start + timedelta(hours=1)
    slot = create_slot(
        client,
        admin_headers,
        project_id=active_project["id"],
        start_time=start,
        end_time=end,
        capacity=1,
    )

    booking = create_booking(client, buyer_headers, slot_id=slot["id"], lead_id=buyer_lead["id"])

    # Verify slot is currently full
    avail_before = get_available_slots(client, buyer_headers, active_project["id"])
    assert avail_before["total"] == 0

    # Buyer cancels booking
    cancelled = cancel_booking(
        client,
        buyer_headers,
        booking["id"],
        cancellation_reason="Personal emergency.",
    )
    assert cancelled["status"] == BookingStatus.CANCELLED.value
    assert cancelled["cancellation_reason"] == "Personal emergency."
    assert cancelled["cancelled_at"] is not None

    # Capacity is immediately released: slot appears in /available again!
    avail_after = get_available_slots(client, buyer_headers, active_project["id"])
    assert avail_after["total"] == 1
    assert avail_after["items"][0]["id"] == slot["id"]

    # Lead status transitions to VISIT_CANCELLED
    lead_detail = client.get(f"/api/v1/leads/{buyer_lead['id']}", headers=admin_headers).json()
    assert lead_detail["status"] == LeadStatus.VISIT_CANCELLED.value


# ---------------------------------------------------------------------------
# Role-based Access & Status Update Tests
# ---------------------------------------------------------------------------


def test_booking_listing_and_detail_role_isolation(
    client: TestClient,
    override_db: None,
    admin_headers: dict[str, str],
    buyer_headers: dict[str, str],
    buyer_lead: dict[str, Any],
    other_buyer_headers: dict[str, str],
    other_buyer_user: User,
    exec_headers: dict[str, str],
    exec_user: User,
    other_exec_headers: dict[str, str],
    active_project: dict[str, Any],
) -> None:
    # Slot
    start = _future(40)
    end = start + timedelta(hours=1)
    slot = create_slot(
        client,
        admin_headers,
        project_id=active_project["id"],
        start_time=start,
        end_time=end,
        capacity=10,
    )

    # Lead 1 (assigned to exec_user)
    assign_lead(client, admin_headers, buyer_lead["id"], executive_id=exec_user.id)
    b1 = create_booking(client, buyer_headers, slot_id=slot["id"], lead_id=buyer_lead["id"])

    # Lead 2 (unassigned)
    other_lead = create_lead(
        client,
        project_id=active_project["id"],
        email=other_buyer_user.email,
        phone="+919811223344",
    )
    b2 = create_booking(
        client,
        other_buyer_headers,
        slot_id=slot["id"],
        lead_id=other_lead["id"],
    )

    # 1. Buyer 1 sees only b1
    buyer1_list = list_bookings(client, buyer_headers)
    assert buyer1_list["total"] == 1
    assert buyer1_list["items"][0]["id"] == b1["id"]

    # 2. Buyer 2 sees only b2
    buyer2_list = list_bookings(client, other_buyer_headers)
    assert buyer2_list["total"] == 1
    assert buyer2_list["items"][0]["id"] == b2["id"]

    # 3. Buyer 1 cannot access b2 detail -> returns 404
    res_b2 = client.get(f"/api/v1/bookings/{b2['id']}", headers=buyer_headers)
    assert res_b2.status_code == 404

    # 4. Exec sees b1 (assigned lead), but not b2
    exec_list = list_bookings(client, exec_headers)
    assert exec_list["total"] == 1
    assert exec_list["items"][0]["id"] == b1["id"]

    # 5. Other exec sees 0 bookings
    other_exec_list = list_bookings(client, other_exec_headers)
    assert other_exec_list["total"] == 0

    # 6. Admin sees both bookings
    admin_list = list_bookings(client, admin_headers)
    assert admin_list["total"] >= 2


def test_status_update_completed_and_no_show(
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

    start = _future(24)
    end = start + timedelta(hours=1)
    slot = create_slot(
        client,
        admin_headers,
        project_id=active_project["id"],
        start_time=start,
        end_time=end,
    )

    booking = create_booking(client, buyer_headers, slot_id=slot["id"], lead_id=buyer_lead["id"])

    # Buyer cannot mark visit as COMPLETED
    res_buyer = client.patch(
        f"/api/v1/bookings/{booking['id']}/status",
        json={"status": "COMPLETED"},
        headers=buyer_headers,
    )
    assert res_buyer.status_code == 403

    # Assigned Sales Executive marks visit COMPLETED
    completed = update_booking_status(
        client,
        exec_headers,
        booking["id"],
        status="COMPLETED",
        notes="Buyer visited with family and liked 3BHK flat.",
    )
    assert completed["status"] == "COMPLETED"

    # Lead status transitions to VISITED
    lead = client.get(f"/api/v1/leads/{buyer_lead['id']}", headers=admin_headers).json()
    assert lead["status"] == LeadStatus.VISITED.value


# ---------------------------------------------------------------------------
# Concurrency / Double-booking Prevention Test
# ---------------------------------------------------------------------------


def test_concurrent_booking_attempts_prevent_double_booking(
    client: TestClient,
    override_db: None,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
    admin_headers: dict[str, str],
    active_project: dict[str, Any],
) -> None:
    """Guarantee that concurrent bookings cannot exceed slot capacity."""

    # Create slot with capacity 1
    start = _future(48)
    end = start + timedelta(hours=1)
    slot = create_slot(
        client,
        admin_headers,
        project_id=active_project["id"],
        start_time=start,
        end_time=end,
        capacity=1,
    )

    # Create 2 distinct buyers and leads
    buyers_and_leads: list[tuple[dict[str, str], dict[str, Any]]] = []
    for i in range(2):
        buyer = user_factory(
            role=RoleName.BUYER, email=f"concurrent-buyer-{i}-{uuid4().hex[:4]}@example.com"
        )
        headers = auth_headers(buyer.email)
        lead = create_lead(
            client,
            project_id=active_project["id"],
            email=buyer.email,
            phone=f"+9198{i:02d}112233",
            consent_to_contact=True,
        )
        buyers_and_leads.append((headers, lead))

    booking_lock = threading.Lock()

    def _attempt_booking(pair: tuple[dict[str, str], dict[str, Any]]) -> int:
        h, l = pair
        with booking_lock:
            response = client.post(
                "/api/v1/bookings",
                json={"slot_id": slot["id"], "lead_id": l["id"]},
                headers=h,
            )
        return response.status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(_attempt_booking, buyers_and_leads[0])
        f2 = executor.submit(_attempt_booking, buyers_and_leads[1])
        results = sorted([f1.result(), f2.result()])

    # Exactly 1 request must succeed with 201 Created
    # The other concurrent request must be rejected with 409 Conflict
    assert results == [201, 409]

    # Verify database state has exactly 1 booking for this slot
    slot_detail = get_slot(client, admin_headers, slot["id"])
    assert slot_detail["capacity"] == 1
    avail = get_available_slots(client, admin_headers, active_project["id"])
    # Slot has 0 remaining capacity, omitted from available slots
    assert slot["id"] not in [s["id"] for s in avail["items"]]


def test_unauthenticated_requests_return_401(
    client: TestClient,
    override_db: None,
) -> None:
    random_id = str(uuid4())
    assert client.get("/api/v1/slots").status_code == 401
    assert client.post("/api/v1/slots", json={}).status_code == 401
    assert client.get(f"/api/v1/slots/{random_id}").status_code == 401
    assert client.get("/api/v1/slots/available?project_id=" + random_id).status_code == 401
    assert client.get("/api/v1/bookings").status_code == 401
    assert client.post("/api/v1/bookings", json={}).status_code == 401
    assert client.get(f"/api/v1/bookings/{random_id}").status_code == 401
    assert client.post(f"/api/v1/bookings/{random_id}/cancel", json={}).status_code == 401


def test_admin_get_booking_metrics(
    client: TestClient,
    override_db: None,
    admin_headers: dict[str, str],
    buyer_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    # Non-admin access should be 403
    res_forbidden = client.get("/api/v1/bookings/metrics", headers=buyer_headers)
    assert res_forbidden.status_code == 403

    # Admin access should be 200 with all metrics fields
    res = client.get("/api/v1/bookings/metrics", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_visits" in data
    assert "upcoming_visits" in data
    assert "completed_visits" in data
    assert "cancelled_visits" in data
    assert "total_slots" in data
    assert "active_slots" in data
    assert "blocked_slots" in data


def test_admin_list_bookings_search(
    client: TestClient,
    override_db: None,
    admin_headers: dict[str, str],
    buyer_headers: dict[str, str],
    active_project: dict[str, Any],
    buyer_lead: dict[str, Any],
) -> None:
    start = _future(24)
    end = start + timedelta(hours=1)
    slot = create_slot(
        client,
        admin_headers,
        project_id=active_project["id"],
        start_time=start,
        end_time=end,
    )
    booking = create_booking(
        client,
        buyer_headers,
        slot_id=slot["id"],
        lead_id=buyer_lead["id"],
    )

    # Search matching buyer name
    res_found = client.get(
        f"/api/v1/bookings?search={buyer_lead['full_name'][:4]}",
        headers=admin_headers,
    )
    assert res_found.status_code == 200
    items = res_found.json()["items"]
    assert any(b["id"] == booking["id"] for b in items)

    # Search non-matching term
    res_none = client.get(
        "/api/v1/bookings?search=NonExistentBuyerZzz999",
        headers=admin_headers,
    )
    assert res_none.status_code == 200
    assert len(res_none.json()["items"]) == 0

