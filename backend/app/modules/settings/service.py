"""Business logic and domain operations for settings, templates, and audit logs."""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.notifications.models import Notification, NotificationType, utcnow
from app.modules.notifications.scheduler import process_due_reminders
from app.modules.settings import repository
from app.modules.settings.models import AuditLog, NotificationTemplate, SettingCategory
from app.modules.settings.schemas import (
    AIAssistantSettings,
    AllSystemSettingsResponse,
    AuditLogListResponse,
    AuditLogResponse,
    BroadcastNotificationRequest,
    BroadcastNotificationResponse,
    LanguageItem,
    LanguageSettings,
    LeadAssignmentSettings,
    NotificationTemplateListResponse,
    NotificationTemplateResponse,
    NotificationTemplateUpdateRequest,
    ReminderSettings,
    SystemNotificationItem,
    SystemNotificationListResponse,
    UpdateAIAssistantSettingsRequest,
    UpdateLanguageSettingsRequest,
    UpdateLeadAssignmentSettingsRequest,
    UpdateReminderSettingsRequest,
)
from app.modules.users.models import RoleName, User

logger = logging.getLogger("keylo.settings.service")


# ---------------------------------------------------------------------------
# Default Configuration Templates & Settings
# ---------------------------------------------------------------------------

DEFAULT_REMINDERS = {
    "enabled_24h": True,
    "enabled_2h": True,
    "channels": ["IN_APP", "SMS", "WHATSAPP"],
    "advance_hours_first": 24,
    "advance_hours_second": 2,
    "notify_buyer": True,
    "notify_executive": True,
    "last_run_at": None,
    "last_run_dispatched_count": 0,
}

DEFAULT_AI_ASSISTANT = {
    "grounding_mode": "STRICT_FACTS_ONLY",
    "default_temperature": 0.2,
    "max_response_tokens": 500,
    "fallback_reply": (
        "Thank you for your message. Our AI assistant is currently unable to "
        "generate a response, but our sales team has received your inquiry and "
        "a sales executive will confirm the details with you shortly."
    ),
    "unconfigured_project_reply": (
        "Thank you for reaching out! Our sales team has received your inquiry and "
        "a sales executive will connect with you shortly with verified project details."
    ),
    "multilingual_auto_detect": True,
}

DEFAULT_LANGUAGES = {
    "languages": [
        {"code": "en", "name": "English", "native_name": "English", "is_default": True, "is_enabled": True},
        {"code": "hi", "name": "Hindi", "native_name": "हिन्दी", "is_default": False, "is_enabled": True},
        {"code": "gu", "name": "Gujarati", "native_name": "ગુજરાતી", "is_default": False, "is_enabled": True},
        {"code": "mr", "name": "Marathi", "native_name": "मराठी", "is_default": False, "is_enabled": False},
    ]
}

DEFAULT_LEAD_ASSIGNMENT = {
    "strategy": "ROUND_ROBIN",
    "working_hours_enabled": True,
    "working_hours_start": "09:00",
    "working_hours_end": "19:00",
    "unreached_sla_hours": 24,
    "auto_reassignment_enabled": True,
    "fallback_executive_id": None,
}

