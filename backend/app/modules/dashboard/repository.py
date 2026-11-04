"""Database aggregation queries for dashboard analytics.

All metric collection uses SQL aggregation or grouped aggregate subqueries.
Only small aggregate result sets (and at most two rows for the median) are
loaded into Python.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import Date, Float, case, cast, func, select
from sqlalchemy.orm import Session

from app.modules.bookings.models import Booking, BookingStatus, VisitSlot
from app.modules.conversations.models import (
    Conversation,
    Message,
    MessageSenderType,
)
from app.modules.dashboard.models import MarketingSpend, TrendGranularity
from app.modules.handoffs.models import (
    ACTIVE_HANDOFF_STATUSES,
    Handoff,
    HandoffStatus,
)
from app.modules.leads.models import Lead, LeadAssignment, LeadSource, LeadStatus
from app.modules.projects.models import Project, ProjectStatus
from app.modules.users.models import Role, RoleName, User


@dataclass(frozen=True)
class AnalyticsFilters:
    """Normalized dashboard filters shared by every query."""

    date_from: datetime | None = None
    date_to: datetime | None = None
    project_id: UUID | None = None


def _active_project_ids():
    return select(Project.id).where(Project.status == ProjectStatus.ACTIVE.value)


def _active_assignment_exists(*, executive_id: UUID | None = None):
    statement = select(LeadAssignment.id).where(
        LeadAssignment.lead_id == Lead.id,
        LeadAssignment.unassigned_at.is_(None),
    )
    if executive_id is not None:
        statement = statement.where(LeadAssignment.executive_id == executive_id)
    return statement.exists()


def _conditional_count(condition):
    """Return a database-side conditional count expression."""

    return func.coalesce(func.sum(case((condition, 1), else_=0)), 0)


def _lead_conditions(
    filters: AnalyticsFilters,
    *,
    executive_id: UUID | None = None,
    active_project_only: bool = False,
) -> list[Any]:
    conditions: list[Any] = []
    if filters.date_from is not None:
        conditions.append(Lead.created_at >= filters.date_from)
    if filters.date_to is not None:
        conditions.append(Lead.created_at <= filters.date_to)
    if filters.project_id is not None:
        conditions.append(Lead.project_id == filters.project_id)
    if active_project_only:
        conditions.append(Lead.project_id.in_(_active_project_ids()))
    if executive_id is not None:
        conditions.append(_active_assignment_exists(executive_id=executive_id))
    return conditions


def _booking_scope_conditions(
    filters: AnalyticsFilters,
    *,
    executive_id: UUID | None = None,
    active_project_only: bool = False,
) -> list[Any]:
    conditions: list[Any] = []
    if filters.project_id is not None:
        conditions.append(Booking.project_id == filters.project_id)
    if active_project_only:
        conditions.append(Booking.project_id.in_(_active_project_ids()))
    if executive_id is not None:
        conditions.append(Booking.executive_id == executive_id)
    return conditions


def _booking_created_conditions(
    filters: AnalyticsFilters,
    *,
    executive_id: UUID | None = None,
    active_project_only: bool = False,
) -> list[Any]:
    conditions = _booking_scope_conditions(
        filters,
        executive_id=executive_id,
        active_project_only=active_project_only,
    )
    if filters.date_from is not None:
        conditions.append(Booking.created_at >= filters.date_from)
    if filters.date_to is not None:
        conditions.append(Booking.created_at <= filters.date_to)
    return conditions


def _visit_conditions(
    filters: AnalyticsFilters,
    *,
    executive_id: UUID | None = None,
    active_project_only: bool = False,
) -> list[Any]:
    conditions = _booking_scope_conditions(
        filters,
        executive_id=executive_id,
        active_project_only=active_project_only,
    )
    if filters.date_from is not None:
        conditions.append(VisitSlot.start_time >= filters.date_from)
    if filters.date_to is not None:
        conditions.append(VisitSlot.start_time <= filters.date_to)
    return conditions


def _cancellation_conditions(
    filters: AnalyticsFilters,
    *,
    executive_id: UUID | None = None,
    active_project_only: bool = False,
) -> list[Any]:
    conditions = _booking_scope_conditions(
        filters,
        executive_id=executive_id,
        active_project_only=active_project_only,
    )
    conditions.append(Booking.status == BookingStatus.CANCELLED.value)
    if filters.date_from is not None:
        conditions.append(Booking.cancelled_at >= filters.date_from)
    if filters.date_to is not None:
        conditions.append(Booking.cancelled_at <= filters.date_to)
    return conditions


def _handoff_conditions(
    filters: AnalyticsFilters,
    *,
    executive_id: UUID | None = None,
    active_project_only: bool = False,
) -> list[Any]:
    conditions: list[Any] = []
    if filters.date_from is not None:
        conditions.append(Handoff.created_at >= filters.date_from)
    if filters.date_to is not None:
        conditions.append(Handoff.created_at <= filters.date_to)
    if filters.project_id is not None:
        conditions.append(Handoff.project_id == filters.project_id)
    if active_project_only:
        conditions.append(Handoff.project_id.in_(_active_project_ids()))
    if executive_id is not None:
        conditions.append(Handoff.executive_id == executive_id)
    return conditions


def lead_metrics(
    session: Session,
    *,
    filters: AnalyticsFilters,
    executive_id: UUID | None = None,
    active_project_only: bool = False,
) -> dict[str, int]:
    """Return lead counts for the selected cohort."""

    conditions = _lead_conditions(
        filters,
        executive_id=executive_id,
        active_project_only=active_project_only,
    )
    statement = select(
        func.count(Lead.id).label("total_leads"),
        _conditional_count(Lead.status == LeadStatus.NEW.value).label("new_leads"),
        _conditional_count(
            _active_assignment_exists(executive_id=executive_id)
        ).label("assigned_leads"),
        _conditional_count(Lead.status == LeadStatus.CONVERTED.value).label(
            "conversions"
        ),
    ).where(*conditions)
    row = session.execute(statement).one()
    return {
        "total_leads": int(row.total_leads or 0),
        "new_leads": int(row.new_leads or 0),
        "assigned_leads": int(row.assigned_leads or 0),
        "conversions": int(row.conversions or 0),
    }


def lead_metrics_by_source(
    session: Session,
    *,
    filters: AnalyticsFilters,
    executive_id: UUID | None = None,
    active_project_only: bool = False,
) -> list[dict[str, Any]]:
    """Return lead counts grouped by source."""

    conditions = _lead_conditions(
        filters,
        executive_id=executive_id,
        active_project_only=active_project_only,
    )
    statement = (
        select(
            Lead.source.label("source"),
            func.count(Lead.id).label("leads"),
            _conditional_count(Lead.status == LeadStatus.NEW.value).label(
                "new_leads"
            ),
            _conditional_count(
                _active_assignment_exists(executive_id=executive_id)
            ).label("assigned_leads"),
            _conditional_count(Lead.status == LeadStatus.CONVERTED.value).label(
                "conversions"
            ),
        )
        .where(*conditions)
        .group_by(Lead.source)
    )
    return [
        {
            "source": row.source,
            "leads": int(row.leads or 0),
            "new_leads": int(row.new_leads or 0),
            "assigned_leads": int(row.assigned_leads or 0),
            "conversions": int(row.conversions or 0),
        }
        for row in session.execute(statement).all()
    ]


def lead_to_visit_count(
    session: Session,
    *,
    filters: AnalyticsFilters,
    executive_id: UUID | None = None,
    active_project_only: bool = False,
) -> int:
    """Count distinct cohort leads holding at least one booking."""

    conditions = _lead_conditions(
        filters,
        executive_id=executive_id,
        active_project_only=active_project_only,
    )
    statement = (
        select(func.count(func.distinct(Booking.lead_id)))
        .select_from(Booking)
        .join(Lead, Lead.id == Booking.lead_id)
        .where(*conditions)
    )
    return int(session.scalar(statement) or 0)


def lead_to_visit_counts_by_source(
    session: Session,
    *,
    filters: AnalyticsFilters,
) -> dict[str, int]:
    """Count distinct booked leads grouped by acquisition source."""

    conditions = _lead_conditions(filters)
    statement = (
        select(
            Lead.source.label("source"),
            func.count(func.distinct(Booking.lead_id)).label("booked_leads"),
        )
        .select_from(Booking)
        .join(Lead, Lead.id == Booking.lead_id)
        .where(*conditions)
        .group_by(Lead.source)
    )
    return {
        row.source: int(row.booked_leads or 0)
        for row in session.execute(statement).all()
    }


def booking_count(
    session: Session,
    *,
    filters: AnalyticsFilters,
    executive_id: UUID | None = None,
    active_project_only: bool = False,
) -> int:
    """Count bookings created in the selected period."""

    conditions = _booking_created_conditions(
        filters,
        executive_id=executive_id,
        active_project_only=active_project_only,
    )
    return int(
        session.scalar(
            select(func.count()).select_from(Booking).where(*conditions)
        )
        or 0
    )


def booking_counts_by_source(
    session: Session,
    *,
    filters: AnalyticsFilters,
) -> dict[str, int]:
    """Count bookings created in the period grouped by lead source."""

    conditions = _booking_created_conditions(filters)
    statement = (
        select(Lead.source.label("source"), func.count(Booking.id).label("bookings"))
        .select_from(Booking)
        .join(Lead, Lead.id == Booking.lead_id)
        .where(*conditions)
        .group_by(Lead.source)
    )
    return {
        row.source: int(row.bookings or 0)
        for row in session.execute(statement).all()
    }


def cancelled_booking_count(
    session: Session,
    *,
    filters: AnalyticsFilters,
    executive_id: UUID | None = None,
    active_project_only: bool = False,
) -> int:
    """Count bookings cancelled in the selected period."""

    conditions = _cancellation_conditions(
        filters,
        executive_id=executive_id,
        active_project_only=active_project_only,
    )
    return int(
        session.scalar(
            select(func.count()).select_from(Booking).where(*conditions)
        )
        or 0
    )


def cancelled_bookings_by_source(
    session: Session,
    *,
    filters: AnalyticsFilters,
) -> dict[str, int]:
    """Count cancellations in the period grouped by lead source."""

    conditions = _cancellation_conditions(filters)
    statement = (
        select(
            Lead.source.label("source"),
            func.count(Booking.id).label("cancelled"),
        )
        .select_from(Booking)
        .join(Lead, Lead.id == Booking.lead_id)
        .where(*conditions)
        .group_by(Lead.source)
    )
    return {
        row.source: int(row.cancelled or 0)
        for row in session.execute(statement).all()
    }


def _visit_aggregate_statement(*, group_by_source: bool = False):
    select_columns = [
        _conditional_count(Booking.status == BookingStatus.COMPLETED.value).label(
            "completed_visits"
        ),
        _conditional_count(Booking.status == BookingStatus.NO_SHOW.value).label(
            "no_show_visits"
        ),
    ]
    if group_by_source:
        select_columns.insert(0, Lead.source.label("source"))
    return select_columns


def visit_counts(
    session: Session,
    *,
    filters: AnalyticsFilters,
    executive_id: UUID | None = None,
    active_project_only: bool = False,
) -> dict[str, int]:
    """Count completed and no-show visits by scheduled visit time."""

    conditions = _visit_conditions(
        filters,
        executive_id=executive_id,
        active_project_only=active_project_only,
    )
    statement = (
        select(*_visit_aggregate_statement())
        .select_from(Booking)
        .join(VisitSlot, VisitSlot.id == Booking.slot_id)
        .where(*conditions)
    )
    row = session.execute(statement).one()
    return {
        "completed_visits": int(row.completed_visits or 0),
        "no_show_visits": int(row.no_show_visits or 0),
    }


def visit_counts_by_source(
    session: Session,
    *,
    filters: AnalyticsFilters,
) -> dict[str, dict[str, int]]:
    """Count completed and no-show visits grouped by lead source."""

    conditions = _visit_conditions(filters)
    statement = (
        select(*_visit_aggregate_statement(group_by_source=True))
        .select_from(Booking)
        .join(VisitSlot, VisitSlot.id == Booking.slot_id)
        .join(Lead, Lead.id == Booking.lead_id)
        .where(*conditions)
        .group_by(Lead.source)
    )
    return {
        row.source: {
            "completed_visits": int(row.completed_visits or 0),
            "no_show_visits": int(row.no_show_visits or 0),
        }
        for row in session.execute(statement).all()
    }


def handoff_metrics(
    session: Session,
    *,
    filters: AnalyticsFilters,
    executive_id: UUID | None = None,
    active_project_only: bool = False,
) -> dict[str, int]:
    """Count total, active, and resolved handoffs created in the period."""

    conditions = _handoff_conditions(
        filters,
        executive_id=executive_id,
        active_project_only=active_project_only,
    )
    statement = select(
        func.count(Handoff.id).label("handoffs_total"),
        _conditional_count(Handoff.status.in_(ACTIVE_HANDOFF_STATUSES)).label(
            "handoffs_active"
        ),
        _conditional_count(Handoff.status == HandoffStatus.RESOLVED.value).label(
            "handoffs_resolved"
        ),
    ).where(*conditions)
    row = session.execute(statement).one()
    return {
        "handoffs_total": int(row.handoffs_total or 0),
        "handoffs_active": int(row.handoffs_active or 0),
        "handoffs_resolved": int(row.handoffs_resolved or 0),
    }


def _response_seconds_expression(session: Session, response_at, buyer_at):
    if session.get_bind().dialect.name == "sqlite":
        return (
            func.julianday(response_at) - func.julianday(buyer_at)
        ) * 86400.0
    return func.extract("epoch", response_at - buyer_at)


def response_time_stats(
    session: Session,
    *,
    filters: AnalyticsFilters,
    executive_id: UUID | None = None,
    active_project_only: bool = False,
) -> tuple[float | None, float | None, int]:
    """Return average seconds, median seconds, and sample size.

    A response sample is a lead whose first buyer message is followed by an
    ASSISTANT or SALES_EXECUTIVE message in the same lead conversation. SYSTEM
    messages are not responses.
    """

    buyer_first = (
        select(
            Conversation.lead_id.label("lead_id"),
            func.min(Message.created_at).label("buyer_at"),
        )
        .join(Message, Message.conversation_id == Conversation.id)
        .where(Message.sender_type == MessageSenderType.BUYER.value)
        .group_by(Conversation.lead_id)
        .subquery("buyer_first")
    )
    response_first = (
        select(
            Conversation.lead_id.label("lead_id"),
            func.min(Message.created_at).label("response_at"),
        )
        .join(Message, Message.conversation_id == Conversation.id)
        .join(buyer_first, buyer_first.c.lead_id == Conversation.lead_id)
        .where(
            Message.sender_type.in_(
                [
                    MessageSenderType.ASSISTANT.value,
                    MessageSenderType.SALES_EXECUTIVE.value,
                ]
            )
        )
        .where(Message.created_at > buyer_first.c.buyer_at)
        .group_by(Conversation.lead_id)
        .subquery("response_first")
    )

    seconds = cast(
        _response_seconds_expression(
            session,
            response_first.c.response_at,
            buyer_first.c.buyer_at,
        ),
        Float,
    )
    conditions = _lead_conditions(
        filters,
        executive_id=executive_id,
        active_project_only=active_project_only,
    )
    intervals = (
        select(seconds.label("seconds"))
        .select_from(response_first)
        .join(
            buyer_first,
            buyer_first.c.lead_id == response_first.c.lead_id,
        )
        .join(Lead, Lead.id == response_first.c.lead_id)
        .where(*conditions)
        .subquery("response_intervals")
    )

    sample_size = int(
        session.scalar(select(func.count()).select_from(intervals)) or 0
    )
    if sample_size == 0:
        return None, None, 0

    average = session.scalar(select(func.avg(intervals.c.seconds)))
    ordered = select(intervals.c.seconds).order_by(intervals.c.seconds)
    lower = session.scalar(
        ordered.offset((sample_size - 1) // 2).limit(1)
    )
    upper = session.scalar(ordered.offset(sample_size // 2).limit(1))
    if lower is None or upper is None:
        return (
            float(average) if average is not None else None,
            None,
            0,
        )
    median = (float(lower) + float(upper)) / 2.0
    return (
        float(average) if average is not None else None,
        median,
        sample_size,
    )


def _bucket_expression(session: Session, column, granularity: TrendGranularity):
    dialect = session.get_bind().dialect.name
    if dialect == "sqlite":
        if granularity == TrendGranularity.WEEK:
            return func.strftime(
                "%Y-%m-%d",
                func.date(column, "weekday 0", "-6 days"),
            )
        if granularity == TrendGranularity.MONTH:
            return func.strftime(
                "%Y-%m-%d",
                func.date(column, "start of month"),
            )
        return func.strftime("%Y-%m-%d", column)

    bucket = granularity.value.lower()
    return cast(func.date_trunc(bucket, column), Date)


def trend_counts(
    session: Session,
    *,
    filters: AnalyticsFilters,
    granularity: TrendGranularity,
    executive_id: UUID | None = None,
    active_project_only: bool = False,
) -> dict[str, dict[str, int]]:
    """Return leads, bookings, visits, and conversions by time bucket."""

    buckets: dict[str, dict[str, int]] = {}

    def bucket_for(value: Any) -> str:
        if isinstance(value, datetime):
            return value.date().isoformat()
        if isinstance(value, date):
            return value.isoformat()
        return str(value)

    def ensure(period: str) -> dict[str, int]:
        return buckets.setdefault(
            period,
            {
                "leads": 0,
                "bookings": 0,
                "completed_visits": 0,
                "conversions": 0,
            },
        )

    lead_bucket = _bucket_expression(session, Lead.created_at, granularity)
    lead_conditions = _lead_conditions(
        filters,
        executive_id=executive_id,
        active_project_only=active_project_only,
    )
    lead_statement = (
        select(
            lead_bucket.label("period"),
            func.count(Lead.id).label("leads"),
            _conditional_count(Lead.status == LeadStatus.CONVERTED.value).label(
                "conversions"
            ),
        )
        .where(*lead_conditions)
        .group_by(lead_bucket)
    )
    for row in session.execute(lead_statement).all():
        item = ensure(bucket_for(row.period))
        item["leads"] += int(row.leads or 0)
        item["conversions"] += int(row.conversions or 0)

    booking_bucket = _bucket_expression(
        session, Booking.created_at, granularity
    )
    booking_conditions = _booking_created_conditions(
        filters,
        executive_id=executive_id,
        active_project_only=active_project_only,
    )
    booking_statement = (
        select(
            booking_bucket.label("period"),
            func.count(Booking.id).label("bookings"),
        )
        .where(*booking_conditions)
        .group_by(booking_bucket)
    )
    for row in session.execute(booking_statement).all():
        ensure(bucket_for(row.period))["bookings"] += int(row.bookings or 0)

    visit_bucket = _bucket_expression(
        session, VisitSlot.start_time, granularity
    )
    visit_conditions = _visit_conditions(
        filters,
        executive_id=executive_id,
        active_project_only=active_project_only,
    )
    visit_statement = (
        select(
            visit_bucket.label("period"),
            _conditional_count(
                Booking.status == BookingStatus.COMPLETED.value
            ).label("completed_visits"),
        )
        .select_from(Booking)
        .join(VisitSlot, VisitSlot.id == Booking.slot_id)
        .where(*visit_conditions)
        .group_by(visit_bucket)
    )
    for row in session.execute(visit_statement).all():
        ensure(bucket_for(row.period))["completed_visits"] += int(
            row.completed_visits or 0
        )

    return buckets


def list_active_executives(session: Session) -> list[User]:
    """Return active sales executives for the performance table."""

    statement = (
        select(User)
        .join(Role, Role.id == User.role_id)
        .where(
            Role.name == RoleName.SALES_EXECUTIVE.value,
            User.is_active.is_(True),
        )
        .order_by(User.full_name.asc(), User.id.asc())
    )
    return list(session.scalars(statement).all())


def executive_lead_metrics(
    session: Session,
    *,
    filters: AnalyticsFilters,
) -> dict[UUID, dict[str, int]]:
    """Group current-assignment lead metrics by executive."""

    conditions = [
        LeadAssignment.unassigned_at.is_(None),
        *_lead_conditions(filters),
    ]
    statement = (
        select(
            LeadAssignment.executive_id.label("executive_id"),
            func.count(Lead.id).label("assigned_leads"),
            _conditional_count(Lead.status == LeadStatus.NEW.value).label(
                "new_leads"
            ),
            _conditional_count(Lead.status == LeadStatus.CONVERTED.value).label(
                "conversions"
            ),
        )
        .select_from(LeadAssignment)
        .join(Lead, Lead.id == LeadAssignment.lead_id)
        .where(*conditions)
        .group_by(LeadAssignment.executive_id)
    )
    return {
        row.executive_id: {
            "assigned_leads": int(row.assigned_leads or 0),
            "new_leads": int(row.new_leads or 0),
            "conversions": int(row.conversions or 0),
        }
        for row in session.execute(statement).all()
    }


def executive_booking_metrics(
    session: Session,
    *,
    filters: AnalyticsFilters,
) -> dict[UUID, int]:
    conditions = [
        *_booking_created_conditions(filters),
        Booking.executive_id.is_not(None),
    ]
    statement = (
        select(
            Booking.executive_id.label("executive_id"),
            func.count(Booking.id).label("bookings"),
        )
        .where(*conditions)
        .group_by(Booking.executive_id)
    )
    return {
        row.executive_id: int(row.bookings or 0)
        for row in session.execute(statement).all()
    }


def executive_visit_metrics(
    session: Session,
    *,
    filters: AnalyticsFilters,
) -> dict[UUID, dict[str, int]]:
    conditions = [
        *_visit_conditions(filters),
        Booking.executive_id.is_not(None),
    ]
    statement = (
        select(
            Booking.executive_id.label("executive_id"),
            _conditional_count(
                Booking.status == BookingStatus.COMPLETED.value
            ).label("completed_visits"),
            _conditional_count(
                Booking.status == BookingStatus.NO_SHOW.value
            ).label("no_show_visits"),
        )
        .select_from(Booking)
        .join(VisitSlot, VisitSlot.id == Booking.slot_id)
        .where(*conditions)
        .group_by(Booking.executive_id)
    )
    return {
        row.executive_id: {
            "completed_visits": int(row.completed_visits or 0),
            "no_show_visits": int(row.no_show_visits or 0),
        }
        for row in session.execute(statement).all()
    }


def executive_cancellation_metrics(
    session: Session,
    *,
    filters: AnalyticsFilters,
) -> dict[UUID, int]:
    conditions = [
        *_cancellation_conditions(filters),
        Booking.executive_id.is_not(None),
    ]
    statement = (
        select(
            Booking.executive_id.label("executive_id"),
            func.count(Booking.id).label("cancelled_bookings"),
        )
        .where(*conditions)
        .group_by(Booking.executive_id)
    )
    return {
        row.executive_id: int(row.cancelled_bookings or 0)
        for row in session.execute(statement).all()
    }


def executive_handoff_metrics(
    session: Session,
    *,
    filters: AnalyticsFilters,
) -> dict[UUID, dict[str, int]]:
    conditions = [
        *_handoff_conditions(filters),
        Handoff.executive_id.is_not(None),
    ]
    statement = (
        select(
            Handoff.executive_id.label("executive_id"),
            func.count(Handoff.id).label("handoffs_total"),
            _conditional_count(
                Handoff.status.in_(ACTIVE_HANDOFF_STATUSES)
            ).label("handoffs_active"),
            _conditional_count(
                Handoff.status == HandoffStatus.RESOLVED.value
            ).label("handoffs_resolved"),
        )
        .where(*conditions)
        .group_by(Handoff.executive_id)
    )
    return {
        row.executive_id: {
            "handoffs_total": int(row.handoffs_total or 0),
            "handoffs_active": int(row.handoffs_active or 0),
            "handoffs_resolved": int(row.handoffs_resolved or 0),
        }
        for row in session.execute(statement).all()
    }


def executive_lead_to_visit_metrics(
    session: Session,
    *,
    filters: AnalyticsFilters,
) -> dict[UUID, int]:
    """Count distinct currently assigned leads with a booking, by executive."""

    conditions = [
        LeadAssignment.unassigned_at.is_(None),
        *_lead_conditions(filters),
    ]
    statement = (
        select(
            LeadAssignment.executive_id.label("executive_id"),
            func.count(func.distinct(Booking.lead_id)).label("booked_leads"),
        )
        .select_from(Booking)
        .join(Lead, Lead.id == Booking.lead_id)
        .join(
            LeadAssignment,
            LeadAssignment.lead_id == Lead.id,
        )
        .where(*conditions)
        .group_by(LeadAssignment.executive_id)
    )
    return {
        row.executive_id: int(row.booked_leads or 0)
        for row in session.execute(statement).all()
    }


# ---------------------------------------------------------------------------
# Marketing spend
# ---------------------------------------------------------------------------


def _spend_overlap_conditions(
    *,
    project_id: UUID | None = None,
    period_from: date | None = None,
    period_to: date | None = None,
) -> list[Any]:
    conditions: list[Any] = []
    if project_id is not None:
        conditions.append(MarketingSpend.project_id == project_id)
    if period_from is not None:
        conditions.append(MarketingSpend.period_end >= period_from)
    if period_to is not None:
        conditions.append(MarketingSpend.period_start <= period_to)
    return conditions


def marketing_spend_by_source(
    session: Session,
    *,
    filters: AnalyticsFilters,
) -> dict[str, Decimal]:
    """Sum full spend records overlapping the dashboard date range by source."""

    period_from = filters.date_from.date() if filters.date_from else None
    period_to = filters.date_to.date() if filters.date_to else None
    conditions = _spend_overlap_conditions(
        project_id=filters.project_id,
        period_from=period_from,
        period_to=period_to,
    )
    statement = (
        select(
            MarketingSpend.source.label("source"),
            func.coalesce(func.sum(MarketingSpend.amount), 0).label("amount"),
        )
        .where(*conditions)
        .group_by(MarketingSpend.source)
    )
    return {
        row.source: Decimal(row.amount)
        for row in session.execute(statement).all()
    }


def add_marketing_spend(session: Session, spend: MarketingSpend) -> None:
    """Stage a new marketing spend row in the current transaction."""

    session.add(spend)


def get_marketing_spend_by_id(
    session: Session, spend_id: UUID
) -> MarketingSpend | None:
    return session.get(MarketingSpend, spend_id)


def count_marketing_spends(
    session: Session,
    *,
    project_id: UUID | None = None,
    source: LeadSource | None = None,
    period_from: date | None = None,
    period_to: date | None = None,
) -> int:
    conditions = _spend_overlap_conditions(
        project_id=project_id,
        period_from=period_from,
        period_to=period_to,
    )
    if source is not None:
        conditions.append(MarketingSpend.source == source.value)
    return int(
        session.scalar(
            select(func.count()).select_from(MarketingSpend).where(*conditions)
        )
        or 0
    )


def list_marketing_spends(
    session: Session,
    *,
    offset: int,
    limit: int,
    project_id: UUID | None = None,
    source: LeadSource | None = None,
    period_from: date | None = None,
    period_to: date | None = None,
) -> list[MarketingSpend]:
    conditions = _spend_overlap_conditions(
        project_id=project_id,
        period_from=period_from,
        period_to=period_to,
    )
    if source is not None:
        conditions.append(MarketingSpend.source == source.value)
    statement = (
        select(MarketingSpend)
        .where(*conditions)
        .order_by(
            MarketingSpend.period_start.desc(),
            MarketingSpend.created_at.desc(),
        )
        .offset(offset)
        .limit(limit)
    )
    return list(session.scalars(statement).all())
