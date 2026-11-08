"""AI-callable booking tools for the assistant.

These tools wrap the validated booking service so the AI assistant can
check real free slots and book site visits without bypassing capacity,
locking, or authorisation checks.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.auth.dependencies import CurrentUser
from app.modules.bookings import repository as bookings_repository
from app.modules.bookings.models import VisitSlot
from app.modules.bookings.schemas import AvailableSlotResponse, BookingCreateRequest
from app.modules.bookings.service import (
    DuplicateBookingError,
    SlotCapacityExceededError,
    create_booking,
    get_available_slots as svc_get_available_slots,
)
from app.modules.conversations.repository import get_conversation_by_id
from app.modules.leads.repository import get_lead_by_id
from app.modules.users.models import RoleName, User


def _iso(dt: datetime) -> str:
    """Format a datetime as an ISO string for tool results."""
    return dt.astimezone(UTC).isoformat()


def get_available_slots_tool(
    session: Session,
    *,
    project_id: str,
) -> dict[str, Any]:
    """Return genuinely available visit slots for a project.

    Only slots with remaining capacity are returned, so the assistant never
    offers a full slot to a buyer.
    """

    try:
        pid = UUID(project_id)
    except (ValueError, AttributeError):
        return {"ok": False, "error": "invalid project_id", "slots": []}

    response = svc_get_available_slots(
        session,
        actor=None,  # tool calls are system-invoked; access already scoped by conversation
        project_id=pid,
    )

    slots: list[dict[str, Any]] = []
    for slot in response.items:
        slots.append(
            {
                "id": str(slot.id),
                "start_time": _iso(slot.start_time),
                "end_time": _iso(slot.end_time),
                "capacity": slot.capacity,
                "booked_count": slot.booked_count,
                "available_capacity": slot.available_capacity,
                "address": slot.address,
                "latitude": slot.latitude,
                "longitude": slot.longitude,
                "notes": slot.notes,
            }
        )

    return {"ok": True, "slots": slots, "total": len(slots)}


def book_site_visit_tool(
    session: Session,
    *,
    actor: User,
    slot_id: str,
    lead_id: str,
) -> dict[str, Any]:
    """Book a site visit slot for a lead.

    Runs inside the same strict validation as the public booking API:
    row-level lock, capacity recheck, duplicate check, and project match.
    Returns ok=False with a human-readable error on any failure so the
    assistant can explain it to the buyer.
    """

    try:
        sid = UUID(slot_id)
        lid = UUID(lead_id)
    except (ValueError, AttributeError):
        return {"ok": False, "error": "invalid slot_id or lead_id"}

    lead = get_lead_by_id(session, lid)
    if lead is None:
        return {"ok": False, "error": "lead not found"}

    slot = bookings_repository.get_slot_by_id(session, sid)
    if slot is None:
        return {"ok": False, "error": "slot not found"}

    if slot.project_id != lead.project_id:
        return {"ok": False, "error": "slot does not belong to the lead's project"}

    payload = BookingCreateRequest(slot_id=sid, lead_id=lid)

    try:
        booking = create_booking(session, actor=actor, payload=payload)
    except DuplicateBookingError:
        return {"ok": False, "error": "this lead already has an active booking for that slot"}
    except SlotCapacityExceededError:
        return {"ok": False, "error": "the slot is fully booked — please choose another time"}
    except Exception as exc:  # noqa: BLE001 — surface any validation error to the buyer
        return {"ok": False, "error": str(exc)}

    return {
        "ok": True,
        "booking_id": str(booking.id),
        "slot_id": str(booking.slot_id),
        "start_time": _iso(booking.slot.start_time),
        "end_time": _iso(booking.slot.end_time),
        "status": booking.status,
    }


# ---------------------------------------------------------------------------
# Tool schemas for Groq (OpenAI-compatible function calling)
# ---------------------------------------------------------------------------

BOOKING_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_available_slots",
            "description": "Check genuinely available site visit slots for a project. "
            "Only slots with remaining capacity are returned.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_id": {
                        "type": "string",
                        "description": "The project ID to check slots for.",
                    }
                },
                "required": ["project_id"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "book_site_visit",
            "description": "Book a confirmed site visit slot for a lead. "
            "Only call this after confirming the buyer wants this specific slot.",
            "parameters": {
                "type": "object",
                "properties": {
                    "slot_id": {
                        "type": "string",
                        "description": "The ID of the available slot to book.",
                    },
                    "lead_id": {
                        "type": "string",
                        "description": "The ID of the lead/buyer making the booking.",
                    },
                },
                "required": ["slot_id", "lead_id"],
                "additionalProperties": False,
            },
        },
    },
]

# Map tool names to callable implementations.
BOOKING_TOOL_IMPLS: dict[str, Any] = {
    "get_available_slots": get_available_slots_tool,
    "book_site_visit": book_site_visit_tool,
}