DEFAULT_TEMPLATES_DEFINITIONS: list[dict[str, Any]] = [
    {
        "name": "24-Hour Site Visit Reminder",
        "type": NotificationType.VISIT_REMINDER_24H.value,
        "channel": "IN_APP",
        "title_template": "Site Visit Reminder: Tomorrow at {slot_time}",
        "body_template": "Reminder: Your scheduled site tour for {project_name} is tomorrow at {slot_time}. Please let us know if you need directions.",
        "variables": ["buyer_name", "project_name", "slot_time", "executive_name"],
        "is_active": True,
    },
    {
        "name": "2-Hour Site Visit Reminder",
        "type": NotificationType.VISIT_REMINDER_2H.value,
        "channel": "IN_APP",
        "title_template": "Site Visit in 2 Hours: {project_name}",
        "body_template": "Your site visit for {project_name} starts in 2 hours at {slot_time}. Your sales host {executive_name} will meet you at the site experience center.",
        "variables": ["buyer_name", "project_name", "slot_time", "executive_name"],
        "is_active": True,
    },
    {
        "name": "Lead Assigned to Executive",
        "type": NotificationType.LEAD_ASSIGNED.value,
        "channel": "IN_APP",
        "title_template": "New Lead Assigned: {buyer_name}",
        "body_template": "You have been assigned inquiry {buyer_name} for development {project_name}. First contact SLA is 5 minutes.",
        "variables": ["buyer_name", "project_name", "executive_name", "notes"],
        "is_active": True,
    },
    {
        "name": "Site Visit Booking Confirmed",
        "type": NotificationType.BOOKING_CONFIRMED.value,
        "channel": "IN_APP",
        "title_template": "Site Visit Confirmed: {project_name}",
        "body_template": "Your appointment for {project_name} has been confirmed for {slot_time}. We look forward to hosting you.",
        "variables": ["buyer_name", "project_name", "slot_time", "executive_name"],
        "is_active": True,
    },
    {
        "name": "Site Visit Booking Cancelled",
        "type": NotificationType.BOOKING_CANCELLED.value,
        "channel": "IN_APP",
        "title_template": "Site Visit Cancelled: {project_name}",
        "body_template": "Your scheduled visit for {project_name} at {slot_time} has been cancelled. Please book another slot whenever convenient.",
        "variables": ["buyer_name", "project_name", "slot_time"],
        "is_active": True,
    },
    {
        "name": "Human Handoff Assigned",
        "type": NotificationType.HANDOFF_ASSIGNED.value,
        "channel": "IN_APP",
        "title_template": "AI Chat Handoff: {buyer_name}",
        "body_template": "Buyer {buyer_name} requested assistance during an AI session for {project_name}. Summary: {notes}",
        "variables": ["buyer_name", "project_name", "notes"],
        "is_active": True,
    },
]


def log_admin_action(
    session: Session,
    *,
    actor: User,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    details: dict[str, Any] | None = None,
) -> AuditLog:
    """Record an audit trail event for administrative accountability."""
    log = AuditLog(
        action=action,
        actor_id=actor.id,
        actor_name=actor.full_name,
        actor_email=actor.email,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details or {},
        created_at=utcnow(),
    )
    return repository.create_audit_log(session, log)


def ensure_defaults_seeded(session: Session) -> None:
    """Ensure baseline system settings and notification templates exist."""
    # 1. System Settings
    if repository.get_setting(session, "reminders") is None:
        repository.upsert_setting(
            session,
            key="reminders",
            category=SettingCategory.REMINDERS.value,
            value=DEFAULT_REMINDERS,
            description="Site visit reminder configuration and run records",
        )
    if repository.get_setting(session, "ai_assistant") is None:
        repository.upsert_setting(
            session,
            key="ai_assistant",
            category=SettingCategory.AI_ASSISTANT.value,
            value=DEFAULT_AI_ASSISTANT,
            description="AI assistant grounding boundaries and response settings",
        )
    if repository.get_setting(session, "languages") is None:
        repository.upsert_setting(
            session,
            key="languages",
            category=SettingCategory.LANGUAGES.value,
            value=DEFAULT_LANGUAGES,
            description="Enabled buyer conversation languages",
        )
    if repository.get_setting(session, "lead_assignment") is None:
        repository.upsert_setting(
            session,
            key="lead_assignment",
            category=SettingCategory.LEAD_ASSIGNMENT.value,
            value=DEFAULT_LEAD_ASSIGNMENT,
            description="Automated lead routing and SLA configuration",
        )

    # 2. Templates
    existing_templates = repository.list_templates(session)
    existing_types = {t.type for t in existing_templates}
    for defn in DEFAULT_TEMPLATES_DEFINITIONS:
        if defn["type"] not in existing_types:
            tmpl = NotificationTemplate(
                name=defn["name"],
                type=defn["type"],
                channel=defn["channel"],
                title_template=defn["title_template"],
                body_template=defn["body_template"],
                variables=defn["variables"],
                is_active=defn["is_active"],
            )
            repository.save_template(session, tmpl)

    session.commit()


# ---------------------------------------------------------------------------
# Settings Operations
# ---------------------------------------------------------------------------

