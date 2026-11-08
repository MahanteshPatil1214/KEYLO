"""Business logic and transaction orchestration for human handoffs."""

from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.conversations import repository as conversations_repository
from app.modules.conversations.exceptions import ConversationNotFoundError
from app.modules.conversations.models import (
    Conversation,
    ConversationStatus,
    MessageSenderType,
)
from app.modules.conversations.service import (
    _get_visible_conversation,
    create_system_message,
)
from app.modules.handoffs import repository
from app.modules.handoffs.exceptions import (
    ActiveHandoffExistsError,
    ConversationClosedError,
    HandoffNotFoundError,
    HandoffOwnershipError,
    InvalidExecutiveError,
    InvalidHandoffStatusTransitionError,
)
from app.modules.handoffs.models import (
    Handoff,
    HandoffReason,
    HandoffStatus,
    utcnow,
)
from app.modules.handoffs.schemas import (
    HandoffAssignRequest,
    HandoffCreateRequest,
    HandoffListResponse,
    HandoffResponse,
    HandoffStatusUpdateRequest,
)
from app.modules.leads.models import Lead
from app.modules.leads.repository import get_lead_by_id
from app.modules.projects.models import ProjectStatus
from app.modules.users import repository as users_repository
from app.modules.users.exceptions import InsufficientPermissionsError
from app.modules.users.models import RoleName, User

logger = logging.getLogger("keylo.handoffs.service")


def _is_admin(user: User) -> bool:
    return user.role.name == RoleName.ADMIN.value


def _require_admin(user: User) -> None:
    if not _is_admin(user):
        raise InsufficientPermissionsError()


def _pages(total: int, page_size: int) -> int:
    return (total + page_size - 1) // page_size if total else 0


def _build_factual_summary(
    session: Session,
    *,
    conversation_id: UUID,
    lead: Lead,
    reason: HandoffReason,
    notes: str | None = None,
) -> str:
    """Generate a strictly factual, concise conversation summary for the executive.

    Extracts actual questions asked by the buyer and recent dialogue history.
    Never assumes, extrapolates, or hallucinates facts.
    """

    messages = conversations_repository.list_messages(
        session,
        conversation_id=conversation_id,
        offset=0,
        limit=20,
        order="asc",
    )

    buyer_questions: list[str] = []
    for msg in messages:
        if msg.sender_type == MessageSenderType.BUYER.value:
            cleaned = msg.content.strip()
            if cleaned and cleaned not in buyer_questions:
                buyer_questions.append(cleaned)

    parts: list[str] = [
        f"Buyer: {lead.full_name}.",
        f"Reason for handoff: {reason.value.replace('_', ' ').title()}.",
    ]

    if buyer_questions:
        recent = buyer_questions[-3:]
        joined_queries = " | ".join(f'"{q}"' for q in recent)
        parts.append(f"Recent buyer inquiries: {joined_queries}.")

    if notes and notes.strip():
        parts.append(f"Additional notes: {notes.strip()}.")

    parts.append(f"Total dialogue messages: {len(messages)}.")
    return " ".join(parts)


def request_handoff(
    session: Session,
    *,
    actor: User,
    payload: HandoffCreateRequest,
) -> HandoffResponse:
    """Create a human handoff for a conversation (Buyer or Admin)."""

    conversation = _get_visible_conversation(
        session, actor=actor, conversation_id=payload.conversation_id, for_update=True
    )

    if conversation.status not in (
        ConversationStatus.ACTIVE.value,
        ConversationStatus.CLOSED.value,
    ):
        raise ConversationClosedError(conversation.status)

    # Prevent duplicate active handoffs
    active_existing = repository.get_active_handoff_by_conversation(
        session, conversation.id
    )
    if active_existing is not None:
        raise ActiveHandoffExistsError()

    now = utcnow()
    lead = conversation.lead

    # Check if lead already has an assigned sales executive
    executive_id: UUID | None = None
    status = HandoffStatus.PENDING.value
    assigned_at = None

    if lead.current_assignment is not None:
        exec_user = users_repository.get_user_by_id(
            session, lead.current_assignment.executive_id
        )
        if exec_user and exec_user.is_active:
            executive_id = exec_user.id
            status = HandoffStatus.ASSIGNED.value
            assigned_at = now

    summary = _build_factual_summary(
        session,
        conversation_id=conversation.id,
        lead=lead,
        reason=payload.reason,
        notes=payload.notes,
    )

    handoff = Handoff(
        conversation_id=conversation.id,
        lead_id=lead.id,
        project_id=conversation.project_id,
        executive_id=executive_id,
        created_by_id=actor.id,
        status=status,
        reason=payload.reason.value,
        summary=summary,
        assigned_at=assigned_at,
        created_at=now,
        updated_at=now,
    )
    repository.create_handoff(session, handoff)

    # Post SYSTEM notification to conversation thread
    create_system_message(
        session,
        conversation_id=conversation.id,
        content="A sales executive has been notified and will follow up with you shortly.",
    )

    session.commit()
    persisted = repository.get_handoff_by_id(session, handoff.id)
    assert persisted is not None
    return HandoffResponse.from_orm_model(persisted)


