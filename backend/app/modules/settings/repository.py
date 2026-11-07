"""Database access layer for settings, notification templates, and audit logs."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session

from app.modules.notifications.models import Notification
from app.modules.settings.models import AuditLog, NotificationTemplate, SystemSetting
from app.modules.users.models import User


def get_setting(session: Session, key: str) -> SystemSetting | None:
    """Retrieve a system setting by key."""
    return session.get(SystemSetting, key)


def upsert_setting(
    session: Session,
    *,
    key: str,
    category: str,
    value: dict[str, Any],
    description: str | None = None,
    updated_by_id: UUID | None = None,
) -> SystemSetting:
    """Insert or update a dynamic system setting."""
    setting = session.get(SystemSetting, key)
    if setting is None:
        setting = SystemSetting(
            key=key,
            category=category,
            value=value,
            description=description,
            updated_by_id=updated_by_id,
        )
        session.add(setting)
    else:
        setting.value = value
        if description is not None:
            setting.description = description
        if updated_by_id is not None:
            setting.updated_by_id = updated_by_id
    session.flush()
    return setting


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

def list_templates(session: Session) -> list[NotificationTemplate]:
    """Retrieve all notification templates ordered by name."""
    stmt = select(NotificationTemplate).order_by(NotificationTemplate.name.asc())
    return list(session.scalars(stmt).all())


def get_template_by_id(session: Session, template_id: UUID) -> NotificationTemplate | None:
    """Retrieve a template by unique ID."""
    return session.get(NotificationTemplate, template_id)


def get_template_by_type_channel(
    session: Session,
    type_str: str,
    channel: str = "IN_APP",
) -> NotificationTemplate | None:
    """Retrieve a template by notification type and delivery channel."""
    stmt = select(NotificationTemplate).where(
        NotificationTemplate.type == type_str,
        NotificationTemplate.channel == channel,
    )
    return session.scalars(stmt).first()


def save_template(session: Session, template: NotificationTemplate) -> NotificationTemplate:
    """Persist a new or modified notification template."""
    session.add(template)
    session.flush()
    return template


# ---------------------------------------------------------------------------
# Audit Logs
# ---------------------------------------------------------------------------

def create_audit_log(session: Session, log: AuditLog) -> AuditLog:
    """Append a new audit log record."""
    session.add(log)
    session.flush()
    return log


def list_audit_logs(
    session: Session,
    *,
    offset: int = 0,
    limit: int = 20,
    action: str | None = None,
    resource_type: str | None = None,
    search: str | None = None,
) -> list[AuditLog]:
    """Retrieve filtered, paginated audit logs ordered newest first."""
    stmt = select(AuditLog)

    if action:
        stmt = stmt.where(AuditLog.action == action)
    if resource_type:
        stmt = stmt.where(AuditLog.resource_type == resource_type)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(AuditLog.action).like(term),
                func.lower(AuditLog.actor_name).like(term),
                func.lower(AuditLog.actor_email).like(term),
                func.lower(AuditLog.resource_type).like(term),
            )
        )

    stmt = stmt.order_by(desc(AuditLog.created_at)).offset(offset).limit(limit)
    return list(session.scalars(stmt).all())


def count_audit_logs(
    session: Session,
    *,
    action: str | None = None,
    resource_type: str | None = None,
    search: str | None = None,
) -> int:
    """Count total matching audit log records."""
    stmt = select(func.count(AuditLog.id))

    if action:
        stmt = stmt.where(AuditLog.action == action)
    if resource_type:
        stmt = stmt.where(AuditLog.resource_type == resource_type)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(AuditLog.action).like(term),
                func.lower(AuditLog.actor_name).like(term),
                func.lower(AuditLog.actor_email).like(term),
                func.lower(AuditLog.resource_type).like(term),
            )
        )

    return session.scalar(stmt) or 0


# ---------------------------------------------------------------------------
# System Notifications Query
# ---------------------------------------------------------------------------

def list_system_notifications(
    session: Session,
    *,
    offset: int = 0,
    limit: int = 20,
    type_str: str | None = None,
    is_read: bool | None = None,
    search: str | None = None,
) -> list[Notification]:
    """Retrieve all notifications across the platform ordered newest first."""
    stmt = select(Notification).join(User, Notification.user_id == User.id)

    if type_str and type_str != "ALL":
        stmt = stmt.where(Notification.type == type_str)
    if is_read is not None:
        stmt = stmt.where(Notification.is_read == is_read)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Notification.title).like(term),
                func.lower(Notification.message).like(term),
                func.lower(User.full_name).like(term),
                func.lower(User.email).like(term),
            )
        )

    stmt = stmt.order_by(desc(Notification.created_at)).offset(offset).limit(limit)
    return list(session.scalars(stmt).all())


def count_system_notifications(
    session: Session,
    *,
    type_str: str | None = None,
    is_read: bool | None = None,
    search: str | None = None,
) -> int:
    """Count matching notifications across all users."""
    stmt = select(func.count(Notification.id)).join(User, Notification.user_id == User.id)

    if type_str and type_str != "ALL":
        stmt = stmt.where(Notification.type == type_str)
    if is_read is not None:
        stmt = stmt.where(Notification.is_read == is_read)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Notification.title).like(term),
                func.lower(Notification.message).like(term),
                func.lower(User.full_name).like(term),
                func.lower(User.email).like(term),
            )
        )

    return session.scalar(stmt) or 0
