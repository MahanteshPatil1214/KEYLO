"""Pydantic schemas for conversations and messages."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from app.modules.conversations.models import (
    ConversationStatus,
    MessageSenderType,
    MessageStatus,
)
from app.modules.leads.models import LeadSource
from app.modules.leads.schemas import normalize_email, normalize_phone


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


class ConversationStartRequest(BaseModel):
    """Input to start a conversation for a project in one call.

    Creates a lead (if none exists for this buyer + project) and a
    conversation linked to that project, so a buyer can click "Chat"
    on a project page and immediately begin messaging.
    """

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    project_id: UUID
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, min_length=1, max_length=32)
    source: LeadSource = LeadSource.WEBSITE
    consent_to_contact: bool = True
    initial_message: str | None = Field(default=None, max_length=10000)

    @field_validator("email", mode="before")
    @classmethod
    def _normalize_email(cls, value: object) -> object:
        return normalize_email(value)

    @field_validator("phone", mode="before")
    @classmethod
    def _normalize_phone(cls, value: object) -> object:
        if value is None:
            return None
        if isinstance(value, str):
            stripped = value.strip()
            return normalize_phone(stripped) if stripped else None
        return value

    @model_validator(mode="after")
    def _validate_contact(self) -> ConversationStartRequest:
        if self.email is None and self.phone is None:
            raise ValueError(
                "At least one contact method (email or phone) is required."
            )
        return self


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

