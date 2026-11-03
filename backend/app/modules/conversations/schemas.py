"""Pydantic schemas for conversations and messages."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.conversations.models import (
    ConversationStatus,
    MessageSenderType,
    MessageStatus,
)


class ConversationCreateRequest(BaseModel):
    """Input required to initiate a conversation."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    lead_id: UUID
    project_id: UUID
    buyer_id: UUID | None = None
    initial_message: str | None = Field(default=None, max_length=10000)

    @field_validator("initial_message", mode="before")
    @classmethod
    def _validate_initial_message(cls, value: object) -> object:
        if value is None:
            return None
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value


class ConversationStatusUpdateRequest(BaseModel):
    """Input for updating a conversation's status."""

    model_config = ConfigDict(extra="forbid")

    status: ConversationStatus


class ConversationResponse(BaseModel):
    """Detailed representation of a conversation."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lead_id: UUID
    project_id: UUID
    buyer_id: UUID
    status: ConversationStatus
    created_at: datetime
    updated_at: datetime


class ConversationListResponse(BaseModel):
    """Paginated list of conversations."""

    items: list[ConversationResponse]
    total: int
    page: int
    page_size: int
    pages: int


class MessageCreateRequest(BaseModel):
    """Input for creating a message in a conversation."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    content: str = Field(min_length=1, max_length=10000)
    sender_type: MessageSenderType | None = None

    @field_validator("content", mode="before")
    @classmethod
    def _validate_content(cls, value: object) -> str:
        if not isinstance(value, str):
            raise ValueError("Message content must be text.")
        stripped = value.strip()
        if not stripped:
            raise ValueError("Message content cannot be empty.")
        return stripped


class MessageResponse(BaseModel):
    """Representation of an individual message."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    sender_type: MessageSenderType
    sender_id: UUID | None = None
    content: str
    status: MessageStatus
    created_at: datetime


class MessageListResponse(BaseModel):
    """Paginated list of messages for a conversation."""

    items: list[MessageResponse]
    total: int
    page: int
    page_size: int
    pages: int

