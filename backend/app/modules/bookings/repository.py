"""Database access layer for visit slots and site visit bookings."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.modules.bookings.models import (
    ACTIVE_BOOKING_STATUSES,
    Booking,
    BookingStatus,
    VisitSlot,
)
from app.modules.projects.models import Project, ProjectStatus


# ---------------------------------------------------------------------------
# VisitSlot Queries
# ---------------------------------------------------------------------------


def create_slot(session: Session, slot: VisitSlot) -> VisitSlot:
    """Persist a new visit slot record."""

    session.add(slot)
    session.flush()
    return slot


def get_slot_by_id(
    session: Session,
    slot_id: UUID,
    *,
    for_update: bool = False,
) -> VisitSlot | None:
    """Return a visit slot by ID, optionally acquiring an exclusive row lock."""

    statement = (
        select(VisitSlot)
        .options(joinedload(VisitSlot.project))
        .where(VisitSlot.id == slot_id)
    )
    if for_update:
        # In SQLite, with_for_update is ignored; in PostgreSQL, locks the slot row
        statement = statement.with_for_update(of=VisitSlot)
    return session.scalar(statement)


def get_slot_by_range(
    session: Session,
    *,
    project_id: UUID,
    start_time: datetime,
    end_time: datetime,
) -> VisitSlot | None:
    """Check for an existing slot with identical project and time window."""

    statement = select(VisitSlot).where(
        VisitSlot.project_id == project_id,
        VisitSlot.start_time == start_time,
        VisitSlot.end_time == end_time,
    )
    return session.scalar(statement)


def count_active_slot_bookings(session: Session, slot_id: UUID) -> int:
    """Count non-cancelled bookings that consume capacity for a slot."""

    statement = (
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.slot_id == slot_id,
            Booking.status.in_(ACTIVE_BOOKING_STATUSES),
        )
    )
    return int(session.scalar(statement) or 0)


def list_active_upcoming_slots(
    session: Session,
    *,
    project_id: UUID,
    now: datetime,
    from_time: datetime | None = None,
    to_time: datetime | None = None,
) -> list[VisitSlot]:
    """Return active future visit slots for an active project."""

    statement = (
        select(VisitSlot)
        .join(Project, Project.id == VisitSlot.project_id)
        .where(
            VisitSlot.project_id == project_id,
            VisitSlot.is_active.is_(True),
            Project.status == ProjectStatus.ACTIVE.value,
            VisitSlot.start_time > now,
        )
    )
    if from_time is not None:
        statement = statement.where(VisitSlot.start_time >= from_time)
    if to_time is not None:
        statement = statement.where(VisitSlot.end_time <= to_time)

    statement = statement.order_by(VisitSlot.start_time.asc())
    return list(session.scalars(statement).all())


def count_slots(
    session: Session,
    *,
    project_id: UUID | None = None,
    is_active: bool | None = None,
    from_time: datetime | None = None,
    to_time: datetime | None = None,
) -> int:
    """Count administrative visit slots matching query filters."""

    statement = select(func.count()).select_from(VisitSlot)
    if project_id is not None:
        statement = statement.where(VisitSlot.project_id == project_id)
    if is_active is not None:
        statement = statement.where(VisitSlot.is_active == is_active)
    if from_time is not None:
        statement = statement.where(VisitSlot.start_time >= from_time)
    if to_time is not None:
        statement = statement.where(VisitSlot.end_time <= to_time)
    return int(session.scalar(statement) or 0)


def list_slots(
    session: Session,
    *,
    offset: int,
    limit: int,
    project_id: UUID | None = None,
    is_active: bool | None = None,
    from_time: datetime | None = None,
    to_time: datetime | None = None,
) -> list[VisitSlot]:
    """Return a paginated list of visit slots."""

    statement = select(VisitSlot).options(joinedload(VisitSlot.project))
    if project_id is not None:
        statement = statement.where(VisitSlot.project_id == project_id)
    if is_active is not None:
        statement = statement.where(VisitSlot.is_active == is_active)
    if from_time is not None:
        statement = statement.where(VisitSlot.start_time >= from_time)
    if to_time is not None:
        statement = statement.where(VisitSlot.end_time <= to_time)

    statement = statement.order_by(VisitSlot.start_time.asc()).offset(offset).limit(limit)
    return list(session.scalars(statement).all())


def get_slot_booked_counts(session: Session, slot_ids: list[UUID]) -> dict[UUID, int]:
    """Return a mapping of slot_id to active bookings count."""

    if not slot_ids:
        return {}
    statement = (
        select(Booking.slot_id, func.count())
        .where(
            Booking.slot_id.in_(slot_ids),
            Booking.status.in_(ACTIVE_BOOKING_STATUSES),
        )
        .group_by(Booking.slot_id)
    )
    return {row[0]: row[1] for row in session.execute(statement).all()}


def get_booking_metrics(session: Session) -> dict[str, int]:
    """Aggregate metrics across bookings and slots for admin analytics."""

    total_visits = int(session.scalar(select(func.count()).select_from(Booking)) or 0)
    upcoming_visits = int(
        session.scalar(
            select(func.count())
            .select_from(Booking)
            .where(
                Booking.status.in_(
                    [BookingStatus.CONFIRMED.value, BookingStatus.PENDING.value]
                )
            )
        )
        or 0
    )
    completed_visits = int(
        session.scalar(
            select(func.count())
            .select_from(Booking)
            .where(Booking.status == BookingStatus.COMPLETED.value)
        )
        or 0
    )
    cancelled_visits = int(
        session.scalar(
            select(func.count())
            .select_from(Booking)
            .where(Booking.status == BookingStatus.CANCELLED.value)
        )
        or 0
    )
    total_slots = int(
        session.scalar(select(func.count()).select_from(VisitSlot)) or 0
    )
    active_slots = int(
        session.scalar(
            select(func.count())
            .select_from(VisitSlot)
            .where(VisitSlot.is_active.is_(True))
        )
        or 0
    )
    blocked_slots = max(0, total_slots - active_slots)
    return {
        "total_visits": total_visits,
        "upcoming_visits": upcoming_visits,
        "completed_visits": completed_visits,
        "cancelled_visits": cancelled_visits,
        "total_slots": total_slots,
        "active_slots": active_slots,
        "blocked_slots": blocked_slots,
    }


# ---------------------------------------------------------------------------
# Booking Queries
# ---------------------------------------------------------------------------


def create_booking(session: Session, booking: Booking) -> Booking:
    """Persist a new booking record."""

    session.add(booking)
    session.flush()
    return booking


def get_booking_by_id(
    session: Session,
    booking_id: UUID,
    *,
    for_update: bool = False,
) -> Booking | None:
    """Return a booking by ID with eagerly loaded relationships."""

    statement = (
        select(Booking)
        .options(
            joinedload(Booking.lead),
            joinedload(Booking.slot),
            joinedload(Booking.project),
            joinedload(Booking.buyer),
            joinedload(Booking.executive),
        )
        .where(Booking.id == booking_id)
    )
    if for_update:
        statement = statement.with_for_update(of=Booking)
    return session.scalar(statement)


def has_active_booking_for_lead_and_slot(
    session: Session,
    *,
    lead_id: UUID,
    slot_id: UUID,
) -> bool:
    """Return True if the lead already holds an active booking for this slot."""

    statement = select(
        select(Booking.id)
        .where(
            Booking.lead_id == lead_id,
            Booking.slot_id == slot_id,
            Booking.status.in_(ACTIVE_BOOKING_STATUSES),
        )
        .exists()
    )
    return bool(session.scalar(statement))


def count_active_lead_bookings(
    session: Session,
    lead_id: UUID,
    *,
    exclude_booking_id: UUID | None = None,
) -> int:
    """Return the number of active site visit bookings held by a lead."""

    statement = (
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.lead_id == lead_id,
            Booking.status.in_(ACTIVE_BOOKING_STATUSES),
        )
    )
    if exclude_booking_id is not None:
        statement = statement.where(Booking.id != exclude_booking_id)
    return int(session.scalar(statement) or 0)


def count_bookings(
    session: Session,
    *,
    buyer_id: UUID | None = None,
    executive_id: UUID | None = None,
    project_id: UUID | None = None,
    lead_id: UUID | None = None,
    status: BookingStatus | None = None,
    active_project_only: bool = False,
    search: str | None = None,
) -> int:
    """Count bookings matching caller access scope and filters."""

    statement = select(func.count()).select_from(Booking)
    if active_project_only:
        statement = statement.join(Project, Project.id == Booking.project_id).where(
            Project.status == ProjectStatus.ACTIVE.value
        )
    if buyer_id is not None:
        statement = statement.where(Booking.buyer_id == buyer_id)
    if executive_id is not None:
        from app.modules.leads.models import LeadAssignment

        active_assigned_leads = (
            select(LeadAssignment.lead_id).where(
                LeadAssignment.executive_id == executive_id,
                LeadAssignment.unassigned_at.is_(None),
            )
        )
        statement = statement.where(
            (Booking.executive_id == executive_id)
            | Booking.lead_id.in_(active_assigned_leads)
        )
    if project_id is not None:
        statement = statement.where(Booking.project_id == project_id)
    if lead_id is not None:
        statement = statement.where(Booking.lead_id == lead_id)
    if status is not None:
        statement = statement.where(Booking.status == status.value)
    if search and search.strip():
        term = f"%{search.strip()}%"
        from app.modules.leads.models import Lead
        statement = statement.join(Booking.lead).where(
            Lead.full_name.ilike(term)
            | Lead.phone.ilike(term)
            | Lead.email.ilike(term)
        )
    return int(session.scalar(statement) or 0)


def list_bookings(
    session: Session,
    *,
    offset: int,
    limit: int,
    buyer_id: UUID | None = None,
    executive_id: UUID | None = None,
    project_id: UUID | None = None,
    lead_id: UUID | None = None,
    status: BookingStatus | None = None,
    active_project_only: bool = False,
    search: str | None = None,
) -> list[Booking]:
    """Return a paginated list of bookings with relationships."""

    statement = (
        select(Booking)
        .options(
            joinedload(Booking.lead),
            joinedload(Booking.slot),
            joinedload(Booking.project),
            joinedload(Booking.buyer),
            joinedload(Booking.executive),
        )
    )
    if active_project_only:
        statement = statement.join(Project, Project.id == Booking.project_id).where(
            Project.status == ProjectStatus.ACTIVE.value
        )
    if buyer_id is not None:
        statement = statement.where(Booking.buyer_id == buyer_id)
    if executive_id is not None:
        from app.modules.leads.models import LeadAssignment

        active_assigned_leads = (
            select(LeadAssignment.lead_id).where(
                LeadAssignment.executive_id == executive_id,
                LeadAssignment.unassigned_at.is_(None),
            )
        )
        statement = statement.where(
            (Booking.executive_id == executive_id)
            | Booking.lead_id.in_(active_assigned_leads)
        )
    if project_id is not None:
        statement = statement.where(Booking.project_id == project_id)
    if lead_id is not None:
        statement = statement.where(Booking.lead_id == lead_id)
    if status is not None:
        statement = statement.where(Booking.status == status.value)
    if search and search.strip():
        term = f"%{search.strip()}%"
        from app.modules.leads.models import Lead
        statement = statement.join(Booking.lead).where(
            Lead.full_name.ilike(term)
            | Lead.phone.ilike(term)
            | Lead.email.ilike(term)
        )

    statement = statement.order_by(Booking.created_at.desc()).offset(offset).limit(limit)
    return list(session.scalars(statement).all())