def create_auto_handoff(
    session: Session,
    *,
    conversation_id: UUID,
    reason: HandoffReason,
    notes: str | None = None,
    notify_conversation: bool = False,
) -> Handoff | None:
    """Internal helper to automatically flag conversations when AI cannot answer.

    Idempotent: if an active handoff already exists, returns it without error.
    """

    conversation = conversations_repository.get_conversation_by_id(
        session, conversation_id, for_update=True
    )
    if conversation is None or conversation.status != ConversationStatus.ACTIVE.value:
        return None

    active_existing = repository.get_active_handoff_by_conversation(
        session, conversation.id
    )
    if active_existing is not None:
        return active_existing

    now = utcnow()
    lead = conversation.lead

    executive_id: UUID | None = None
    status = HandoffStatus.PENDING.value
    assigned_at = None

    if lead.current_assignment is not None:
        exec_user = users_repository.get_user_by_id(
            session, lead.current_assignment.executive_id
        )
        if exec_user and exec_user.is_active:
            executive_id = exec_user.id
            status = HandoffStatus.ASSIGNED.value
            assigned_at = now

    summary = _build_factual_summary(
        session,
        conversation_id=conversation.id,
        lead=lead,
        reason=reason,
        notes=notes,
    )

    handoff = Handoff(
        conversation_id=conversation.id,
        lead_id=lead.id,
        project_id=conversation.project_id,
        executive_id=executive_id,
        created_by_id=None,
        status=status,
        reason=reason.value,
        summary=summary,
        assigned_at=assigned_at,
        created_at=now,
        updated_at=now,
    )
    repository.create_handoff(session, handoff)

    if notify_conversation:
        create_system_message(
            session,
            conversation_id=conversation.id,
            content="A sales executive has been notified and will follow up with you shortly.",
        )

    session.commit()
    return repository.get_handoff_by_id(session, handoff.id)


def _get_visible_handoff(
    session: Session,
    *,
    actor: User,
    handoff_id: UUID,
    for_update: bool = False,
) -> Handoff:
    """Fetch handoff and enforce role-based access isolation."""

    handoff = repository.get_handoff_by_id(session, handoff_id, for_update=for_update)
    if handoff is None:
        raise HandoffNotFoundError()

    if _is_admin(actor):
        return handoff

    if actor.role.name == RoleName.BUYER.value:
        if handoff.conversation.buyer_id != actor.id:
            raise HandoffNotFoundError()
        return handoff

    if actor.role.name == RoleName.SALES_EXECUTIVE.value:
        if handoff.project.status != ProjectStatus.ACTIVE.value:
            raise HandoffNotFoundError()
        if handoff.executive_id != actor.id:
            raise HandoffNotFoundError()
        return handoff

    raise HandoffNotFoundError()


def get_handoff(
    session: Session,
    *,
    actor: User,
    handoff_id: UUID,
) -> HandoffResponse:
    """Retrieve an authorized handoff record."""

    handoff = _get_visible_handoff(session, actor=actor, handoff_id=handoff_id)
    return HandoffResponse.from_orm_model(handoff)


