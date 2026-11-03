"""Database queries and persistence for conversations and messages."""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, selectinload

from app.modules.conversations.models import (
    Conversation,
    ConversationStatus,
    Message,
)
from app.modules.leads.models import Lead, LeadAssignment
from app.modules.projects.models import Project, ProjectStatus


def _locked(session: Session, statement: Select[object]) -> Select[object]:
    """Apply a row lock when supported by the database dialect."""

    if session.get_bind().dialect.name != "sqlite":
        return statement.with_for_update()
    return statement


def get_conversation_by_id(
    session: Session,
    conversation_id: UUID,
    *,
    for_update: bool = False,
) -> Conversation | None:
    """Return a conversation with lead, project, and buyer eager-loaded."""

    statement = (
        select(Conversation)
        .options(
            selectinload(Conversation.lead).selectinload(Lead.current_assignment),
            selectinload(Conversation.project),
            selectinload(Conversation.buyer),
        )
        .where(Conversation.id == conversation_id)
    )
    if for_update:
        statement = _locked(session, statement)
    return session.scalar(statement)


def _conversation_conditions(
    *,
    buyer_id: UUID | None = None,
    assigned_executive_id: UUID | None = None,
    project_id: UUID | None = None,
    lead_id: UUID | None = None,
    status: ConversationStatus | str | None = None,
    active_project_only: bool = False,
) -> list[object]:
    conditions: list[object] = []

    if buyer_id is not None:
        conditions.append(Conversation.buyer_id == buyer_id)
    if project_id is not None:
        conditions.append(Conversation.project_id == project_id)
    if lead_id is not None:
        conditions.append(Conversation.lead_id == lead_id)
    if status is not None:
        status_val = status.value if isinstance(status, ConversationStatus) else status
        conditions.append(Conversation.status == status_val)
    if assigned_executive_id is not None:
        conditions.append(
            select(LeadAssignment.id)
            .where(
                LeadAssignment.lead_id == Conversation.lead_id,
                LeadAssignment.executive_id == assigned_executive_id,
                LeadAssignment.unassigned_at.is_(None),
            )
            .exists()
        )
    if active_project_only:
        conditions.append(
            Conversation.project_id.in_(
                select(Project.id).where(
                    Project.status == ProjectStatus.ACTIVE.value
                )
            )
        )

    return conditions


def count_conversations(
    session: Session,
    *,
    buyer_id: UUID | None = None,
    assigned_executive_id: UUID | None = None,
    project_id: UUID | None = None,
    lead_id: UUID | None = None,
    status: ConversationStatus | str | None = None,
    active_project_only: bool = False,
) -> int:
    """Count matching conversations for pagination."""

    conditions = _conversation_conditions(
        buyer_id=buyer_id,
        assigned_executive_id=assigned_executive_id,
        project_id=project_id,
        lead_id=lead_id,
        status=status,
        active_project_only=active_project_only,
    )
    statement = (
        select(func.count())
        .select_from(Conversation)
        .where(*conditions)
    )
    return session.scalar(statement) or 0


def list_conversations(
    session: Session,
    *,
    offset: int,
    limit: int,
    buyer_id: UUID | None = None,
    assigned_executive_id: UUID | None = None,
    project_id: UUID | None = None,
    lead_id: UUID | None = None,
    status: ConversationStatus | str | None = None,
    active_project_only: bool = False,
    newest_first: bool = True,
) -> list[Conversation]:
    """Return a bounded page of conversations."""

    conditions = _conversation_conditions(
        buyer_id=buyer_id,
        assigned_executive_id=assigned_executive_id,
        project_id=project_id,
        lead_id=lead_id,
        status=status,
        active_project_only=active_project_only,
    )
    order = (
        Conversation.created_at.desc()
        if newest_first
        else Conversation.created_at.asc()
    )
    statement = (
        select(Conversation)
        .options(
            selectinload(Conversation.lead).selectinload(Lead.current_assignment),
            selectinload(Conversation.project),
            selectinload(Conversation.buyer),
        )
        .where(*conditions)
        .order_by(order, Conversation.id)
        .offset(offset)
        .limit(limit)
    )
    return list(session.scalars(statement).all())


def get_message_by_id(
    session: Session,
    message_id: UUID,
    *,
    for_update: bool = False,
) -> Message | None:
    """Return an individual message by primary key."""

    statement = select(Message).where(Message.id == message_id)
    if for_update:
        statement = _locked(session, statement)
    return session.scalar(statement)


def count_messages(session: Session, conversation_id: UUID) -> int:
    """Count messages in a given conversation."""

    statement = (
        select(func.count())
        .select_from(Message)
        .where(Message.conversation_id == conversation_id)
    )
    return session.scalar(statement) or 0


def list_messages(
    session: Session,
    *,
    conversation_id: UUID,
    offset: int,
    limit: int,
    order: Literal["asc", "desc"] = "asc",
) -> list[Message]:
    """Return a page of messages for a conversation."""

    created_order = (
        Message.created_at.asc() if order == "asc" else Message.created_at.desc()
    )
    statement = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(created_order, Message.id)
        .offset(offset)
        .limit(limit)
    )
    return list(session.scalars(statement).all())

