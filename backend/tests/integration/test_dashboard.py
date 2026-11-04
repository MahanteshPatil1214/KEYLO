"""Integration tests for dashboard analytics and marketing spend (Module 9)."""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.modules.bookings.models import Booking, BookingStatus, VisitSlot
from app.modules.conversations.models import (
    Conversation,
    Message,
    MessageSenderType,
)
from app.modules.handoffs.models import Handoff, HandoffReason, HandoffStatus
from app.modules.leads.models import (
    Lead,
    LeadAssignment,
    LeadSource,
    LeadStatus,
)
from app.modules.projects.models import ProjectStatus
from app.modules.users.models import RoleName, User
from tests.project_support import create_project


def _dt(day: int, hour: int = 10, minute: int = 0, second: int = 0) -> datetime:
    return datetime(2026, 1, day, hour, minute, second, tzinfo=UTC)


def _feb(day: int) -> datetime:
    return datetime(2026, 2, day, 10, 0, tzinfo=UTC)


def _lead(
    factory: sessionmaker[Session],
    *,
    project_id: UUID,
    full_name: str,
    source: LeadSource,
    status: LeadStatus,
    created_at: datetime,
) -> UUID:
    with factory() as session:
        lead = Lead(
            full_name=full_name,
            email=f"{uuid4().hex[:10]}@example.com",
            project_id=project_id,
            source=source.value,
            status=status.value,
            consent_to_contact=True,
            created_at=created_at,
            updated_at=created_at,
        )
        session.add(lead)
        session.commit()
        return lead.id


def _assign(
    factory: sessionmaker[Session],
    *,
    lead_id: UUID,
    executive_id: UUID,
    assigner_id: UUID,
    assigned_at: datetime,
) -> None:
    with factory() as session:
        session.add(
            LeadAssignment(
                lead_id=lead_id,
                executive_id=executive_id,
                assigned_by=assigner_id,
                assigned_at=assigned_at,
            )
        )
        session.commit()


def _slot(
    factory: sessionmaker[Session],
    *,
    project_id: UUID,
    start_time: datetime,
    end_time: datetime,
) -> UUID:
    with factory() as session:
        slot = VisitSlot(
            project_id=project_id,
            start_time=start_time,
            end_time=end_time,
            capacity=5,
            is_active=True,
            created_at=start_time,
            updated_at=start_time,
        )
        session.add(slot)
        session.commit()
        return slot.id


def _booking(
    factory: sessionmaker[Session],
    *,
    slot_id: UUID,
    lead_id: UUID,
    project_id: UUID,
    buyer_id: UUID,
    executive_id: UUID,
    status: BookingStatus,
    created_at: datetime,
    cancelled_at: datetime | None = None,
) -> UUID:
    with factory() as session:
        booking = Booking(
            slot_id=slot_id,
            lead_id=lead_id,
            project_id=project_id,
            buyer_id=buyer_id,
            executive_id=executive_id,
            status=status.value,
            cancelled_at=cancelled_at,
            created_at=created_at,
            updated_at=created_at,
        )
        session.add(booking)
        session.commit()
        return booking.id


def _conversation(
    factory: sessionmaker[Session],
    *,
    lead_id: UUID,
    project_id: UUID,
    buyer_id: UUID,
    created_at: datetime,
) -> UUID:
    with factory() as session:
        conversation = Conversation(
            lead_id=lead_id,
            project_id=project_id,
            buyer_id=buyer_id,
            created_at=created_at,
            updated_at=created_at,
        )
        session.add(conversation)
        session.commit()
        return conversation.id


def _message(
    factory: sessionmaker[Session],
    *,
    conversation_id: UUID,
    sender_type: MessageSenderType,
    content: str,
    created_at: datetime,
) -> None:
    with factory() as session:
        session.add(
            Message(
                conversation_id=conversation_id,
                sender_type=sender_type.value,
                content=content,
                created_at=created_at,
            )
        )
        session.commit()


def _handoff(
    factory: sessionmaker[Session],
    *,
    conversation_id: UUID,
    lead_id: UUID,
    project_id: UUID,
    executive_id: UUID,
    status: HandoffStatus,
    created_at: datetime,
) -> None:
    with factory() as session:
        session.add(
            Handoff(
                conversation_id=conversation_id,
                lead_id=lead_id,
                project_id=project_id,
                executive_id=executive_id,
                status=status.value,
                reason=HandoffReason.BUYER_REQUESTED.value,
                summary="Buyer requested a human follow-up.",
                created_at=created_at,
                updated_at=created_at,
            )
        )
        session.commit()


