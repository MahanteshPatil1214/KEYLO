"""HTTP endpoints for the AI Assistant chat service."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.ai_assistant.client import GroqClient, get_groq_client
from app.modules.ai_assistant.schemas import (
    AssistantChatRequest,
    ChatMessageRequest,
    ChatResponse,
)
from app.modules.ai_assistant.service import chat
from app.modules.auth.dependencies import CurrentUser

router = APIRouter(tags=["assistant"])


def get_assistant_client() -> GroqClient:
    """Dependency provider for GroqClient, enabling test mocking."""

    return get_groq_client()


@router.post(
    "/conversations/{conversation_id}/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Chat with AI assistant in a conversation",
)
def chat_in_conversation_endpoint(
    conversation_id: UUID,
    payload: ChatMessageRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    groq_client: Annotated[GroqClient, Depends(get_assistant_client)],
) -> ChatResponse:
    """Send a buyer message to the conversation and receive a fact-grounded AI reply."""

    return chat(
        db,
        actor=current_user,
        conversation_id=conversation_id,
        message=payload.message,
        groq_client=groq_client,
    )


@router.post(
    "/assistant/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Post a message to the AI assistant",
)
def assistant_chat_endpoint(
    payload: AssistantChatRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    groq_client: Annotated[GroqClient, Depends(get_assistant_client)],
) -> ChatResponse:
    """Post a message to the AI assistant specifying conversation_id in the body."""

    return chat(
        db,
        actor=current_user,
        conversation_id=payload.conversation_id,
        message=payload.message,
        groq_client=groq_client,
    )