def get_all_settings(session: Session) -> AllSystemSettingsResponse:
    """Fetch all grouped system settings, seeding defaults if missing."""
    ensure_defaults_seeded(session)

    rem = repository.get_setting(session, "reminders")
    ai = repository.get_setting(session, "ai_assistant")
    lang = repository.get_setting(session, "languages")
    lead = repository.get_setting(session, "lead_assignment")

    return AllSystemSettingsResponse(
        reminders=ReminderSettings.model_validate(rem.value if rem else DEFAULT_REMINDERS),
        ai_assistant=AIAssistantSettings.model_validate(ai.value if ai else DEFAULT_AI_ASSISTANT),
        languages=LanguageSettings.model_validate(lang.value if lang else DEFAULT_LANGUAGES),
        lead_assignment=LeadAssignmentSettings.model_validate(lead.value if lead else DEFAULT_LEAD_ASSIGNMENT),
    )


def update_reminder_settings(
    session: Session,
    *,
    actor: User,
    payload: UpdateReminderSettingsRequest,
) -> ReminderSettings:
    """Update site-visit reminder configuration and record audit log."""
    ensure_defaults_seeded(session)
    current = repository.get_setting(session, "reminders")
    data = dict(current.value) if current else dict(DEFAULT_REMINDERS)

    changes: dict[str, Any] = {}
    for field, val in payload.model_dump(exclude_unset=True).items():
        if val is not None:
            changes[field] = {"old": data.get(field), "new": val}
            data[field] = val

    updated = repository.upsert_setting(
        session,
        key="reminders",
        category=SettingCategory.REMINDERS.value,
        value=data,
        updated_by_id=actor.id,
    )

    log_admin_action(
        session,
        actor=actor,
        action="UPDATE_REMINDER_SETTINGS",
        resource_type="SETTINGS",
        resource_id="reminders",
        details={"changes": changes},
    )
    session.commit()
    return ReminderSettings.model_validate(updated.value)


def update_ai_settings(
    session: Session,
    *,
    actor: User,
    payload: UpdateAIAssistantSettingsRequest,
) -> AIAssistantSettings:
    """Update AI assistant parameters and record audit log."""
    ensure_defaults_seeded(session)
    current = repository.get_setting(session, "ai_assistant")
    data = dict(current.value) if current else dict(DEFAULT_AI_ASSISTANT)

    changes: dict[str, Any] = {}
    for field, val in payload.model_dump(exclude_unset=True).items():
        if val is not None:
            changes[field] = {"old": data.get(field), "new": val}
            data[field] = val

    updated = repository.upsert_setting(
        session,
        key="ai_assistant",
        category=SettingCategory.AI_ASSISTANT.value,
        value=data,
        updated_by_id=actor.id,
    )

    log_admin_action(
        session,
        actor=actor,
        action="UPDATE_AI_SETTINGS",
        resource_type="SETTINGS",
        resource_id="ai_assistant",
        details={"changes": changes},
    )
    session.commit()
    return AIAssistantSettings.model_validate(updated.value)


def update_language_settings(
    session: Session,
    *,
    actor: User,
    payload: UpdateLanguageSettingsRequest,
) -> LanguageSettings:
    """Update supported languages and default language choice."""
    ensure_defaults_seeded(session)
    data = {"languages": [l.model_dump() for l in payload.languages]}

    updated = repository.upsert_setting(
        session,
        key="languages",
        category=SettingCategory.LANGUAGES.value,
        value=data,
        updated_by_id=actor.id,
    )

    log_admin_action(
        session,
        actor=actor,
        action="UPDATE_LANGUAGES",
        resource_type="SETTINGS",
        resource_id="languages",
        details={"active_codes": [l.code for l in payload.languages if l.is_enabled]},
    )
    session.commit()
    return LanguageSettings.model_validate(updated.value)


def update_lead_assignment_settings(
    session: Session,
    *,
    actor: User,
    payload: UpdateLeadAssignmentSettingsRequest,
) -> LeadAssignmentSettings:
    """Update lead assignment rules and record audit log."""
    ensure_defaults_seeded(session)
    current = repository.get_setting(session, "lead_assignment")
    data = dict(current.value) if current else dict(DEFAULT_LEAD_ASSIGNMENT)

    changes: dict[str, Any] = {}
    for field, val in payload.model_dump(exclude_unset=True).items():
        if val is not None:
            changes[field] = {"old": data.get(field), "new": val}
            data[field] = val

    updated = repository.upsert_setting(
        session,
        key="lead_assignment",
        category=SettingCategory.LEAD_ASSIGNMENT.value,
        value=data,
        updated_by_id=actor.id,
    )

    log_admin_action(
        session,
        actor=actor,
        action="UPDATE_ASSIGNMENT_RULES",
        resource_type="SETTINGS",
        resource_id="lead_assignment",
        details={"changes": changes},
    )
    session.commit()
    return LeadAssignmentSettings.model_validate(updated.value)