@pytest.fixture()
def admin_user(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.ADMIN, email="admin-dashboard@example.com")


@pytest.fixture()
def admin_headers(
    auth_headers: Callable[..., dict[str, str]], admin_user: User
) -> dict[str, str]:
    return auth_headers(admin_user.email)


@pytest.fixture()
def exec_user(user_factory: Callable[..., User]) -> User:
    return user_factory(
        role=RoleName.SALES_EXECUTIVE,
        email="exec-dashboard1@example.com",
        full_name="Alice Executive",
    )


@pytest.fixture()
def exec_headers(
    auth_headers: Callable[..., dict[str, str]], exec_user: User
) -> dict[str, str]:
    return auth_headers(exec_user.email)


@pytest.fixture()
def other_exec_user(user_factory: Callable[..., User]) -> User:
    return user_factory(
        role=RoleName.SALES_EXECUTIVE,
        email="exec-dashboard2@example.com",
        full_name="Bob Executive",
    )


@pytest.fixture()
def other_exec_headers(
    auth_headers: Callable[..., dict[str, str]], other_exec_user: User
) -> dict[str, str]:
    return auth_headers(other_exec_user.email)


@pytest.fixture()
def inactive_exec_user(user_factory: Callable[..., User]) -> User:
    return user_factory(
        role=RoleName.SALES_EXECUTIVE,
        email="exec-inactive-dashboard@example.com",
        full_name="Carol Inactive",
        is_active=False,
    )


@pytest.fixture()
def buyer_user(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.BUYER, email="buyer-dashboard@example.com")


@pytest.fixture()
def buyer_headers(
    auth_headers: Callable[..., dict[str, str]], buyer_user: User
) -> dict[str, str]:
    return auth_headers(buyer_user.email)


@pytest.fixture()
def active_project(
    client: TestClient, admin_headers: dict[str, str]
) -> dict[str, Any]:
    return create_project(
        client,
        admin_headers,
        name="Dashboard Residences",
        status=ProjectStatus.ACTIVE.value,
    )


