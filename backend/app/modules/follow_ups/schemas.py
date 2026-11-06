"""Pydantic schemas for lead follow-ups."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.modules.follow_ups.models import (
    FollowUp,
    FollowUpOutcome,
    FollowUpPriority,
    FollowUpStatus,
    FollowUpType,
)


class FollowUpCreateRequest(BaseModel):
    """Input payload to schedule a new follow-up."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    lead_id: UUID
    scheduled_at: datetime
    type: FollowUpType = FollowUpType.CALL
    priority: FollowUpPriority = FollowUpPriority.MEDIUM
    notes: str | None = Field(default=None, max_length=1000)
    next_action: str | None = Field(default=None, max_length=500)


class FollowUpUpdateRequest(BaseModel):
    """Input payload to edit details of a pending follow-up."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    scheduled_at: datetime | None = None
    type: FollowUpType | None = None
    priority: FollowUpPriority | None = None
    notes: str | None = Field(default=None, max_length=1000)
    next_action: str | None = Field(default=None, max_length=500)


class FollowUpRescheduleRequest(BaseModel):
    """Input payload to reschedule a follow-up to a new date/time."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    scheduled_at: datetime
    notes: str | None = Field(default=None, max_length=1000)


class FollowUpCompleteRequest(BaseModel):
    """Input payload to record follow-up outcome and mark completed."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    outcome: FollowUpOutcome
    outcome_notes: str | None = Field(default=None, max_length=1000)
    next_action: str | None = Field(default=None, max_length=500)


class FollowUpResponse(BaseModel):
    """Representation of a lead follow-up with contextual buyer & project metadata."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lead_id: UUID
    project_id: UUID
    executive_id: UUID
    scheduled_at: datetime
    type: FollowUpType
    priority: FollowUpPriority
    status: FollowUpStatus
    notes: str | None
    next_action: str | None
    outcome: FollowUpOutcome | None
    outcome_notes: str | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    # Contextual fields
    buyer_name: str
    buyer_phone: str | None
    buyer_email: str | None
    lead_status: str
    project_name: str
    executive_name: str
    category: str

    @classmethod
    def from_orm_model(cls, follow_up: FollowUp) -> FollowUpResponse:
        """Construct FollowUpResponse from ORM model with populated relations."""
        lead = follow_up.lead
        project = follow_up.project
        executive = follow_up.executive

        return cls(
            id=follow_up.id,
            lead_id=follow_up.lead_id,
            project_id=follow_up.project_id,
            executive_id=follow_up.executive_id,
            scheduled_at=follow_up.scheduled_at,
            type=FollowUpType(follow_up.type),
            priority=FollowUpPriority(follow_up.priority),
            status=FollowUpStatus(follow_up.status),
            notes=follow_up.notes,
            next_action=follow_up.next_action,
            outcome=FollowUpOutcome(follow_up.outcome) if follow_up.outcome else None,
            outcome_notes=follow_up.outcome_notes,
            completed_at=follow_up.completed_at,
            created_at=follow_up.created_at,
            updated_at=follow_up.updated_at,
            buyer_name=lead.full_name if lead else "Unknown Buyer",
            buyer_phone=lead.phone if lead else None,
            buyer_email=lead.email if lead else None,
            lead_status=lead.status if lead else "NEW",
            project_name=project.name if project else "Unknown Project",
            executive_name=executive.full_name if executive else "Assigned Executive",
            category=follow_up.category,
        )


class FollowUpListResponse(BaseModel):
    """Paginated list of follow-ups."""

    items: list[FollowUpResponse]
    total: number if False else int
    page: int
    page_size: int
    pages: int


class FollowUpMetricsResponse(BaseModel):
    """Summary metrics of follow-ups."""

    total: int
    due_today: int
    overdue: int
    upcoming: int
    completed: int
