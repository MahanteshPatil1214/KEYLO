"""Database queries and access layer for human handoffs."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.modules.conversations.models import Conversation
from app.modules.handoffs.models import (
    ACTIVE_HANDOFF_STATUSES,
    Handoff,
    HandoffStatus,
)
from app.modules.projects.models import Project, ProjectStatus


def create_handoff(session: Session, handoff: Handoff) -> Handoff:
    """Persist a new human handoff record."""

    session.add(handoff)
    session.flush()
    return handoff


def get_handoff_by_id(
    session: Session,
    handoff_id: UUID,
    *,
    for_update: bool = False,
) -> Handoff | None:
    """Retrieve a handoff by its primary key with eager relationships."""

    statement = (
        select(Handoff)
        .options(
            joinedload(Handoff.conversation),
            joinedload(Handoff.lead),
            joinedload(Handoff.project),
            joinedload(Handoff.executive),
            joinedload(Handoff.created_by),
            joinedload(Handoff.resolved_by),
        )
        .where(Handoff.id == handoff_id)
    )
    if for_update:
        statement = statement.with_for_update(of=Handoff)
    return session.scalar(statement)


def get_active_handoff_by_conversation(
    session: Session,
    conversation_id: UUID,
    *,
    for_update: bool = False,
) -> Handoff | None:
    """Find an active handoff (PENDING, ASSIGNED, IN_PROGRESS) for a conversation."""

    statement = (
        select(Handoff)
        .options(
            joinedload(Handoff.conversation),
            joinedload(Handoff.lead),
            joinedload(Handoff.project),
            joinedload(Handoff.executive),
        )
        .where(
            Handoff.conversation_id == conversation_id,
            Handoff.status.in_(ACTIVE_HANDOFF_STATUSES),
        )
    )
    if for_update:
        statement = statement.with_for_update(of=Handoff)
    return session.scalar(statement)


def _apply_filters(
    statement: select,
    *,
    executive_id: UUID | None = None,
    buyer_id: UUID | None = None,
    project_id: UUID | None = None,
    lead_id: UUID | None = None,
    status: HandoffStatus | None = None,
    active_project_only: bool = False,
) -> select:
    if executive_id is not None:
        statement = statement.where(Handoff.executive_id == executive_id)
    if buyer_id is not None:
        statement = statement.join(
            Conversation, Conversation.id == Handoff.conversation_id
        ).where(Conversation.buyer_id == buyer_id)
    if project_id is not None:
        statement = statement.where(Handoff.project_id == project_id)
    if lead_id is not None:
        statement = statement.where(Handoff.lead_id == lead_id)
    if status is not None:
        statement = statement.where(Handoff.status == status.value)
    if active_project_only:
        statement = statement.join(
            Project, Project.id == Handoff.project_id
        ).where(Project.status == ProjectStatus.ACTIVE.value)
    return statement


def count_handoffs(
    session: Session,
    *,
    executive_id: UUID | None = None,
    buyer_id: UUID | None = None,
    project_id: UUID | None = None,
    lead_id: UUID | None = None,
    status: HandoffStatus | None = None,
    active_project_only: bool = False,
) -> int:
    """Count handoff records matching query filters."""

    statement = select(func.count()).select_from(Handoff)
    statement = _apply_filters(
        statement,
        executive_id=executive_id,
        buyer_id=buyer_id,
        project_id=project_id,
        lead_id=lead_id,
        status=status,
        active_project_only=active_project_only,
    )
    return int(session.scalar(statement) or 0)


def list_handoffs(
    session: Session,
    *,
    offset: int,
    limit: int,
    executive_id: UUID | None = None,
    buyer_id: UUID | None = None,
    project_id: UUID | None = None,
    lead_id: UUID | None = None,
    status: HandoffStatus | None = None,
    active_project_only: bool = False,
) -> list[Handoff]:
    """Return paginated handoffs matching query filters in reverse chronological order."""

    statement = (
        select(Handoff)
        .options(
            joinedload(Handoff.conversation),
            joinedload(Handoff.lead),
            joinedload(Handoff.project),
            joinedload(Handoff.executive),
            joinedload(Handoff.created_by),
            joinedload(Handoff.resolved_by),
        )
    )
    statement = _apply_filters(
        statement,
        executive_id=executive_id,
        buyer_id=buyer_id,
        project_id=project_id,
        lead_id=lead_id,
        status=status,
        active_project_only=active_project_only,
    )
    statement = statement.order_by(Handoff.created_at.desc()).offset(offset).limit(limit)
    return list(session.scalars(statement).unique().all())