@pytest.fixture()
def standard_data(
    test_session_factory: sessionmaker[Session],
    client: TestClient,
    admin_user: User,
    exec_user: User,
    other_exec_user: User,
    buyer_user: User,
    active_project: dict[str, Any],
) -> dict[str, Any]:
    """Create a deterministic mix of leads, bookings, messages, and handoffs."""

    factory = test_session_factory
    project_id = UUID(str(active_project["id"]))

    lead1 = _lead(
        factory,
        project_id=project_id,
        full_name="Lead One",
        source=LeadSource.WEBSITE,
        status=LeadStatus.NEW,
        created_at=_dt(5),
    )
    lead2 = _lead(
        factory,
        project_id=project_id,
        full_name="Lead Two",
        source=LeadSource.WEBSITE,
        status=LeadStatus.CONVERTED,
        created_at=_dt(6),
    )
    lead3 = _lead(
        factory,
        project_id=project_id,
        full_name="Lead Three",
        source=LeadSource.SOCIAL_MEDIA,
        status=LeadStatus.CONVERTED,
        created_at=_dt(7),
    )
    lead4 = _lead(
        factory,
        project_id=project_id,
        full_name="Lead Four (outside January)",
        source=LeadSource.REFERRAL,
        status=LeadStatus.NEW,
        created_at=datetime(2025, 12, 31, 10, 0, tzinfo=UTC),
    )
    lead5 = _lead(
        factory,
        project_id=project_id,
        full_name="Lead Five (February)",
        source=LeadSource.OTHER,
        status=LeadStatus.NEW,
        created_at=_feb(10),
    )

    for lead_id, executive_id, assigned_at in (
        (lead1, exec_user.id, _dt(5)),
        (lead2, exec_user.id, _dt(6)),
        (lead3, other_exec_user.id, _dt(7)),
        (lead4, other_exec_user.id, datetime(2025, 12, 31, 10, 0, tzinfo=UTC)),
        (lead5, other_exec_user.id, _feb(10)),
    ):
        _assign(
            factory,
            lead_id=lead_id,
            executive_id=executive_id,
            assigner_id=admin_user.id,
            assigned_at=assigned_at,
        )

    slot1 = _slot(
        factory,
        project_id=project_id,
        start_time=_dt(10),
        end_time=_dt(10, 11),
    )
    slot2 = _slot(
        factory,
        project_id=project_id,
        start_time=_dt(11),
        end_time=_dt(11, 11),
    )
    slot3 = _slot(
        factory,
        project_id=project_id,
        start_time=_dt(12),
        end_time=_dt(12, 11),
    )
    slot4 = _slot(
        factory,
        project_id=project_id,
        start_time=_dt(13),
        end_time=_dt(13, 11),
    )
    slot5 = _slot(
        factory,
        project_id=project_id,
        start_time=_feb(15),
        end_time=datetime(2026, 2, 15, 11, 0, tzinfo=UTC),
    )

    booking1 = _booking(
        factory,
        slot_id=slot1,
        lead_id=lead1,
        project_id=project_id,
        buyer_id=buyer_user.id,
        executive_id=exec_user.id,
        status=BookingStatus.COMPLETED,
        created_at=_dt(8),
    )
    _booking(
        factory,
        slot_id=slot2,
        lead_id=lead2,
        project_id=project_id,
        buyer_id=buyer_user.id,
        executive_id=exec_user.id,
        status=BookingStatus.NO_SHOW,
        created_at=_dt(8),
    )
    _booking(
        factory,
        slot_id=slot3,
        lead_id=lead3,
        project_id=project_id,
        buyer_id=buyer_user.id,
        executive_id=other_exec_user.id,
        status=BookingStatus.COMPLETED,
        created_at=_dt(8),
    )
    _booking(
        factory,
        slot_id=slot4,
        lead_id=lead3,
        project_id=project_id,
        buyer_id=buyer_user.id,
        executive_id=other_exec_user.id,
        status=BookingStatus.CANCELLED,
        created_at=_dt(8),
        cancelled_at=_dt(9),
    )
    _booking(
        factory,
        slot_id=slot5,
        lead_id=lead5,
        project_id=project_id,
        buyer_id=buyer_user.id,
        executive_id=other_exec_user.id,
        status=BookingStatus.COMPLETED,
        created_at=_feb(10),
    )

    conversation1 = _conversation(
        factory,
        lead_id=lead1,
        project_id=project_id,
        buyer_id=buyer_user.id,
        created_at=_dt(5),
    )
    _message(
        factory,
        conversation_id=conversation1,
        sender_type=MessageSenderType.BUYER,
        content="Is the project ready to move in?",
        created_at=_dt(5, 10, 0, 0),
    )
    _message(
        factory,
        conversation_id=conversation1,
        sender_type=MessageSenderType.ASSISTANT,
        content="Yes, it is ready.",
        created_at=_dt(5, 10, 0, 30),
    )

    conversation2 = _conversation(
        factory,
        lead_id=lead2,
        project_id=project_id,
        buyer_id=buyer_user.id,
        created_at=_dt(6),
    )
    _message(
        factory,
        conversation_id=conversation2,
        sender_type=MessageSenderType.BUYER,
        content="What is the price?",
        created_at=_dt(6, 10, 0, 0),
    )
    _message(
        factory,
        conversation_id=conversation2,
        sender_type=MessageSenderType.SALES_EXECUTIVE,
        content="Our executive will call you.",
        created_at=_dt(6, 10, 1, 0),
    )

    conversation3 = _conversation(
        factory,
        lead_id=lead3,
        project_id=project_id,
        buyer_id=buyer_user.id,
        created_at=_dt(7),
    )
    _message(
        factory,
        conversation_id=conversation3,
        sender_type=MessageSenderType.BUYER,
        content="Can I visit this weekend?",
        created_at=_dt(7, 10, 0, 0),
    )

    _handoff(
        factory,
        conversation_id=conversation1,
        lead_id=lead1,
        project_id=project_id,
        executive_id=exec_user.id,
        status=HandoffStatus.ASSIGNED,
        created_at=_dt(9),
    )
    _handoff(
        factory,
        conversation_id=conversation2,
        lead_id=lead2,
        project_id=project_id,
        executive_id=other_exec_user.id,
        status=HandoffStatus.RESOLVED,
        created_at=_dt(10),
    )

    return {
        "project_id": project_id,
        "lead1": lead1,
        "lead2": lead2,
        "lead3": lead3,
        "lead4": lead4,
        "lead5": lead5,
        "booking1": booking1,
    }


