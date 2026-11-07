"""FastAPI endpoints for system settings, notification templates, and audit logs."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import CurrentUser, require_roles
from app.modules.settings.schemas import (
    AIAssistantSettings,
    AllSystemSettingsResponse,
    AuditLogListResponse,
    BroadcastNotificationRequest,
    BroadcastNotificationResponse,
    LanguageSettings,
    LeadAssignmentSettings,
    NotificationTemplateListResponse,
    NotificationTemplateResponse,
    NotificationTemplateUpdateRequest,
    ReminderSettings,
    SystemNotificationListResponse,
    UpdateAIAssistantSettingsRequest,
    UpdateLanguageSettingsRequest,
    UpdateLeadAssignmentSettingsRequest,
    UpdateReminderSettingsRequest,
)
from app.modules.settings.service import (
    dispatch_broadcast_notification,
    get_all_settings,
    get_template,
    list_audit_logs,
    list_system_notifications,
    list_templates,
    reset_template_to_default,
    trigger_reminders_scan,
    update_ai_settings,
    update_language_settings,
    update_lead_assignment_settings,
    update_reminder_settings,
    update_template,
)
from app.modules.users.models import RoleName

settings_router = APIRouter(
    prefix="/settings",
    tags=["System Settings & Notifications"],
    dependencies=[Depends(require_roles(RoleName.ADMIN))],
)


# ---------------------------------------------------------------------------
# Global System Settings
# ---------------------------------------------------------------------------

@settings_router.get(
    "",
    response_model=AllSystemSettingsResponse,
    summary="Get all system settings",
    description="Retrieve all configured system parameters across reminders, AI, languages, and assignments.",
)
def get_all_settings_endpoint(
    db: Annotated[Session, Depends(get_db)],
) -> AllSystemSettingsResponse:
    return get_all_settings(db)


@settings_router.patch(
    "/reminders",
    response_model=ReminderSettings,
    summary="Update reminder settings",
    description="Configure 24-hour and 2-hour site visit reminders and channels.",
)
def update_reminder_settings_endpoint(
    payload: UpdateReminderSettingsRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> ReminderSettings:
    return update_reminder_settings(db, actor=current_user, payload=payload)


@settings_router.post(
    "/reminders/trigger",
    summary="Trigger site-visit reminders scan",
    description="Execute an immediate reminder evaluation scan across confirmed bookings.",
)
def trigger_reminders_scan_endpoint(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    return trigger_reminders_scan(db, actor=current_user)


@settings_router.patch(
    "/ai-assistant",
    response_model=AIAssistantSettings,
    summary="Update AI assistant settings",
    description="Configure grounding boundaries, response parameters, and default replies.",
)
def update_ai_settings_endpoint(
    payload: UpdateAIAssistantSettingsRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> AIAssistantSettings:
    return update_ai_settings(db, actor=current_user, payload=payload)


@settings_router.patch(
    "/languages",
    response_model=LanguageSettings,
    summary="Update supported languages",
    description="Configure active multilingual buyer support options and default language.",
)
def update_language_settings_endpoint(
    payload: UpdateLanguageSettingsRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> LanguageSettings:
    return update_language_settings(db, actor=current_user, payload=payload)


@settings_router.patch(
    "/lead-assignment",
    response_model=LeadAssignmentSettings,
    summary="Update lead assignment rules",
    description="Configure round-robin, load-balanced, or manual assignment strategies and SLA timeouts.",
)
def update_lead_assignment_settings_endpoint(
    payload: UpdateLeadAssignmentSettingsRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> LeadAssignmentSettings:
    return update_lead_assignment_settings(db, actor=current_user, payload=payload)


# ---------------------------------------------------------------------------
# Notification Templates
# ---------------------------------------------------------------------------

@settings_router.get(
    "/templates",
    response_model=NotificationTemplateListResponse,
    summary="List notification templates",
    description="Retrieve all available notification templates for reminders, handoffs, and confirmations.",
)
def list_templates_endpoint(
    db: Annotated[Session, Depends(get_db)],
) -> NotificationTemplateListResponse:
    return list_templates(db)


@settings_router.get(
    "/templates/{template_id}",
    response_model=NotificationTemplateResponse,
    summary="Get notification template",
    description="Retrieve a single notification template by ID.",
)
def get_template_endpoint(
    template_id: UUID,
    db: Annotated[Session, Depends(get_db)],
) -> NotificationTemplateResponse:
    return get_template(db, template_id=template_id)


@settings_router.patch(
    "/templates/{template_id}",
    response_model=NotificationTemplateResponse,
    summary="Update notification template",
    description="Modify title, message body, or active state for a notification template.",
)
def update_template_endpoint(
    template_id: UUID,
    payload: NotificationTemplateUpdateRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> NotificationTemplateResponse:
    return update_template(
        db,
        actor=current_user,
        template_id=template_id,
        payload=payload,
    )


@settings_router.post(
    "/templates/{template_id}/reset",
    response_model=NotificationTemplateResponse,
    summary="Reset notification template",
    description="Restore a modified template to standard system default wording.",
)
def reset_template_endpoint(
    template_id: UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> NotificationTemplateResponse:
    return reset_template_to_default(
        db,
        actor=current_user,
        template_id=template_id,
    )


# ---------------------------------------------------------------------------
# Audit Logs
# ---------------------------------------------------------------------------

@settings_router.get(
    "/audit-logs",
    response_model=AuditLogListResponse,
    summary="List audit logs",
    description="Retrieve paginated administrative audit trail events.",
)
def list_audit_logs_endpoint(
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    action: Annotated[str | None, Query()] = None,
    resource_type: Annotated[str | None, Query()] = None,
    search: Annotated[str | None, Query()] = None,
) -> AuditLogListResponse:
    return list_audit_logs(
        db,
        page=page,
        page_size=page_size,
        action=action,
        resource_type=resource_type,
        search=search,
    )


# ---------------------------------------------------------------------------
# System Notifications & Broadcast
# ---------------------------------------------------------------------------

@settings_router.get(
    "/notifications",
    response_model=SystemNotificationListResponse,
    summary="List platform-wide notifications",
    description="Admin view of all notifications across the platform.",
)
def list_system_notifications_endpoint(
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    type: Annotated[str | None, Query()] = None,
    is_read: Annotated[bool | None, Query()] = None,
    search: Annotated[str | None, Query()] = None,
) -> SystemNotificationListResponse:
    return list_system_notifications(
        db,
        page=page,
        page_size=page_size,
        type_str=type,
        is_read=is_read,
        search=search,
    )


@settings_router.post(
    "/notifications/broadcast",
    response_model=BroadcastNotificationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Broadcast system notification",
    description="Dispatch an urgent announcement or notification to all accounts or a targeted user role.",
)
def broadcast_notification_endpoint(
    payload: BroadcastNotificationRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> BroadcastNotificationResponse:
    return dispatch_broadcast_notification(
        db,
        actor=current_user,
        payload=payload,
    )
