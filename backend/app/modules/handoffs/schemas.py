"""Pydantic schemas for human handoffs."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.modules.handoffs.models import Handoff, HandoffReason, HandoffStatus


class HandoffCreateRequest(BaseModel):
    """Payload to request or create a human handoff."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    conversation_id: UUID
    reason: HandoffReason = HandoffReason.BUYER_REQUESTED
    notes: str | None = Field(default=None, max_length=1000)


class HandoffAssignRequest(BaseModel):
    """Payload to assign or reassign a handoff to a sales executive."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    executive_id: UUID


class HandoffStatusUpdateRequest(BaseModel):
    """Payload to update the lifecycle status of a handoff."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    status: HandoffStatus
    resolution_notes: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def _validate_status_payload(self) -> HandoffStatusUpdateRequest:
        if self.status == HandoffStatus.RESOLVED and not (self.resolution_notes and self.resolution_notes.strip()):
            raise ValueError("resolution_notes are required when resolving a handoff.")
        return self


class HandoffResponse(BaseModel):
    """Standard representation of a human handoff record."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    lead_id: UUID
    project_id: UUID
    project_name: str
    lead_name: str
    lead_phone: str | None
    lead_email: str | None
    executive_id: UUID | None
    executive_name: str | None
    executive_email: str | None
    created_by_id: UUID | None
    status: str
    reason: str
    summary: str
    resolution_notes: str | None
    assigned_at: datetime | None
    resolved_at: datetime | None
    resolved_by_id: UUID | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_orm_model(cls, handoff: Handoff) -> HandoffResponse:
        project_name = handoff.project.name if handoff.project else "Unknown Project"
        lead_name = handoff.lead.full_name if handoff.lead else "Unknown Lead"
        lead_phone = handoff.lead.phone if handoff.lead else None
        lead_email = handoff.lead.email if handoff.lead else None

        executive_name = (
            handoff.executive.full_name if handoff.executive else None
        )
        executive_email = (
            handoff.executive.email if handoff.executive else None
        )

        return cls(
            id=handoff.id,
            conversation_id=handoff.conversation_id,
            lead_id=handoff.lead_id,
            project_id=handoff.project_id,
            project_name=project_name,
            lead_name=lead_name,
            lead_phone=lead_phone,
            lead_email=lead_email,
            executive_id=handoff.executive_id,
            executive_name=executive_name,
            executive_email=executive_email,
            created_by_id=handoff.created_by_id,
            status=handoff.status,
            reason=handoff.reason,
            summary=handoff.summary,
            resolution_notes=handoff.resolution_notes,
            assigned_at=handoff.assigned_at,
            resolved_at=handoff.resolved_at,
            resolved_by_id=handoff.resolved_by_id,
            created_at=handoff.created_at,
            updated_at=handoff.updated_at,
        )


class HandoffListResponse(BaseModel):
    """Paginated list of human handoff records."""

    items: list[HandoffResponse]
    total: int
    page: int
    page_size: int
    pages: int