def trigger_reminders_scan(
    session: Session,
    *,
    actor: User,
) -> dict[str, Any]:
    """Execute site visit reminders scan manually, update stats, and audit log."""
    ensure_defaults_seeded(session)
    now = utcnow()
    count = process_due_reminders(session, now=now)

    current = repository.get_setting(session, "reminders")
    data = dict(current.value) if current else dict(DEFAULT_REMINDERS)
    data["last_run_at"] = now.isoformat()
    data["last_run_dispatched_count"] = count

    repository.upsert_setting(
        session,
        key="reminders",
        category=SettingCategory.REMINDERS.value,
        value=data,
        updated_by_id=actor.id,
    )

    log_admin_action(
        session,
        actor=actor,
        action="TRIGGER_REMINDERS_SCAN",
        resource_type="NOTIFICATION",
        resource_id=None,
        details={"dispatched_count": count, "timestamp": now.isoformat()},
    )
    session.commit()
    return {"dispatched_count": count, "last_run_at": now.isoformat()}


# ---------------------------------------------------------------------------
# Template Operations
# ---------------------------------------------------------------------------

def list_templates(session: Session) -> NotificationTemplateListResponse:
    """Retrieve all notification templates."""
    ensure_defaults_seeded(session)
    tmpls = repository.list_templates(session)
    items = []
    for t in tmpls:
        items.append(
            NotificationTemplateResponse(
                id=t.id,
                name=t.name,
                type=t.type,
                channel=t.channel,
                title_template=t.title_template,
                body_template=t.body_template,
                variables=t.variables,
                is_active=t.is_active,
                updated_at=t.updated_at,
                updated_by_name=t.updated_by.full_name if t.updated_by else None,
            )
        )
    return NotificationTemplateListResponse(items=items, total=len(items))


def get_template(session: Session, template_id: UUID) -> NotificationTemplateResponse:
    """Retrieve single notification template by ID."""
    tmpl = repository.get_template_by_id(session, template_id)
    if not tmpl:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Notification template not found.")

    return NotificationTemplateResponse(
        id=tmpl.id,
        name=tmpl.name,
        type=tmpl.type,
        channel=tmpl.channel,
        title_template=tmpl.title_template,
        body_template=tmpl.body_template,
        variables=tmpl.variables,
        is_active=tmpl.is_active,
        updated_at=tmpl.updated_at,
        updated_by_name=tmpl.updated_by.full_name if tmpl.updated_by else None,
    )


def update_template(
    session: Session,
    *,
    actor: User,
    template_id: UUID,
    payload: NotificationTemplateUpdateRequest,
) -> NotificationTemplateResponse:
    """Update title, body, or active state for a template."""
    tmpl = repository.get_template_by_id(session, template_id)
    if not tmpl:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Notification template not found.")

    tmpl.title_template = payload.title_template.strip()
    tmpl.body_template = payload.body_template.strip()
    if payload.is_active is not None:
        tmpl.is_active = payload.is_active
    tmpl.updated_by_id = actor.id
    tmpl.updated_at = utcnow()

    repository.save_template(session, tmpl)

    log_admin_action(
        session,
        actor=actor,
        action="UPDATE_TEMPLATE",
        resource_type="TEMPLATE",
        resource_id=str(tmpl.id),
        details={"name": tmpl.name, "type": tmpl.type},
    )
    session.commit()
    session.refresh(tmpl)

    return NotificationTemplateResponse(
        id=tmpl.id,
        name=tmpl.name,
        type=tmpl.type,
        channel=tmpl.channel,
        title_template=tmpl.title_template,
        body_template=tmpl.body_template,
        variables=tmpl.variables,
        is_active=tmpl.is_active,
        updated_at=tmpl.updated_at,
        updated_by_name=actor.full_name,
    )