def list_handoffs(
    session: Session,
    *,
    actor: User,
    page: int,
    page_size: int,
    project_id: UUID | None = None,
    lead_id: UUID | None = None,
    status: HandoffStatus | None = None,
    executive_id: UUID | None = None,
) -> HandoffListResponse:
    """Return paginated handoffs matching caller visibility."""

    if _is_admin(actor):
        buyer_filter = None
        executive_filter = executive_id
        active_project_only = False
    elif actor.role.name == RoleName.BUYER.value:
        buyer_filter = actor.id
        executive_filter = None
        active_project_only = False
    elif actor.role.name == RoleName.SALES_EXECUTIVE.value:
        buyer_filter = None
        executive_filter = actor.id
        active_project_only = True
    else:
        return HandoffListResponse(
            items=[], total=0, page=page, page_size=page_size, pages=0
        )

    total = repository.count_handoffs(
        session,
        executive_id=executive_filter,
        buyer_id=buyer_filter,
        project_id=project_id,
        lead_id=lead_id,
        status=status,
        active_project_only=active_project_only,
    )
    items = repository.list_handoffs(
        session,
        offset=(page - 1) * page_size,
        limit=page_size,
        executive_id=executive_filter,
        buyer_id=buyer_filter,
        project_id=project_id,
        lead_id=lead_id,
        status=status,
        active_project_only=active_project_only,
    )
    return HandoffListResponse(
        items=[HandoffResponse.from_orm_model(h) for h in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=_pages(total, page_size),
    )


def assign_handoff(
    session: Session,
    *,
    actor: User,
    handoff_id: UUID,
    payload: HandoffAssignRequest,
) -> HandoffResponse:
    """Assign or reassign a handoff to an active sales executive (Admin only)."""

    _require_admin(actor)

    handoff = repository.get_handoff_by_id(session, handoff_id, for_update=True)
    if handoff is None:
        raise HandoffNotFoundError()

    target_exec = users_repository.get_user_by_id(session, payload.executive_id)
    if target_exec is None or not target_exec.is_active:
        raise InvalidExecutiveError("Assigned user not found or inactive.")
    if target_exec.role.name != RoleName.SALES_EXECUTIVE.value:
        raise InvalidExecutiveError("User must have the SALES_EXECUTIVE role.")

    now = utcnow()
    handoff.executive = target_exec
    handoff.executive_id = target_exec.id
    handoff.assigned_at = now
    if handoff.status == HandoffStatus.PENDING.value:
        handoff.status = HandoffStatus.ASSIGNED.value
    handoff.updated_at = now

    create_system_message(
        session,
        conversation_id=handoff.conversation_id,
        content=f"Sales executive {target_exec.full_name} has been assigned to your inquiry.",
    )

    try:
        from app.modules.notifications.service import notify_handoff_assigned

        notify_handoff_assigned(session, handoff=handoff, executive=target_exec)
    except Exception as exc:
        logger.warning("Could not dispatch handoff assignment notification: %s", exc)

    session.commit()
    refreshed = repository.get_handoff_by_id(session, handoff.id)
    assert refreshed is not None
    return HandoffResponse.from_orm_model(refreshed)


def update_handoff_status(
    session: Session,
    *,
    actor: User,
    handoff_id: UUID,
    payload: HandoffStatusUpdateRequest,
) -> HandoffResponse:
    """Update handoff status (Admin or assigned Sales Executive)."""

    handoff = _get_visible_handoff(
        session, actor=actor, handoff_id=handoff_id, for_update=True
    )

    if actor.role.name == RoleName.BUYER.value:
        raise InsufficientPermissionsError()

    if handoff.status in (
        HandoffStatus.RESOLVED.value,
        HandoffStatus.CANCELLED.value,
    ):
        raise InvalidHandoffStatusTransitionError(
            handoff.status, payload.status.value
        )

    now = utcnow()
    handoff.status = payload.status.value
    handoff.updated_at = now

    if payload.resolution_notes:
        handoff.resolution_notes = payload.resolution_notes

    if payload.status in (HandoffStatus.RESOLVED, HandoffStatus.CANCELLED):
        handoff.resolved_at = now
        handoff.resolved_by_id = actor.id

    try:
        from app.modules.notifications.service import notify_handoff_status_updated

        notify_handoff_status_updated(session, handoff=handoff, actor=actor)
    except Exception as exc:
        logger.warning("Could not dispatch handoff status notification: %s", exc)

    session.commit()
    refreshed = repository.get_handoff_by_id(session, handoff.id)
    assert refreshed is not None
    return HandoffResponse.from_orm_model(refreshed)
