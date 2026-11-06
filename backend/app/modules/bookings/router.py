"""HTTP endpoints for visit slots and site visit bookings."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import CurrentUser
from app.modules.bookings.models import BookingStatus
from app.modules.bookings.schemas import (
    AvailableSlotListResponse,
    BookingCancelRequest,
    BookingCreateRequest,
    BookingCustomScheduleRequest,
    BookingListResponse,
    BookingMetricsResponse,
    BookingRescheduleRequest,
    BookingResponse,
    BookingStatusUpdateRequest,
    VisitSlotCreateRequest,
    VisitSlotListResponse,
    VisitSlotResponse,
    VisitSlotUpdateRequest,
)
from app.modules.bookings.service import (
    cancel_booking,
    create_booking,
    create_slot,
    deactivate_slot,
    get_available_slots,
    get_booking,
    get_booking_metrics_summary,
    get_slot,
    list_bookings,
    list_slots,
    reschedule_booking,
    schedule_custom_booking,
    update_booking_status,
    update_slot,
)

slots_router = APIRouter(prefix="/slots", tags=["slots"])
bookings_router = APIRouter(prefix="/bookings", tags=["bookings"])


# ---------------------------------------------------------------------------
# Slot Endpoints
# ---------------------------------------------------------------------------


@slots_router.post(
    "",
    response_model=VisitSlotResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a visit slot (Admin only)",
)
def create_slot_endpoint(
    payload: VisitSlotCreateRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> VisitSlotResponse:
    """Create a new site visit slot for an active project."""

    return create_slot(db, actor=current_user, payload=payload)


@slots_router.get(
    "/available",
    response_model=AvailableSlotListResponse,
    summary="Look up genuinely available visit slots",
)
def get_available_slots_endpoint(
    project_id: UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    from_time: datetime | None = None,
    to_time: datetime | None = None,
) -> AvailableSlotListResponse:
    """Return active future visit slots with positive available capacity."""

    return get_available_slots(
        db,
        actor=current_user,
        project_id=project_id,
        from_time=from_time,
        to_time=to_time,
    )


@slots_router.get(
    "",
    response_model=VisitSlotListResponse,
    summary="List visit slots",
)
def list_slots_endpoint(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    project_id: UUID | None = None,
    is_active: bool | None = None,
    from_time: datetime | None = None,
    to_time: datetime | None = None,
) -> VisitSlotListResponse:
    """Return paginated visit slots."""

    return list_slots(
        db,
        actor=current_user,
        page=page,
        page_size=page_size,
        project_id=project_id,
        is_active=is_active,
        from_time=from_time,
        to_time=to_time,
    )


@slots_router.get(
    "/{slot_id}",
    response_model=VisitSlotResponse,
    summary="Get visit slot detail",
)
def get_slot_endpoint(
    slot_id: UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> VisitSlotResponse:
    """Return a single visit slot by ID."""

    return get_slot(db, actor=current_user, slot_id=slot_id)


@slots_router.patch(
    "/{slot_id}",
    response_model=VisitSlotResponse,
    summary="Update a visit slot (Admin only)",
)
def update_slot_endpoint(
    slot_id: UUID,
    payload: VisitSlotUpdateRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> VisitSlotResponse:
    """Update capacity, time window, or notes of a visit slot."""

    return update_slot(db, actor=current_user, slot_id=slot_id, payload=payload)


@slots_router.delete(
    "/{slot_id}",
    response_model=VisitSlotResponse,
    summary="Deactivate a visit slot (Admin only)",
)
def deactivate_slot_endpoint(
    slot_id: UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> VisitSlotResponse:
    """Soft-deactivate a visit slot."""

    return deactivate_slot(db, actor=current_user, slot_id=slot_id)


# ---------------------------------------------------------------------------
# Booking Endpoints
# ---------------------------------------------------------------------------


@bookings_router.post(
    "",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Book a site visit",
)
def create_booking_endpoint(
    payload: BookingCreateRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> BookingResponse:
    """Reserve a site visit slot with strict capacity concurrency protection."""

    return create_booking(db, actor=current_user, payload=payload)


@bookings_router.get(
    "/metrics",
    response_model=BookingMetricsResponse,
    summary="Get site visits and slot availability metrics summary (Admin only)",
)
def get_booking_metrics_endpoint(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> BookingMetricsResponse:
    """Return aggregate statistics across site visits and slots."""

    return get_booking_metrics_summary(db, actor=current_user)


@bookings_router.get(
    "",
    response_model=BookingListResponse,
    summary="List bookings",
)
def list_bookings_endpoint(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    project_id: UUID | None = None,
    lead_id: UUID | None = None,
    booking_status: Annotated[
        BookingStatus | None,
        Query(alias="status", description="Filter by booking status."),
    ] = None,
    search: str | None = None,
) -> BookingListResponse:
    """List bookings filtered by caller authorization."""

    return list_bookings(
        db,
        actor=current_user,
        page=page,
        page_size=page_size,
        project_id=project_id,
        lead_id=lead_id,
        status=booking_status,
        search=search,
    )


@bookings_router.get(
    "/{booking_id}",
    response_model=BookingResponse,
    summary="Get booking detail",
)
def get_booking_endpoint(
    booking_id: UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> BookingResponse:
    """Retrieve an authorized booking by ID."""

    return get_booking(db, actor=current_user, booking_id=booking_id)


@bookings_router.post(
    "/schedule-custom",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule a visit at custom date/time (Sales Executive or Admin)",
)
def schedule_custom_booking_endpoint(
    payload: BookingCustomScheduleRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> BookingResponse:
    """Schedule a site visit at a chosen time, automatically creating a slot if none exists."""

    return schedule_custom_booking(db, actor=current_user, payload=payload)


@bookings_router.post(
    "/{booking_id}/cancel",
    response_model=BookingResponse,
    summary="Cancel a site visit booking",
)
def cancel_booking_endpoint(
    booking_id: UUID,
    payload: BookingCancelRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> BookingResponse:
    """Cancel a booking, releasing the slot capacity."""

    return cancel_booking(
        db, actor=current_user, booking_id=booking_id, payload=payload
    )


@bookings_router.post(
    "/{booking_id}/reschedule",
    response_model=BookingResponse,
    summary="Reschedule a site visit booking",
)
def reschedule_booking_endpoint(
    booking_id: UUID,
    payload: BookingRescheduleRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> BookingResponse:
    """Reschedule a site visit booking to a new available slot."""

    return reschedule_booking(
        db, actor=current_user, booking_id=booking_id, payload=payload
    )


@bookings_router.patch(
    "/{booking_id}/status",
    response_model=BookingResponse,
    summary="Update booking outcome status (Admin or Sales Executive)",
)
def update_booking_status_endpoint(
    booking_id: UUID,
    payload: BookingStatusUpdateRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> BookingResponse:
    """Update visit outcome status (e.g. COMPLETED or NO_SHOW)."""

    return update_booking_status(
        db, actor=current_user, booking_id=booking_id, payload=payload
    )

