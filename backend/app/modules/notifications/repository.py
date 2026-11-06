"""Database queries for in-app notifications and reminder scheduling."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session, joinedload

from app.modules.bookings.models import Booking, BookingStatus, VisitSlot
from app.modules.notifications.models import Notification, NotificationType


def create_notification(session: Session, notification: Notification) -> Notification:
    """Persist a new notification."""

    session.add(notification)
    session.flush()
    return notification


def get_notification_by_id(
    session: Session,
    notification_id: UUID,
    *,
    for_update: bool = False,
) -> Notification | None:
    """Retrieve a notification by ID."""

    statement = (
        select(Notification)
        .options(
            joinedload(Notification.lead),
            joinedload(Notification.booking),
            joinedload(Notification.handoff),
            joinedload(Notification.project),
        )
        .where(Notification.id == notification_id)
    )
    if for_update:
        # Notification relationships use eager joined loads. A bare FOR UPDATE
        # would try to lock the nullable side of those outer joins, which
        # PostgreSQL rejects, so lock the notifications row explicitly.
        statement = statement.with_for_update(of=Notification)
    return session.scalar(statement)


def get_notification_by_idempotency_key(
    session: Session,
    idempotency_key: str,
) -> Notification | None:
    """Look up an existing notification by its unique idempotency key."""

    statement = select(Notification).where(
        Notification.idempotency_key == idempotency_key
    )
    return session.scalar(statement)


def count_notifications(
    session: Session,
    *,
    user_id: UUID,
    is_read: bool | None = None,
    type: NotificationType | None = None,
) -> int:
    """Count notifications for a user matching filters."""

    statement = (
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == user_id)
    )
    if is_read is not None:
        statement = statement.where(Notification.is_read == is_read)
    if type is not None:
        statement = statement.where(Notification.type == type.value)
    return int(session.scalar(statement) or 0)


def list_notifications(
    session: Session,
    *,
    user_id: UUID,
    offset: int,
    limit: int,
    is_read: bool | None = None,
    type: NotificationType | None = None,
) -> list[Notification]:
    """Retrieve a paginated list of notifications for a user."""

    statement = (
        select(Notification)
        .options(
            joinedload(Notification.lead),
            joinedload(Notification.booking),
            joinedload(Notification.handoff),
            joinedload(Notification.project),
        )
        .where(Notification.user_id == user_id)
    )
    if is_read is not None:
        statement = statement.where(Notification.is_read == is_read)
    if type is not None:
        statement = statement.where(Notification.type == type.value)

    statement = (
        statement.order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(session.scalars(statement).unique().all())


def count_unread(session: Session, user_id: UUID) -> int:
    """Return count of unread notifications for a user."""

    statement = (
        select(func.count())
        .select_from(Notification)
        .where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
    )
    return int(session.scalar(statement) or 0)


def mark_as_read(
    session: Session,
    notification: Notification,
    read_at: datetime,
) -> Notification:
    """Mark a single notification as read."""

    notification.is_read = True
    notification.read_at = read_at
    notification.updated_at = read_at
    session.flush()
    return notification


def mark_all_as_read(
    session: Session,
    user_id: UUID,
    read_at: datetime,
) -> int:
    """Mark all unread notifications for a user as read."""

    statement = (
        update(Notification)
        .where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        .values(
            is_read=True,
            read_at=read_at,
            updated_at=read_at,
        )
    )
    result = session.execute(statement)
    return int(result.rowcount or 0)


def list_confirmed_upcoming_bookings(
    session: Session,
    now: datetime,
) -> list[Booking]:
    """Return confirmed upcoming bookings eligible for visit reminders."""

    statement = (
        select(Booking)
        .join(VisitSlot, VisitSlot.id == Booking.slot_id)
        .options(
            joinedload(Booking.slot),
            joinedload(Booking.lead),
            joinedload(Booking.project),
            joinedload(Booking.buyer),
            joinedload(Booking.executive),
        )
        .where(
            Booking.status == BookingStatus.CONFIRMED.value,
            VisitSlot.start_time > now,
        )
        .order_by(VisitSlot.start_time.asc())
    )
    return list(session.scalars(statement).unique().all())