JANUARY = {
    "date_from": "2026-01-01T00:00:00Z",
    "date_to": "2026-01-31T23:59:59Z",
}


def test_admin_summary_aggregates_expected_metrics(
    client: TestClient,
    admin_headers: dict[str, str],
    standard_data: dict[str, Any],
) -> None:
    response = client.get(
        "/api/v1/dashboard/summary", params=JANUARY, headers=admin_headers
    )
    assert response.status_code == 200, response.text
    body = response.json()

    assert body["scope"] == "ADMIN"
    assert body["total_leads"] == 3
    assert body["new_leads"] == 1
    assert body["assigned_leads"] == 3
    assert body["bookings"] == 4
    assert body["completed_visits"] == 2
    assert body["no_show_visits"] == 1
    assert body["cancelled_bookings"] == 1
    assert body["conversions"] == 2
    assert body["handoffs_total"] == 2
    assert body["handoffs_active"] == 1
    assert body["handoffs_resolved"] == 1
    assert body["first_response_sample_size"] == 2
    assert body["average_first_response_seconds"] == pytest.approx(45.0)
    assert body["median_first_response_seconds"] == pytest.approx(45.0)
    assert body["lead_to_visit_conversion_rate"] == pytest.approx(1.0)
    assert body["site_visit_show_up_rate"] == pytest.approx(2 / 3)
    assert body["lead_conversion_rate"] == pytest.approx(2 / 3)
    assert body["leads_by_source"] == [
        {"source": "WEBSITE", "leads": 2},
        {"source": "SOCIAL_MEDIA", "leads": 1},
    ]
    assert body["filters"]["project_id"] is None


