"""Business logic and transaction orchestration for visit slots and site visit bookings."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.bookings import repository
from app.modules.bookings.exceptions import (
    BookingConsentRequiredError,
    BookingNotFoundError,
    BookingOwnershipError,
    DuplicateBookingError,
    InvalidBookingStatusTransitionError,
    InvalidSlotTimeError,
    MismatchedProjectError,
    PastSlotBookingError,
    ProjectNotActiveError,
    SlotCapacityExceededError,
    SlotConflictError,
    SlotInactiveError,
    SlotNotFoundError,
)
from app.modules.bookings.models import (
    ACTIVE_BOOKING_STATUSES,
    Booking,
    BookingStatus,
    VisitSlot,
    utcnow,
)
from app.modules.bookings.schemas import (
    AvailableSlotListResponse,
    AvailableSlotResponse,
    BookingCancelRequest,
    BookingCreateRequest,
    BookingListResponse,
    BookingResponse,
    BookingStatusUpdateRequest,
    VisitSlotCreateRequest,
    VisitSlotListResponse,
    VisitSlotResponse,
    VisitSlotUpdateRequest,
)
from app.modules.leads.exceptions import LeadNotFoundError
from app.modules.leads.models import LeadStatus
from app.modules.leads.repository import get_lead_by_id
from app.modules.projects.exceptions import ProjectNotFoundError
from app.modules.projects.models import ProjectStatus
from app.modules.projects.repository import get_project_by_id
from app.modules.users import repository as users_repository
from app.modules.users.exceptions import InsufficientPermissionsError
from app.modules.users.models import RoleName, User


def _is_admin(user: User) -> bool:
    return user.role.name == RoleName.ADMIN.value


def _require_admin(user: User) -> None:
    if not _is_admin(user):
        raise InsufficientPermissionsError()


def _pages(total: int, page_size: int) -> int:
    return (total + page_size - 1) // page_size if total else 0


def _as_utc(dt: datetime) -> datetime:
    """Ensure datetime is timezone-aware UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


# ---------------------------------------------------------------------------
# VisitSlot Management
# ---------------------------------------------------------------------------


def create_slot(
    session: Session,
    *,
    actor: User,
    payload: VisitSlotCreateRequest,
) -> VisitSlotResponse:
    """Create a new visit slot for an active project (Admin only)."""

    _require_admin(actor)

    project = get_project_by_id(session, payload.project_id)
    if project is None:
        raise ProjectNotFoundError()
    if project.status != ProjectStatus.ACTIVE.value:
        raise ProjectNotActiveError()

    now = utcnow()
    start_time = _as_utc(payload.start_time)
    end_time = _as_utc(payload.end_time)
    if start_time <= now:
        raise PastSlotBookingError()
    if start_time >= end_time:
        raise InvalidSlotTimeError()

    existing = repository.get_slot_by_range(
        session,
        project_id=payload.project_id,
        start_time=payload.start_time,
        end_time=payload.end_time,
    )
    if existing is not None:
        raise SlotConflictError()

    slot = VisitSlot(
        project_id=payload.project_id,
        start_time=payload.start_time,
        end_time=payload.end_time,
        capacity=payload.capacity,
        notes=payload.notes,
        is_active=payload.is_active,
        created_at=now,
        updated_at=now,
    )
    session.add(slot)
    session.commit()
    session.refresh(slot)
    return VisitSlotResponse.model_validate(slot)


def update_slot(
    session: Session,
    *,
    actor: User,
    slot_id: UUID,
    payload: VisitSlotUpdateRequest,
) -> VisitSlotResponse:
    """Modify details or capacity of an existing visit slot (Admin only)."""

    _require_admin(actor)

    slot = repository.get_slot_by_id(session, slot_id, for_update=True)
    if slot is None:
        raise SlotNotFoundError()

    new_start = _as_utc(
        payload.start_time if payload.start_time is not None else slot.start_time
    )
    new_end = _as_utc(
        payload.end_time if payload.end_time is not None else slot.end_time
    )
    if new_start >= new_end:
        raise InvalidSlotTimeError()

    if payload.start_time is not None:
        slot.start_time = payload.start_time
    if payload.end_time is not None:
        slot.end_time = payload.end_time
    if payload.capacity is not None:
        slot.capacity = payload.capacity
    if payload.notes is not None:
        slot.notes = payload.notes
    if payload.is_active is not None:
        slot.is_active = payload.is_active

    slot.updated_at = utcnow()
    session.commit()
    session.refresh(slot)
    return VisitSlotResponse.model_validate(slot)


