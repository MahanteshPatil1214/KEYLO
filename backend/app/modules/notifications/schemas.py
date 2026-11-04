"""Pydantic schemas for the notifications and reminders module."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.modules.notifications.models import Notification, NotificationType


class NotificationResponse(BaseModel):
    """Public representation of an in-app notification."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    type: str
    title: str
    message: str
    is_read: bool
    read_at: datetime | None
    idempotency_key: str | None
    lead_id: UUID | None
    booking_id: UUID | None
    handoff_id: UUID | None
    project_id: UUID | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_orm_model(cls, n: Notification) -> NotificationResponse:
        return cls(
            id=n.id,
            user_id=n.user_id,
            type=n.type,
            title=n.title,
            message=n.message,
            is_read=n.is_read,
            read_at=n.read_at,
            idempotency_key=n.idempotency_key,
            lead_id=n.lead_id,
            booking_id=n.booking_id,
            handoff_id=n.handoff_id,
            project_id=n.project_id,
            created_at=n.created_at,
            updated_at=n.updated_at,
        )


class NotificationListResponse(BaseModel):
    """Paginated list of notifications."""

    items: list[NotificationResponse]
    total: int
    page: int
    page_size: int
    pages: int


class UnreadCountResponse(BaseModel):
    """Summary of unread notifications for a user."""

    unread_count: int


class MarkAllReadResponse(BaseModel):
    """Result of marking all unread notifications as read."""

    updated_count: int


class TriggerRemindersResponse(BaseModel):
    """Result of manually triggering the due reminders scan."""

    dispatched_count: int