def test_date_range_filter_limits_lead_and_visit_cohorts(
    client: TestClient,
    admin_headers: dict[str, str],
    standard_data: dict[str, Any],
) -> None:
    response = client.get(
        "/api/v1/dashboard/summary",
        params={
            "date_from": "2026-02-01T00:00:00Z",
            "date_to": "2026-02-28T23:59:59Z",
        },
        headers=admin_headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()

    assert body["total_leads"] == 1
    assert body["new_leads"] == 1
    assert body["assigned_leads"] == 1
    assert body["bookings"] == 1
    assert body["completed_visits"] == 1
    assert body["no_show_visits"] == 0
    assert body["cancelled_bookings"] == 0
    assert body["conversions"] == 0
    assert body["lead_to_visit_conversion_rate"] == pytest.approx(1.0)
    assert body["site_visit_show_up_rate"] == pytest.approx(1.0)
    assert body["lead_conversion_rate"] == pytest.approx(0.0)
    assert body["leads_by_source"] == [{"source": "OTHER", "leads": 1}]


def test_project_filter_scopes_summary(
    client: TestClient,
    admin_headers: dict[str, str],
    admin_user: User,
    exec_user: User,
    buyer_user: User,
    test_session_factory: sessionmaker[Session],
    standard_data: dict[str, Any],
) -> None:
    second_project = create_project(
        client,
        admin_headers,
        name="Second Dashboard Project",
        status=ProjectStatus.ACTIVE.value,
    )
    second_project_id = UUID(str(second_project["id"]))
    lead_id = _lead(
        test_session_factory,
        project_id=second_project_id,
        full_name="Second Project Lead",
        source=LeadSource.HOARDING,
        status=LeadStatus.NEW,
        created_at=_dt(15),
    )
    _assign(
        test_session_factory,
        lead_id=lead_id,
        executive_id=exec_user.id,
        assigner_id=admin_user.id,
        assigned_at=_dt(15),
    )
    slot_id = _slot(
        test_session_factory,
        project_id=second_project_id,
        start_time=_dt(20),
        end_time=_dt(20, 11),
    )
    _booking(
        test_session_factory,
        slot_id=slot_id,
        lead_id=lead_id,
        project_id=second_project_id,
        buyer_id=buyer_user.id,
        executive_id=exec_user.id,
        status=BookingStatus.COMPLETED,
        created_at=_dt(18),
    )

    first_project_response = client.get(
        "/api/v1/dashboard/summary",
        params={**JANUARY, "project_id": str(standard_data["project_id"])},
        headers=admin_headers,
    )
    assert first_project_response.status_code == 200, first_project_response.text
    first_project = first_project_response.json()
    assert first_project["total_leads"] == 3
    assert first_project["bookings"] == 4
    assert first_project["completed_visits"] == 2

    second_project_response = client.get(
        "/api/v1/dashboard/summary",
        params={**JANUARY, "project_id": str(second_project_id)},
        headers=admin_headers,
    )
    assert second_project_response.status_code == 200
    second = second_project_response.json()
    assert second["total_leads"] == 1
    assert second["bookings"] == 1
    assert second["completed_visits"] == 1
    assert second["leads_by_source"] == [{"source": "HOARDING", "leads": 1}]


def test_summary_handles_zero_denominators(
    client: TestClient,
    admin_headers: dict[str, str],
    active_project: dict[str, Any],
) -> None:
    response = client.get(
        "/api/v1/dashboard/summary", headers=admin_headers
    )
    assert response.status_code == 200, response.text
    body = response.json()

    assert body["total_leads"] == 0
    assert body["first_response_sample_size"] == 0
    assert body["average_first_response_seconds"] is None
    assert body["median_first_response_seconds"] is None
    assert body["lead_to_visit_conversion_rate"] == 0.0
    assert body["site_visit_show_up_rate"] == 0.0
    assert body["lead_conversion_rate"] == 0.0
    assert body["leads_by_source"] == []


def test_sales_executive_summary_is_scoped_to_own_assignments(
    client: TestClient,
    exec_headers: dict[str, str],
    standard_data: dict[str, Any],
) -> None:
    response = client.get(
        "/api/v1/dashboard/summary", params=JANUARY, headers=exec_headers
    )
    assert response.status_code == 200, response.text
    body = response.json()

    assert body["scope"] == "SALES_EXECUTIVE"
    assert body["total_leads"] == 2
    assert body["new_leads"] == 1
    assert body["assigned_leads"] == 2
    assert body["bookings"] == 2
    assert body["completed_visits"] == 1
    assert body["no_show_visits"] == 1
    assert body["cancelled_bookings"] == 0
    assert body["conversions"] == 1
    assert body["handoffs_total"] == 1
    assert body["handoffs_active"] == 1
    assert body["handoffs_resolved"] == 0
    assert body["first_response_sample_size"] == 2
    assert body["average_first_response_seconds"] == pytest.approx(45.0)
    assert body["median_first_response_seconds"] == pytest.approx(45.0)
    assert body["lead_to_visit_conversion_rate"] == pytest.approx(1.0)
    assert body["site_visit_show_up_rate"] == pytest.approx(0.5)
    assert body["lead_conversion_rate"] == pytest.approx(0.5)
    assert body["leads_by_source"] == [{"source": "WEBSITE", "leads": 2}]


def test_trends_use_requested_granularity(
    client: TestClient,
    admin_headers: dict[str, str],
    standard_data: dict[str, Any],
) -> None:
    response = client.get(
        "/api/v1/dashboard/trends",
        params={
            "date_from": "2026-01-01T00:00:00Z",
            "date_to": "2026-02-28T23:59:59Z",
            "granularity": "MONTH",
        },
        headers=admin_headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()

    assert body["granularity"] == "MONTH"
    assert body["scope"] == "ADMIN"
    assert body["items"] == [
        {
            "period": "2026-01-01",
            "leads": 3,
            "bookings": 4,
            "completed_visits": 2,
            "conversions": 2,
        },
        {
            "period": "2026-02-01",
            "leads": 1,
            "bookings": 1,
            "completed_visits": 1,
            "conversions": 0,
        },
    ]


def test_weekly_trends_start_on_monday(
    client: TestClient,
    admin_headers: dict[str, str],
    standard_data: dict[str, Any],
) -> None:
    response = client.get(
        "/api/v1/dashboard/trends",
        params={
            "date_from": "2026-01-01T00:00:00Z",
            "date_to": "2026-01-31T23:59:59Z",
            "granularity": "WEEK",
        },
        headers=admin_headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()

    assert body["granularity"] == "WEEK"
    assert body["items"] == [
        {
            "period": "2026-01-05",
            "leads": 3,
            "bookings": 4,
            "completed_visits": 1,
            "conversions": 2,
        },
        {
            "period": "2026-01-12",
            "leads": 0,
            "bookings": 0,
            "completed_visits": 1,
            "conversions": 0,
        },
    ]


def test_sources_report_spend_and_cost_per_visit(
    client: TestClient,
    admin_headers: dict[str, str],
    standard_data: dict[str, Any],
) -> None:
    project_id = standard_data["project_id"]
    for payload in (
        {
            "source": "WEBSITE",
            "period_start": "2026-01-01",
            "period_end": "2026-01-31",
            "amount": "1000.00",
        },
        {
            "source": "WEBSITE",
            "project_id": str(project_id),
            "period_start": "2026-01-01",
            "period_end": "2026-01-31",
            "amount": "500.00",
        },
        {
            "source": "REFERRAL",
            "period_start": "2026-01-01",
            "period_end": "2026-01-31",
            "amount": "300.00",
        },
    ):
        created = client.post(
            "/api/v1/dashboard/marketing-spend",
            json=payload,
            headers=admin_headers,
        )
        assert created.status_code == 201, created.text

    response = client.get(
        "/api/v1/dashboard/sources", params=JANUARY, headers=admin_headers
    )
    assert response.status_code == 200, response.text
    by_source = {item["source"]: item for item in response.json()["items"]}

    website = by_source["WEBSITE"]
    assert website["leads"] == 2
    assert website["bookings"] == 2
    assert website["completed_visits"] == 1
    assert website["no_show_visits"] == 1
    assert website["cancelled_bookings"] == 0
    assert website["conversions"] == 1
    assert website["marketing_spend"] == pytest.approx(1500.0)
    assert website["cost_per_visit"] == pytest.approx(1500.0)
    assert website["lead_to_visit_conversion_rate"] == pytest.approx(1.0)
    assert website["site_visit_show_up_rate"] == pytest.approx(0.5)
    assert website["lead_conversion_rate"] == pytest.approx(0.5)

    social = by_source["SOCIAL_MEDIA"]
    assert social["leads"] == 1
    assert social["bookings"] == 2
    assert social["completed_visits"] == 1
    assert social["cancelled_bookings"] == 1
    assert social["marketing_spend"] == pytest.approx(0.0)
    assert social["cost_per_visit"] == pytest.approx(0.0)

    referral = by_source["REFERRAL"]
    assert referral["leads"] == 0
    assert referral["marketing_spend"] == pytest.approx(300.0)
    assert referral["cost_per_visit"] is None

    project_response = client.get(
        "/api/v1/dashboard/sources",
        params={**JANUARY, "project_id": str(project_id)},
        headers=admin_headers,
    )
    assert project_response.status_code == 200, project_response.text
    project_by_source = {
        item["source"]: item for item in project_response.json()["items"]
    }
    assert project_by_source["WEBSITE"]["marketing_spend"] == pytest.approx(
        500.0
    )
    assert project_by_source["WEBSITE"]["cost_per_visit"] == pytest.approx(
        500.0
    )
    assert "REFERRAL" not in project_by_source


def test_executive_performance_groups_metrics_and_excludes_inactive(
    client: TestClient,
    admin_headers: dict[str, str],
    exec_user: User,
    other_exec_user: User,
    inactive_exec_user: User,
    standard_data: dict[str, Any],
) -> None:
    response = client.get(
        "/api/v1/dashboard/executives", params=JANUARY, headers=admin_headers
    )
    assert response.status_code == 200, response.text
    body = response.json()

    by_id = {item["executive_id"]: item for item in body["items"]}
    assert str(inactive_exec_user.id) not in by_id
    assert set(by_id) == {str(exec_user.id), str(other_exec_user.id)}

    first = by_id[str(exec_user.id)]
    assert first["full_name"] == "Alice Executive"
    assert first["assigned_leads"] == 2
    assert first["new_leads"] == 1
    assert first["bookings"] == 2
    assert first["completed_visits"] == 1
    assert first["no_show_visits"] == 1
    assert first["cancelled_bookings"] == 0
    assert first["conversions"] == 1
    assert first["handoffs_total"] == 1
    assert first["handoffs_active"] == 1
    assert first["handoffs_resolved"] == 0
    assert first["lead_to_visit_conversion_rate"] == pytest.approx(1.0)
    assert first["site_visit_show_up_rate"] == pytest.approx(0.5)
    assert first["lead_conversion_rate"] == pytest.approx(0.5)

    second = by_id[str(other_exec_user.id)]
    assert second["assigned_leads"] == 1
    assert second["bookings"] == 2
    assert second["completed_visits"] == 1
    assert second["cancelled_bookings"] == 1
    assert second["conversions"] == 1
    assert second["handoffs_total"] == 1
    assert second["handoffs_resolved"] == 1


def test_sales_executive_cannot_access_admin_dashboard_endpoints(
    client: TestClient,
    exec_headers: dict[str, str],
    buyer_headers: dict[str, str],
) -> None:
    for path in (
        "/api/v1/dashboard/sources",
        "/api/v1/dashboard/executives",
        "/api/v1/dashboard/marketing-spend",
    ):
        response = client.get(path, headers=exec_headers)
        assert response.status_code == 403, (path, response.text)

    buyer_response = client.get(
        "/api/v1/dashboard/summary", headers=buyer_headers
    )
    assert buyer_response.status_code == 403, buyer_response.text

    anonymous_response = client.get("/api/v1/dashboard/summary")
    assert anonymous_response.status_code == 401, anonymous_response.text

    create_response = client.post(
        "/api/v1/dashboard/marketing-spend",
        json={
            "source": "WEBSITE",
            "period_start": "2026-01-01",
            "period_end": "2026-01-31",
            "amount": "10.00",
        },
        headers=exec_headers,
    )
    assert create_response.status_code == 403, create_response.text


def test_marketing_spend_crud_and_validation(
    client: TestClient,
    admin_headers: dict[str, str],
    active_project: dict[str, Any],
) -> None:
    created = client.post(
        "/api/v1/dashboard/marketing-spend",
        json={
            "source": "WEBSITE",
            "period_start": "2026-01-01",
            "period_end": "2026-01-31",
            "amount": "1234.50",
            "notes": "January campaign",
        },
        headers=admin_headers,
    )
    assert created.status_code == 201, created.text
    spend = created.json()
    spend_id = spend["id"]
    assert spend["amount"] == pytest.approx(1234.5)
    assert spend["created_by_id"] is not None
    assert spend["project_id"] is None

    listing = client.get(
        "/api/v1/dashboard/marketing-spend", headers=admin_headers
    )
    assert listing.status_code == 200, listing.text
    assert listing.json()["total"] == 1
    assert listing.json()["items"][0]["id"] == spend_id

    detail = client.get(
        f"/api/v1/dashboard/marketing-spend/{spend_id}",
        headers=admin_headers,
    )
    assert detail.status_code == 200, detail.text

    updated = client.patch(
        f"/api/v1/dashboard/marketing-spend/{spend_id}",
        json={"amount": "2000.00", "notes": None},
        headers=admin_headers,
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["amount"] == pytest.approx(2000.0)
    assert updated.json()["notes"] is None

    invalid_project = client.post(
        "/api/v1/dashboard/marketing-spend",
        json={
            "source": "WEBSITE",
            "project_id": str(uuid4()),
            "period_start": "2026-01-01",
            "period_end": "2026-01-31",
            "amount": "10.00",
        },
        headers=admin_headers,
    )
    assert invalid_project.status_code == 404, invalid_project.text

    invalid_period = client.post(
        "/api/v1/dashboard/marketing-spend",
        json={
            "source": "WEBSITE",
            "period_start": "2026-02-01",
            "period_end": "2026-01-01",
            "amount": "10.00",
        },
        headers=admin_headers,
    )
    assert invalid_period.status_code == 422, invalid_period.text

    invalid_update_period = client.patch(
        f"/api/v1/dashboard/marketing-spend/{spend_id}",
        json={"period_start": "2026-02-01"},
        headers=admin_headers,
    )
    assert invalid_update_period.status_code == 400, invalid_update_period.text

    explicit_null = client.patch(
        f"/api/v1/dashboard/marketing-spend/{spend_id}",
        json={"source": None},
        headers=admin_headers,
    )
    assert explicit_null.status_code == 422, explicit_null.text

    empty_update = client.patch(
        f"/api/v1/dashboard/marketing-spend/{spend_id}",
        json={},
        headers=admin_headers,
    )
    assert empty_update.status_code == 422, empty_update.text

    deleted = client.delete(
        f"/api/v1/dashboard/marketing-spend/{spend_id}",
        headers=admin_headers,
    )
    assert deleted.status_code == 204, deleted.text

    missing = client.get(
        f"/api/v1/dashboard/marketing-spend/{spend_id}",
        headers=admin_headers,
    )
    assert missing.status_code == 404, missing.text
