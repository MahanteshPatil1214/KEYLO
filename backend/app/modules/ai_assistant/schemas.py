"""Pydantic schemas for the AI Assistant chat endpoints."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.conversations.schemas import MessageResponse


class ChatMessageRequest(BaseModel):
    """Input payload for chatting within a specific conversation."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    message: str = Field(min_length=1, max_length=10000)

    @field_validator("message", mode="before")
    @classmethod
    def _validate_message(cls, value: object) -> str:
        if not isinstance(value, str):
            raise ValueError("Message must be text.")
        stripped = value.strip()
        if not stripped:
            raise ValueError("Message content cannot be empty.")
        return stripped


class AssistantChatRequest(BaseModel):
    """Input payload for the general assistant chat endpoint."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    conversation_id: UUID
    message: str = Field(min_length=1, max_length=10000)

    @field_validator("message", mode="before")
    @classmethod
    def _validate_message(cls, value: object) -> str:
        if not isinstance(value, str):
            raise ValueError("Message must be text.")
        stripped = value.strip()
        if not stripped:
            raise ValueError("Message content cannot be empty.")
        return stripped


class ChatResponse(BaseModel):
    """Structured response containing both the saved buyer message and the assistant reply."""

    model_config = ConfigDict(from_attributes=True)

    conversation_id: UUID
    buyer_message: MessageResponse
    assistant_message: MessageResponse
    reply: str

