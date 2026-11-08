"""Business logic for in-app notifications and event-driven dispatch."""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.bookings.models import Booking
from app.modules.handoffs.models import Handoff
from app.modules.leads.models import Lead
from app.modules.notifications import repository
from app.modules.notifications.exceptions import (
    NotificationNotFoundError,
    NotificationOwnershipError,
)
from app.modules.notifications.models import (
    Notification,
    NotificationType,
    utcnow,
)
from app.modules.notifications.schemas import (
    MarkAllReadResponse,
    NotificationListResponse,
    NotificationResponse,
    UnreadCountResponse,
)
from app.modules.users.models import User

logger = logging.getLogger("keylo.notifications.service")


def _as_utc(dt: datetime) -> datetime:
    """Ensure datetime is timezone-aware UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def _pages(total: int, page_size: int) -> int:
    return (total + page_size - 1) // page_size if total else 0


def create_notification(
    session: Session,
    *,
    user_id: UUID,
    type: NotificationType,
    title: str,
    message: str,
    idempotency_key: str | None = None,
    lead_id: UUID | None = None,
    booking_id: UUID | None = None,
    handoff_id: UUID | None = None,
    project_id: UUID | None = None,
) -> Notification | None:
    """Create an in-app notification with idempotency check.

    If a notification with the given idempotency_key already exists, returns it
    without creating a duplicate.
    """

    if idempotency_key:
        existing = repository.get_notification_by_idempotency_key(
            session, idempotency_key
        )
        if existing is not None:
            return existing

    now = utcnow()
    notification = Notification(
        user_id=user_id,
        type=type.value,
        title=title.strip(),
        message=message.strip(),
        idempotency_key=idempotency_key,
        lead_id=lead_id,
        booking_id=booking_id,
        handoff_id=handoff_id,
        project_id=project_id,
        created_at=now,
        updated_at=now,
    )
    repository.create_notification(session, notification)
    return notification


# ---------------------------------------------------------------------------
# Domain Event Notifiers
# ---------------------------------------------------------------------------


def notify_lead_assigned(
    session: Session,
    *,
    lead: Lead,
    executive: User,
) -> Notification | None:
    """Notify a sales executive upon being assigned a lead."""

    idempotency_key = f"lead_assigned_{lead.id}_{executive.id}"
    project_name = lead.project.name if getattr(lead, "project", None) else "the project"
    title = "New Lead Assigned"
    message = (
        f"You have been assigned to lead {lead.full_name} for {project_name}. "
        f"Contact: {lead.phone or lead.email or 'N/A'}."
    )

    return create_notification(
        session,
        user_id=executive.id,
        type=NotificationType.LEAD_ASSIGNED,
        title=title,
        message=message,
        idempotency_key=idempotency_key,
        lead_id=lead.id,
        project_id=lead.project_id,
    )


def notify_handoff_assigned(
    session: Session,
    *,
    handoff: Handoff,
    executive: User,
) -> Notification | None:
    """Notify a sales executive upon receiving a human handoff escalation."""

    idempotency_key = f"handoff_assigned_{handoff.id}_{executive.id}"
    lead_name = handoff.lead.full_name if getattr(handoff, "lead", None) else "a buyer"
    project_name = handoff.project.name if getattr(handoff, "project", None) else "the project"
    title = "New Handoff Escalation"
    message = (
        f"You have been assigned an escalated inquiry from {lead_name} "
        f"for {project_name}. Reason: {handoff.reason}."
    )

    return create_notification(
        session,
        user_id=executive.id,
        type=NotificationType.HANDOFF_ASSIGNED,
        title=title,
        message=message,
        idempotency_key=idempotency_key,
        lead_id=handoff.lead_id,
        handoff_id=handoff.id,
        project_id=handoff.project_id,
    )


def notify_handoff_status_updated(
    session: Session,
    *,
    handoff: Handoff,
    actor: User,
) -> list[Notification]:
    """Notify relevant stakeholders when a handoff status changes."""

    notifications: list[Notification] = []
    now = utcnow()
    lead_name = handoff.lead.full_name if getattr(handoff, "lead", None) else "Lead"

    # If resolved, notify the handoff creator or buyer
    target_user_id = handoff.created_by_id or (
        handoff.conversation.buyer_id if getattr(handoff, "conversation", None) else None
    )
    if target_user_id and target_user_id != actor.id:
        idempotency_key = f"handoff_status_{handoff.id}_{handoff.status}_{int(now.timestamp())}"
        title = f"Handoff Status: {handoff.status}"
        message = (
            f"The escalated inquiry for {lead_name} is now marked as {handoff.status}."
        )
        if handoff.resolution_notes:
            message += f" Notes: {handoff.resolution_notes}"

        n = create_notification(
            session,
            user_id=target_user_id,
            type=NotificationType.HANDOFF_STATUS_UPDATED,
            title=title,
            message=message,
            idempotency_key=idempotency_key,
            lead_id=handoff.lead_id,
            handoff_id=handoff.id,
            project_id=handoff.project_id,
        )
        if n:
            notifications.append(n)

    return notifications


def notify_booking_confirmed(
    session: Session,
    *,
    booking: Booking,
) -> list[Notification]:
    """Notify the buyer and assigned sales executive of a confirmed site visit."""

    notifications: list[Notification] = []
    project_name = booking.project.name if getattr(booking, "project", None) else "the project"
    slot_time_str = (
        _as_utc(booking.slot.start_time).strftime("%Y-%m-%d %H:%M UTC")
        if getattr(booking, "slot", None)
        else "the scheduled time"
    )

    # 1. Notify Buyer (if consent granted and not opted out)
    if booking.buyer_id and (
        booking.lead is None
        or (booking.lead.consent_to_contact and not booking.lead.opted_out)
    ):
        buyer_idempotency = f"booking_confirmed_{booking.id}_{booking.buyer_id}"
        buyer_title = "Site Visit Confirmed"
        buyer_message = (
            f"Your site visit for {project_name} has been confirmed for {slot_time_str}."
        )
        n1 = create_notification(
            session,
            user_id=booking.buyer_id,
            type=NotificationType.BOOKING_CONFIRMED,
            title=buyer_title,
            message=buyer_message,
            idempotency_key=buyer_idempotency,
            lead_id=booking.lead_id,
            booking_id=booking.id,
            project_id=booking.project_id,
        )
        if n1:
            notifications.append(n1)

    # 2. Notify Assigned Executive
    if booking.executive_id:
        exec_idempotency = f"booking_confirmed_{booking.id}_{booking.executive_id}"
        lead_name = booking.lead.full_name if getattr(booking, "lead", None) else "Buyer"
        exec_title = "New Site Visit Scheduled"
        exec_message = (
            f"A site visit with {lead_name} for {project_name} has been scheduled for {slot_time_str}."
        )
        n2 = create_notification(
            session,
            user_id=booking.executive_id,
            type=NotificationType.BOOKING_CONFIRMED,
            title=exec_title,
            message=exec_message,
            idempotency_key=exec_idempotency,
            lead_id=booking.lead_id,
            booking_id=booking.id,
            project_id=booking.project_id,
        )
        if n2:
            notifications.append(n2)

    return notifications


def notify_booking_cancelled(
    session: Session,
    *,
    booking: Booking,
) -> list[Notification]:
    """Notify the buyer and assigned sales executive of a site visit cancellation."""

    notifications: list[Notification] = []
    project_name = booking.project.name if getattr(booking, "project", None) else "the project"
    slot_time_str = (
        _as_utc(booking.slot.start_time).strftime("%Y-%m-%d %H:%M UTC")
        if getattr(booking, "slot", None)
        else "the scheduled time"
    )

    # 1. Notify Buyer (if consent granted and not opted out)
    if booking.buyer_id and (
        booking.lead is None
        or (booking.lead.consent_to_contact and not booking.lead.opted_out)
    ):
        buyer_idempotency = f"booking_cancelled_{booking.id}_{booking.buyer_id}"
        buyer_title = "Site Visit Cancelled"
        buyer_message = (
            f"Your site visit for {project_name} on {slot_time_str} has been cancelled."
        )
        if booking.cancellation_reason:
            buyer_message += f" Reason: {booking.cancellation_reason}"

        n1 = create_notification(
            session,
            user_id=booking.buyer_id,
            type=NotificationType.BOOKING_CANCELLED,
            title=buyer_title,
            message=buyer_message,
            idempotency_key=buyer_idempotency,
            lead_id=booking.lead_id,
            booking_id=booking.id,
            project_id=booking.project_id,
        )
        if n1:
            notifications.append(n1)

    # 2. Notify Assigned Executive
    if booking.executive_id:
        exec_idempotency = f"booking_cancelled_{booking.id}_{booking.executive_id}"
        lead_name = booking.lead.full_name if getattr(booking, "lead", None) else "Buyer"
        exec_title = "Site Visit Cancelled"
        exec_message = (
            f"The site visit with {lead_name} for {project_name} on {slot_time_str} was cancelled."
        )
        if booking.cancellation_reason:
            exec_message += f" Reason: {booking.cancellation_reason}"

        n2 = create_notification(
            session,
            user_id=booking.executive_id,
            type=NotificationType.BOOKING_CANCELLED,
            title=exec_title,
            message=exec_message,
            idempotency_key=exec_idempotency,
            lead_id=booking.lead_id,
            booking_id=booking.id,
            project_id=booking.project_id,
        )
        if n2:
            notifications.append(n2)

    return notifications


# ---------------------------------------------------------------------------
# Caller In-App Notification APIs
# ---------------------------------------------------------------------------


def get_notification(
    session: Session,
    *,
    actor: User,
    notification_id: UUID,
) -> NotificationResponse:
    """Retrieve an authorized notification detail."""

    notification = repository.get_notification_by_id(session, notification_id)
    if notification is None:
        raise NotificationNotFoundError()
    if notification.user_id != actor.id:
        raise NotificationNotFoundError()

    return NotificationResponse.from_orm_model(notification)


def list_notifications(
    session: Session,
    *,
    actor: User,
    page: int,
    page_size: int,
    is_read: bool | None = None,
    type: NotificationType | None = None,
) -> NotificationListResponse:
    """Return paginated notifications for the authenticated caller."""

    total = repository.count_notifications(
        session,
        user_id=actor.id,
        is_read=is_read,
        type=type,
    )
    items = repository.list_notifications(
        session,
        user_id=actor.id,
        offset=(page - 1) * page_size,
        limit=page_size,
        is_read=is_read,
        type=type,
    )
    return NotificationListResponse(
        items=[NotificationResponse.from_orm_model(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=_pages(total, page_size),
    )


def get_unread_count(
    session: Session,
    *,
    actor: User,
) -> UnreadCountResponse:
    """Return count of unread notifications for the caller."""

    count = repository.count_unread(session, user_id=actor.id)
    return UnreadCountResponse(unread_count=count)


def mark_notification_as_read(
    session: Session,
    *,
    actor: User,
    notification_id: UUID,
) -> NotificationResponse:
    """Mark a single notification owned by caller as read."""

    notification = repository.get_notification_by_id(
        session, notification_id, for_update=True
    )
    if notification is None or notification.user_id != actor.id:
        raise NotificationNotFoundError()

    now = utcnow()
    updated = repository.mark_as_read(session, notification, read_at=now)
    session.commit()
    session.refresh(updated)
    return NotificationResponse.from_orm_model(updated)


def mark_all_notifications_as_read(
    session: Session,
    *,
    actor: User,
) -> MarkAllReadResponse:
    """Mark all unread notifications for caller as read."""

    now = utcnow()
    count = repository.mark_all_as_read(session, user_id=actor.id, read_at=now)
    session.commit()
    return MarkAllReadResponse(updated_count=count)
