"""HTTP endpoints for conversations and conversation messages."""

from __future__ import annotations

from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import CurrentUser
from app.modules.conversations.models import ConversationStatus
from app.modules.conversations.schemas import (
    ConversationCreateRequest,
    ConversationListResponse,
    ConversationResponse,
    ConversationStatusUpdateRequest,
    MessageCreateRequest,
    MessageListResponse,
    MessageResponse,
)
from app.modules.conversations.service import (
    create_conversation,
    create_message,
    get_conversation,
    list_conversations,
    list_messages,
    update_conversation_status,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post(
    "",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new conversation",
)
def create_conversation_endpoint(
    payload: ConversationCreateRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> ConversationResponse:
    """Initiate a dialogue thread linked to a lead and project."""

    return create_conversation(db, actor=current_user, payload=payload)


@router.get(
    "",
    response_model=ConversationListResponse,
    summary="List conversations",
)
def list_conversations_endpoint(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    project_id: UUID | None = None,
    lead_id: UUID | None = None,
    conversation_status: Annotated[
        ConversationStatus | None,
        Query(alias="status", description="Filter by status."),
    ] = None,
) -> ConversationListResponse:
    """List accessible conversations with pagination and filters."""

    return list_conversations(
        db,
        actor=current_user,
        page=page,
        page_size=page_size,
        project_id=project_id,
        lead_id=lead_id,
        status=conversation_status,
    )


@router.get(
    "/{conversation_id}",
    response_model=ConversationResponse,
    summary="Get conversation detail",
)
def get_conversation_endpoint(
    conversation_id: UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> ConversationResponse:
    """Return a single conversation by ID."""

    return get_conversation(db, actor=current_user, conversation_id=conversation_id)


@router.patch(
    "/{conversation_id}/status",
    response_model=ConversationResponse,
    summary="Update conversation status",
)
def update_conversation_status_endpoint(
    conversation_id: UUID,
    payload: ConversationStatusUpdateRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> ConversationResponse:
    """Change the status of a conversation."""

    return update_conversation_status(
        db,
        actor=current_user,
        conversation_id=conversation_id,
        payload=payload,
    )


@router.post(
    "/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["messages"],
    summary="Send a message to a conversation",
)
def create_message_endpoint(
    conversation_id: UUID,
    payload: MessageCreateRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> MessageResponse:
    """Post a new message in an active conversation."""

    return create_message(
        db,
        actor=current_user,
        conversation_id=conversation_id,
        payload=payload,
    )


@router.get(
    "/{conversation_id}/messages",
    response_model=MessageListResponse,
    tags=["messages"],
    summary="List messages in a conversation",
)
def list_messages_endpoint(
    conversation_id: UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 50,
    order: Annotated[
        Literal["asc", "desc"],
        Query(description="Order by message timestamp."),
    ] = "asc",
) -> MessageListResponse:
    """Return chronological or reverse-chronological message history."""

    return list_messages(
        db,
        actor=current_user,
        conversation_id=conversation_id,
        page=page,
        page_size=page_size,
        order=order,
    )