def deactivate_slot(
    session: Session,
    *,
    actor: User,
    slot_id: UUID,
) -> VisitSlotResponse:
    """Soft-deactivate a visit slot (Admin only)."""

    _require_admin(actor)

    slot = repository.get_slot_by_id(session, slot_id, for_update=True)
    if slot is None:
        raise SlotNotFoundError()

    slot.is_active = False
    slot.updated_at = utcnow()
    session.commit()
    session.refresh(slot)
    return VisitSlotResponse.model_validate(slot)


def get_slot(
    session: Session,
    *,
    actor: User,
    slot_id: UUID,
) -> VisitSlotResponse:
    """Retrieve visit slot details."""

    slot = repository.get_slot_by_id(session, slot_id)
    if slot is None:
        raise SlotNotFoundError()
    return VisitSlotResponse.model_validate(slot)


def list_slots(
    session: Session,
    *,
    actor: User,
    page: int,
    page_size: int,
    project_id: UUID | None = None,
    is_active: bool | None = None,
    from_time: datetime | None = None,
    to_time: datetime | None = None,
) -> VisitSlotListResponse:
    """Return a paginated list of slots."""

    if not _is_admin(actor):
        is_active = True
        from_time = from_time or utcnow()

    total = repository.count_slots(
        session,
        project_id=project_id,
        is_active=is_active,
        from_time=from_time,
        to_time=to_time,
    )
    items = repository.list_slots(
        session,
        offset=(page - 1) * page_size,
        limit=page_size,
        project_id=project_id,
        is_active=is_active,
        from_time=from_time,
        to_time=to_time,
    )
    return VisitSlotListResponse(
        items=[VisitSlotResponse.model_validate(slot) for slot in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=_pages(total, page_size),
    )


def get_available_slots(
    session: Session,
    *,
    actor: User,
    project_id: UUID,
    from_time: datetime | None = None,
    to_time: datetime | None = None,
) -> AvailableSlotListResponse:
    """Return all genuinely available visit slots for an active project."""

    project = get_project_by_id(session, project_id)
    if project is None or project.status != ProjectStatus.ACTIVE.value:
        return AvailableSlotListResponse(items=[], total=0)

    now = utcnow()
    slots = repository.list_active_upcoming_slots(
        session,
        project_id=project_id,
        now=now,
        from_time=from_time,
        to_time=to_time,
    )

    available_items: list[AvailableSlotResponse] = []
    for slot in slots:
        booked_count = repository.count_active_slot_bookings(session, slot.id)
        available_capacity = max(0, slot.capacity - booked_count)
        if available_capacity > 0:
            available_items.append(
                AvailableSlotResponse(
                    id=slot.id,
                    project_id=slot.project_id,
                    start_time=slot.start_time,
                    end_time=slot.end_time,
                    capacity=slot.capacity,
                    booked_count=booked_count,
                    available_capacity=available_capacity,
                    notes=slot.notes,
                )
            )

    return AvailableSlotListResponse(
        items=available_items,
        total=len(available_items),
    )


# ---------------------------------------------------------------------------
# Booking Management
# ---------------------------------------------------------------------------


def _get_visible_booking(
    session: Session,
    *,
    actor: User,
    booking_id: UUID,
    for_update: bool = False,
) -> Booking:
    """Fetch booking and enforce role-based access isolation."""

    booking = repository.get_booking_by_id(session, booking_id, for_update=for_update)
    if booking is None:
        raise BookingNotFoundError()

    if _is_admin(actor):
        return booking

    if actor.role.name == RoleName.BUYER.value:
        if booking.buyer_id != actor.id:
            raise BookingNotFoundError()
        return booking

    if actor.role.name == RoleName.SALES_EXECUTIVE.value:
        if booking.project.status != ProjectStatus.ACTIVE.value:
            raise BookingNotFoundError()
        if (
            booking.executive_id != actor.id
            and (
                booking.lead.current_assignment is None
                or booking.lead.current_assignment.executive_id != actor.id
            )
        ):
            raise BookingNotFoundError()
        return booking

    raise BookingNotFoundError()


def create_booking(
    session: Session,
    *,
    actor: User,
    payload: BookingCreateRequest,
) -> BookingResponse:
    """Reserve a visit slot with strict capacity concurrency and ownership checks."""

    now = utcnow()

    # 1. Lead verification & ownership
    lead = get_lead_by_id(session, payload.lead_id)
    if lead is None:
        raise LeadNotFoundError()

    if not lead.consent_to_contact:
        raise BookingConsentRequiredError()

    if actor.role.name == RoleName.BUYER.value:
        if lead.email and lead.email != actor.email:
            raise BookingOwnershipError()
        buyer_id = actor.id
    elif actor.role.name == RoleName.SALES_EXECUTIVE.value:
        if (
            lead.current_assignment is None
            or lead.current_assignment.executive_id != actor.id
        ):
            raise BookingOwnershipError(
                "Sales executives can only book site visits for assigned leads."
            )
        # Attribute to buyer if account exists, otherwise self
        buyer_user = (
            users_repository.get_user_by_email(session, lead.email)
            if lead.email
            else None
        )
        buyer_id = buyer_user.id if buyer_user is not None else actor.id
    elif _is_admin(actor):
        buyer_user = (
            users_repository.get_user_by_email(session, lead.email)
            if lead.email
            else None
        )
        buyer_id = buyer_user.id if buyer_user is not None else actor.id
    else:
        raise BookingOwnershipError()

    # 2. VisitSlot concurrency lock and capacity validation
    # Exclusive row-level lock on slot to prevent race condition overbooking
    slot = repository.get_slot_by_id(session, payload.slot_id, for_update=True)
    if slot is None:
        raise SlotNotFoundError()

    if slot.project_id != lead.project_id:
        raise MismatchedProjectError()

    if slot.project.status != ProjectStatus.ACTIVE.value:
        raise ProjectNotActiveError()

    if not slot.is_active:
        raise SlotInactiveError()

    if _as_utc(slot.start_time) <= now:
        raise PastSlotBookingError()

    # Duplicate active booking check
    if repository.has_active_booking_for_lead_and_slot(
        session, lead_id=lead.id, slot_id=slot.id
    ):
        raise DuplicateBookingError()

    # Check remaining capacity
    current_booked = repository.count_active_slot_bookings(session, slot.id)
    if current_booked >= slot.capacity:
        raise SlotCapacityExceededError()

    # Executive assignment linkage
    executive_id = (
        lead.current_assignment.executive_id
        if lead.current_assignment is not None
        else None
    )

    booking = Booking(
        slot_id=slot.id,
        lead_id=lead.id,
        project_id=slot.project_id,
        buyer_id=buyer_id,
        executive_id=executive_id,
        status=BookingStatus.CONFIRMED.value,
        notes=payload.notes,
        created_at=now,
        updated_at=now,
    )
    session.add(booking)

    # Transition lead status to VISIT_BOOKED if applicable
    if lead.status in (
        LeadStatus.NEW.value,
        LeadStatus.CONTACTED.value,
        LeadStatus.QUALIFIED.value,
        LeadStatus.VISIT_CANCELLED.value,
    ):
        lead.status = LeadStatus.VISIT_BOOKED.value
        lead.updated_at = now

    session.commit()
    # Refresh with eager relationships loaded
    persisted = repository.get_booking_by_id(session, booking.id)
    assert persisted is not None
    return BookingResponse.from_orm_model(persisted)


def get_booking(
    session: Session,
    *,
    actor: User,
    booking_id: UUID,
) -> BookingResponse:
    """Retrieve an authorized booking detail."""

    booking = _get_visible_booking(session, actor=actor, booking_id=booking_id)
    return BookingResponse.from_orm_model(booking)


def list_bookings(
    session: Session,
    *,
    actor: User,
    page: int,
    page_size: int,
    project_id: UUID | None = None,
    lead_id: UUID | None = None,
    status: BookingStatus | None = None,
) -> BookingListResponse:
    """Return a paginated list of bookings matching caller visibility."""

    if _is_admin(actor):
        buyer_filter = None
        executive_filter = None
        active_project_only = False
    elif actor.role.name == RoleName.BUYER.value:
        buyer_filter = actor.id
        executive_filter = None
        active_project_only = False
    elif actor.role.name == RoleName.SALES_EXECUTIVE.value:
        buyer_filter = None
        executive_filter = actor.id
        active_project_only = True
    else:
        return BookingListResponse(
            items=[], total=0, page=page, page_size=page_size, pages=0
        )

    total = repository.count_bookings(
        session,
        buyer_id=buyer_filter,
        executive_id=executive_filter,
        project_id=project_id,
        lead_id=lead_id,
        status=status,
        active_project_only=active_project_only,
    )
    items = repository.list_bookings(
        session,
        offset=(page - 1) * page_size,
        limit=page_size,
        buyer_id=buyer_filter,
        executive_id=executive_filter,
        project_id=project_id,
        lead_id=lead_id,
        status=status,
        active_project_only=active_project_only,
    )
    return BookingListResponse(
        items=[BookingResponse.from_orm_model(b) for b in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=_pages(total, page_size),
    )


def cancel_booking(
    session: Session,
    *,
    actor: User,
    booking_id: UUID,
    payload: BookingCancelRequest,
) -> BookingResponse:
    """Cancel a booking, releasing its slot capacity."""

    booking = _get_visible_booking(
        session, actor=actor, booking_id=booking_id, for_update=True
    )

    if booking.status == BookingStatus.CANCELLED.value:
        return BookingResponse.from_orm_model(booking)

    if booking.status in (
        BookingStatus.COMPLETED.value,
        BookingStatus.NO_SHOW.value,
    ):
        raise InvalidBookingStatusTransitionError(
            booking.status, BookingStatus.CANCELLED.value
        )

    now = utcnow()
    booking.status = BookingStatus.CANCELLED.value
    booking.cancelled_at = now
    booking.cancelled_by_id = actor.id
    booking.cancellation_reason = payload.cancellation_reason
    booking.updated_at = now

    # If lead has no other active bookings, transition lead status to VISIT_CANCELLED
    active_count = repository.count_active_lead_bookings(
        session, booking.lead_id, exclude_booking_id=booking.id
    )
    if active_count == 0 and booking.lead.status == LeadStatus.VISIT_BOOKED.value:
        booking.lead.status = LeadStatus.VISIT_CANCELLED.value
        booking.lead.updated_at = now

    session.commit()
    refreshed = repository.get_booking_by_id(session, booking.id)
    assert refreshed is not None
    return BookingResponse.from_orm_model(refreshed)


def update_booking_status(
    session: Session,
    *,
    actor: User,
    booking_id: UUID,
    payload: BookingStatusUpdateRequest,
) -> BookingResponse:
    """Update visit outcome status (Admin or assigned Sales Executive)."""

    booking = _get_visible_booking(
        session, actor=actor, booking_id=booking_id, for_update=True
    )

    # Buyers cannot perform status transitions (like marking completed or no-show)
    if actor.role.name == RoleName.BUYER.value:
        raise InsufficientPermissionsError()

    requested = payload.status
    if booking.status == requested.value:
        return BookingResponse.from_orm_model(booking)

    # Terminal state checks
    if booking.status in (
        BookingStatus.CANCELLED.value,
        BookingStatus.COMPLETED.value,
        BookingStatus.NO_SHOW.value,
    ):
        raise InvalidBookingStatusTransitionError(booking.status, requested.value)

    now = utcnow()
    booking.status = requested.value
    booking.updated_at = now
    if payload.notes:
        booking.notes = payload.notes

    if requested == BookingStatus.CANCELLED:
        booking.cancelled_at = now
        booking.cancelled_by_id = actor.id

    # If visit took place, transition lead status to VISITED
    if requested == BookingStatus.COMPLETED:
        if booking.lead.status in (
            LeadStatus.VISIT_BOOKED.value,
            LeadStatus.QUALIFIED.value,
            LeadStatus.CONTACTED.value,
        ):
            booking.lead.status = LeadStatus.VISITED.value
            booking.lead.updated_at = now

    session.commit()
    refreshed = repository.get_booking_by_id(session, booking.id)
    assert refreshed is not None
    return BookingResponse.from_orm_model(refreshed)
