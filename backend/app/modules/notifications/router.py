"""FastAPI endpoints for notifications and site visit reminders."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import CurrentUser, get_current_user, require_roles
from app.modules.notifications.models import NotificationType
from app.modules.notifications.scheduler import process_due_reminders
from app.modules.notifications.schemas import (
    MarkAllReadResponse,
    NotificationListResponse,
    NotificationResponse,
    TriggerRemindersResponse,
    UnreadCountResponse,
)
from app.modules.notifications.service import (
    get_notification,
    get_unread_count,
    list_notifications,
    mark_all_notifications_as_read,
    mark_notification_as_read,
)
from app.modules.users.models import RoleName, User

notifications_router = APIRouter(prefix="/notifications", tags=["Notifications"])


@notifications_router.get(
    "",
    response_model=NotificationListResponse,
    summary="List notifications",
    description="Retrieve a paginated list of notifications for the authenticated user.",
)
def list_notifications_endpoint(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    is_read: Annotated[bool | None, Query()] = None,
    type: Annotated[NotificationType | None, Query()] = None,
) -> NotificationListResponse:
    return list_notifications(
        db,
        actor=current_user,
        page=page,
        page_size=page_size,
        is_read=is_read,
        type=type,
    )


@notifications_router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    summary="Get unread notification count",
    description="Retrieve the total count of unread notifications for the caller.",
)
def get_unread_count_endpoint(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> UnreadCountResponse:
    return get_unread_count(db, actor=current_user)


@notifications_router.post(
    "/mark-all-read",
    response_model=MarkAllReadResponse,
    summary="Mark all notifications as read",
    description="Mark all unread notifications for the caller as read.",
)
def mark_all_read_endpoint(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> MarkAllReadResponse:
    return mark_all_notifications_as_read(db, actor=current_user)


@notifications_router.post(
    "/reminders/trigger",
    response_model=TriggerRemindersResponse,
    summary="Trigger due reminders scan (Admin only)",
    description="Manually execute the site visit reminder scan.",
    dependencies=[Depends(require_roles(RoleName.ADMIN))],
)
def trigger_reminders_endpoint(
    db: Annotated[Session, Depends(get_db)],
) -> TriggerRemindersResponse:
    count = process_due_reminders(db)
    return TriggerRemindersResponse(dispatched_count=count)


@notifications_router.get(
    "/{notification_id}",
    response_model=NotificationResponse,
    summary="Get notification details",
    description="Retrieve an individual notification owned by the caller.",
)
def get_notification_endpoint(
    notification_id: UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> NotificationResponse:
    return get_notification(
        db, actor=current_user, notification_id=notification_id
    )


@notifications_router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    summary="Mark notification as read",
    description="Mark a specific notification owned by the caller as read.",
)
def mark_notification_read_endpoint(
    notification_id: UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> NotificationResponse:
    return mark_notification_as_read(
        db, actor=current_user, notification_id=notification_id
    )
