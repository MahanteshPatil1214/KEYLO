"""Background reminder scheduling and automated dispatch for site visits."""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.modules.bookings.models import BookingStatus
from app.modules.notifications import repository
from app.modules.notifications.models import NotificationType, utcnow
from app.modules.notifications.service import _as_utc, create_notification

logger = logging.getLogger("keylo.notifications.scheduler")


def process_due_reminders(
    session: Session,
    *,
    now: datetime | None = None,
) -> int:
    """Scan confirmed site visits and dispatch due 24-hour and 2-hour reminders.

    Guarantees:
    - Reminders are only dispatched for bookings in CONFIRMED status.
    - Cancelled, completed, and no-show visits are strictly skipped.
    - Idempotency keys prevent duplicate reminder generation across multiple
      runs or application restarts.
    - Respects buyer contact consent (consent_to_contact: true).
    - Returns the count of newly dispatched reminders.
    """

    current_time = _as_utc(now) if now is not None else utcnow()
    bookings = repository.list_confirmed_upcoming_bookings(session, current_time)

    dispatched_count = 0

    for booking in bookings:
        # Extra safety check: must be confirmed
        if booking.status != BookingStatus.CONFIRMED.value:
            continue

        slot_start = _as_utc(booking.slot.start_time)
        if slot_start <= current_time:
            continue

        time_to_visit = slot_start - current_time
        project_name = (
            booking.project.name if getattr(booking, "project", None) else "the property"
        )
        lead_name = (
            booking.lead.full_name if getattr(booking, "lead", None) else "Buyer"
        )
        slot_str = slot_start.strftime("%Y-%m-%d %H:%M UTC")

        # Buyer consent check
        buyer_consent = (
            booking.lead.consent_to_contact and not booking.lead.opted_out
            if getattr(booking, "lead", None) is not None
            else True
        )

        # -------------------------------------------------------------------
        # 1. 24-Hour Reminder Window (<= 24h before start)
        # -------------------------------------------------------------------
        if time_to_visit <= timedelta(hours=24):
            # Buyer reminder
            if booking.buyer_id and buyer_consent:
                key_24h_buyer = f"reminder_24h_{booking.id}_{booking.buyer_id}"
                existing = repository.get_notification_by_idempotency_key(
                    session, key_24h_buyer
                )
                if existing is None:
                    create_notification(
                        session,
                        user_id=booking.buyer_id,
                        type=NotificationType.VISIT_REMINDER_24H,
                        title="Site Visit Reminder: Tomorrow",
                        message=(
                            f"Reminder: Your scheduled site visit for {project_name} "
                            f"is tomorrow at {slot_str}."
                        ),
                        idempotency_key=key_24h_buyer,
                        lead_id=booking.lead_id,
                        booking_id=booking.id,
                        project_id=booking.project_id,
                    )
                    dispatched_count += 1

            # Sales Executive reminder
            if booking.executive_id:
                key_24h_exec = f"reminder_24h_{booking.id}_{booking.executive_id}"
                existing = repository.get_notification_by_idempotency_key(
                    session, key_24h_exec
                )
                if existing is None:
                    create_notification(
                        session,
                        user_id=booking.executive_id,
                        type=NotificationType.VISIT_REMINDER_24H,
                        title="Upcoming Site Visit Tomorrow",
                        message=(
                            f"Reminder: You have a scheduled site visit with {lead_name} "
                            f"for {project_name} tomorrow at {slot_str}."
                        ),
                        idempotency_key=key_24h_exec,
                        lead_id=booking.lead_id,
                        booking_id=booking.id,
                        project_id=booking.project_id,
                    )
                    dispatched_count += 1

        # -------------------------------------------------------------------
        # 2. 2-Hour Reminder Window (<= 2h before start)
        # -------------------------------------------------------------------
        if time_to_visit <= timedelta(hours=2):
            # Buyer reminder
            if booking.buyer_id and buyer_consent:
                key_2h_buyer = f"reminder_2h_{booking.id}_{booking.buyer_id}"
                existing = repository.get_notification_by_idempotency_key(
                    session, key_2h_buyer
                )
                if existing is None:
                    create_notification(
                        session,
                        user_id=booking.buyer_id,
                        type=NotificationType.VISIT_REMINDER_2H,
                        title="Site Visit in 2 Hours",
                        message=(
                            f"Reminder: Your site visit for {project_name} starts "
                            f"in 2 hours ({slot_str}). Our team looks forward to welcoming you!"
                        ),
                        idempotency_key=key_2h_buyer,
                        lead_id=booking.lead_id,
                        booking_id=booking.id,
                        project_id=booking.project_id,
                    )
                    dispatched_count += 1

            # Sales Executive reminder
            if booking.executive_id:
                key_2h_exec = f"reminder_2h_{booking.id}_{booking.executive_id}"
                existing = repository.get_notification_by_idempotency_key(
                    session, key_2h_exec
                )
                if existing is None:
                    create_notification(
                        session,
                        user_id=booking.executive_id,
                        type=NotificationType.VISIT_REMINDER_2H,
                        title="Site Visit in 2 Hours",
                        message=(
                            f"Reminder: Your site visit with {lead_name} for "
                            f"{project_name} begins in 2 hours at {slot_str}."
                        ),
                        idempotency_key=key_2h_exec,
                        lead_id=booking.lead_id,
                        booking_id=booking.id,
                        project_id=booking.project_id,
                    )
                    dispatched_count += 1

    session.commit()
    return dispatched_count


class ReminderScheduler:
    """Asynchronous background scheduler for periodic site visit reminders."""

    def __init__(self, poll_interval_seconds: int = 60) -> None:
        self.poll_interval = poll_interval_seconds
        self._task: asyncio.Task[None] | None = None
        self._running = False

    def start(self) -> None:
        """Start the background reminder loop if not already running."""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info(
            "Site visit reminder scheduler started (poll_interval=%ds)",
            self.poll_interval,
        )

    async def stop(self) -> None:
        """Stop the background reminder loop."""
        if not self._running:
            return
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Site visit reminder scheduler stopped")

    async def _run_loop(self) -> None:
        while self._running:
            try:
                await asyncio.to_thread(self._run_sync_check)
            except Exception as exc:
                logger.error("Error during scheduled reminder check: %s", exc)

            try:
                await asyncio.sleep(self.poll_interval)
            except asyncio.CancelledError:
                break

    def _run_sync_check(self) -> None:
        with SessionLocal() as session:
            count = process_due_reminders(session)
            if count > 0:
                logger.info("Dispatched %d automated site visit reminders", count)


reminder_scheduler = ReminderScheduler()
