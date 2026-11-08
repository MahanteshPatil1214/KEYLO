"""Pydantic schemas for visit slots and site visit bookings."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.modules.bookings.models import Booking, BookingStatus, VisitSlot


class VisitSlotCreateRequest(BaseModel):
    """Input payload to create a new visit slot."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    project_id: UUID
    start_time: datetime
    end_time: datetime
    capacity: int = Field(default=1, ge=1, le=50)
    address: str | None = Field(default=None, max_length=500)
    latitude: float | None = None
    longitude: float | None = None
    notes: str | None = Field(default=None, max_length=500)
    is_active: bool = True

    @model_validator(mode="after")
    def _validate_time_ordering(self) -> VisitSlotCreateRequest:
        if self.start_time >= self.end_time:
            raise ValueError("Slot start_time must be strictly before end_time.")
        return self


class VisitSlotUpdateRequest(BaseModel):
    """Input payload to update an existing visit slot."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    start_time: datetime | None = None
    end_time: datetime | None = None
    capacity: int | None = Field(default=None, ge=1, le=50)
    address: str | None = Field(default=None, max_length=500)
    latitude: float | None = None
    longitude: float | None = None
    notes: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None

    @model_validator(mode="after")
    def _validate_time_ordering(self) -> VisitSlotUpdateRequest:
        if self.start_time is not None and self.end_time is not None:
            if self.start_time >= self.end_time:
                raise ValueError("Slot start_time must be strictly before end_time.")
        return self


class VisitSlotResponse(BaseModel):
    """Representation of an administrative visit slot."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    start_time: datetime
    end_time: datetime
    capacity: int
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    is_active: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime

    project_name: str | None = None
    booked_count: int = 0
    available_capacity: int = 0

    @classmethod
    def from_orm_model(cls, slot: VisitSlot, booked_count: int = 0) -> VisitSlotResponse:
        return cls(
            id=slot.id,
            project_id=slot.project_id,
            start_time=slot.start_time,
            end_time=slot.end_time,
            capacity=slot.capacity,
            address=slot.address,
            latitude=slot.latitude,
            longitude=slot.longitude,
            is_active=slot.is_active,
            notes=slot.notes,
            created_at=slot.created_at,
            updated_at=slot.updated_at,
            project_name=slot.project.name if getattr(slot, "project", None) else None,
            booked_count=booked_count,
            available_capacity=max(0, slot.capacity - booked_count),
        )


class AvailableSlotResponse(BaseModel):
    """Public representation of a visit slot showing real-time available capacity."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID
    start_time: datetime
    end_time: datetime
    capacity: int
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    booked_count: int
    available_capacity: int
    notes: str | None


class VisitSlotListResponse(BaseModel):
    """Paginated list of visit slots."""

    items: list[VisitSlotResponse]
    total: int
    page: int
    page_size: int
    pages: int


class AvailableSlotListResponse(BaseModel):
    """List of currently available visit slots for a project."""

    items: list[AvailableSlotResponse]
    total: int


class BookingCreateRequest(BaseModel):
    """Input payload to reserve a site visit."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    slot_id: UUID
    lead_id: UUID
    notes: str | None = Field(default=None, max_length=1000)


class BookingCancelRequest(BaseModel):
    """Input payload when cancelling a site visit booking."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    cancellation_reason: str | None = Field(default=None, max_length=500)


class BookingRescheduleRequest(BaseModel):
    """Input payload to reschedule a site visit to a different slot or custom time."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    slot_id: UUID | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    notes: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def _validate_reschedule_target(self) -> BookingRescheduleRequest:
        if self.slot_id is None and (self.start_time is None or self.end_time is None):
            raise ValueError(
                "Either slot_id or both start_time and end_time must be provided."
            )
        if self.start_time is not None and self.end_time is not None:
            if self.start_time >= self.end_time:
                raise ValueError("start_time must be strictly before end_time.")
        return self


class BookingCustomScheduleRequest(BaseModel):
    """Input payload when a sales executive or admin schedules a visit with custom date/time."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    lead_id: UUID
    start_time: datetime
    end_time: datetime
    notes: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def _validate_time_ordering(self) -> BookingCustomScheduleRequest:
        if self.start_time >= self.end_time:
            raise ValueError("Start time must be strictly before end time.")
        return self


class BookingStatusUpdateRequest(BaseModel):
    """Input payload when an admin or sales executive updates visit status."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    status: BookingStatus
    notes: str | None = Field(default=None, max_length=1000)


class BookingMetricsResponse(BaseModel):
    """Aggregate metrics for admin site visits and availability dashboard."""

    total_visits: int
    upcoming_visits: int
    completed_visits: int
    cancelled_visits: int
    total_slots: int
    active_slots: int
    blocked_slots: int


class BookingResponse(BaseModel):
    """Comprehensive representation of a site visit booking."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slot_id: UUID
    lead_id: UUID
    project_id: UUID
    buyer_id: UUID
    executive_id: UUID | None
    status: BookingStatus
    cancellation_reason: str | None
    cancelled_at: datetime | None
    cancelled_by_id: UUID | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    # Dynamically populated from lead, project, executive and slot relationships
    buyer_name: str
    buyer_phone: str | None
    buyer_email: str | None
    slot_start_time: datetime
    slot_end_time: datetime
    project_name: str | None = None
    executive_name: str | None = None

    @classmethod
    def from_orm_model(cls, booking: Booking) -> BookingResponse:
        """Construct response model populating dynamic relationship fields."""

        return cls(
            id=booking.id,
            slot_id=booking.slot_id,
            lead_id=booking.lead_id,
            project_id=booking.project_id,
            buyer_id=booking.buyer_id,
            executive_id=booking.executive_id,
            status=BookingStatus(booking.status),
            cancellation_reason=booking.cancellation_reason,
            cancelled_at=booking.cancelled_at,
            cancelled_by_id=booking.cancelled_by_id,
            notes=booking.notes,
            created_at=booking.created_at,
            updated_at=booking.updated_at,
            buyer_name=booking.lead.full_name,
            buyer_phone=booking.lead.phone,
            buyer_email=booking.lead.email,
            slot_start_time=booking.slot.start_time,
            slot_end_time=booking.slot.end_time,
            project_name=booking.project.name if getattr(booking, "project", None) else None,
            executive_name=booking.executive.full_name if getattr(booking, "executive", None) else None,
        )


class BookingListResponse(BaseModel):
    """Paginated list of bookings."""

    items: list[BookingResponse]
    total: int
    page: int
    page_size: int
    pages: int