def reset_template_to_default(
    session: Session,
    *,
    actor: User,
    template_id: UUID,
) -> NotificationTemplateResponse:
    """Reset a modified template back to standard system wording."""
    tmpl = repository.get_template_by_id(session, template_id)
    if not tmpl:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Notification template not found.")

    match_def = next((d for d in DEFAULT_TEMPLATES_DEFINITIONS if d["type"] == tmpl.type), None)
    if match_def:
        tmpl.title_template = match_def["title_template"]
        tmpl.body_template = match_def["body_template"]
        tmpl.is_active = match_def["is_active"]
        tmpl.updated_by_id = actor.id
        tmpl.updated_at = utcnow()
        repository.save_template(session, tmpl)

        log_admin_action(
            session,
            actor=actor,
            action="RESET_TEMPLATE",
            resource_type="TEMPLATE",
            resource_id=str(tmpl.id),
            details={"name": tmpl.name},
        )
        session.commit()
        session.refresh(tmpl)

    return NotificationTemplateResponse(
        id=tmpl.id,
        name=tmpl.name,
        type=tmpl.type,
        channel=tmpl.channel,
        title_template=tmpl.title_template,
        body_template=tmpl.body_template,
        variables=tmpl.variables,
        is_active=tmpl.is_active,
        updated_at=tmpl.updated_at,
        updated_by_name=actor.full_name,
    )


# ---------------------------------------------------------------------------
# Audit Logs
# ---------------------------------------------------------------------------

def list_audit_logs(
    session: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    action: str | None = None,
    resource_type: str | None = None,
    search: str | None = None,
) -> AuditLogListResponse:
    """Retrieve paginated audit logs ordered newest first."""
    offset = (page - 1) * page_size
    items = repository.list_audit_logs(
        session,
        offset=offset,
        limit=page_size,
        action=action,
        resource_type=resource_type,
        search=search,
    )
    total = repository.count_audit_logs(
        session,
        action=action,
        resource_type=resource_type,
        search=search,
    )
    pages = (total + page_size - 1) // page_size if total else 0

    return AuditLogListResponse(
        items=[AuditLogResponse.model_validate(i) for i in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


# ---------------------------------------------------------------------------
# System Notifications & Broadcast
# ---------------------------------------------------------------------------

def list_system_notifications(
    session: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    type_str: str | None = None,
    is_read: bool | None = None,
    search: str | None = None,
) -> SystemNotificationListResponse:
    """Retrieve platform-wide notifications for admin inspection."""
    offset = (page - 1) * page_size
    items = repository.list_system_notifications(
        session,
        offset=offset,
        limit=page_size,
        type_str=type_str,
        is_read=is_read,
        search=search,
    )
    total = repository.count_system_notifications(
        session,
        type_str=type_str,
        is_read=is_read,
        search=search,
    )
    pages = (total + page_size - 1) // page_size if total else 0

    response_items = []
    for n in items:
        user_role = "USER"
        if getattr(n.user, "role", None):
            user_role = (
                n.user.role.name.value
                if hasattr(n.user.role.name, "value")
                else str(n.user.role.name)
            )
        response_items.append(
            SystemNotificationItem(
                id=n.id,
                user_id=n.user_id,
                recipient_name=n.user.full_name if n.user else "Unknown User",
                recipient_email=n.user.email if n.user else "",
                recipient_role=user_role,
                type=n.type,
                title=n.title,
                message=n.message,
                is_read=n.is_read,
                read_at=n.read_at,
                created_at=n.created_at,
            )
        )

    return SystemNotificationListResponse(
        items=response_items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


def dispatch_broadcast_notification(
    session: Session,
    *,
    actor: User,
    payload: BroadcastNotificationRequest,
) -> BroadcastNotificationResponse:
    """Send an in-app system notification to all users or a specific user role."""
    stmt = select(User).where(User.is_active == True)
    if payload.target_role != "ALL":
        # Filter by role name
        stmt = stmt.join(User.role).where(
            User.role.has(name=payload.target_role)
        )

    recipients = list(session.scalars(stmt).all())
    now = utcnow()
    dispatched_count = 0

    for user in recipients:
        notif = Notification(
            user_id=user.id,
            type=NotificationType.SYSTEM.value,
            title=payload.title.strip(),
            message=payload.message.strip(),
            is_read=False,
            created_at=now,
            updated_at=now,
        )
        session.add(notif)
        dispatched_count += 1

    log_admin_action(
        session,
        actor=actor,
        action="BROADCAST_NOTIFICATION",
        resource_type="NOTIFICATION",
        resource_id=None,
        details={
            "title": payload.title,
            "target_role": payload.target_role,
            "recipients_count": dispatched_count,
        },
    )
    session.commit()

    return BroadcastNotificationResponse(
        dispatched_count=dispatched_count,
        message=f"Broadcast notification delivered to {dispatched_count} active accounts.",
    )
