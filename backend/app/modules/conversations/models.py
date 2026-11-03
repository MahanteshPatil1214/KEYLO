"""SQLAlchemy models for conversations and messages."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.modules.leads.models import Lead
from app.modules.projects.models import Project
from app.modules.users.models import User


class ConversationStatus(StrEnum):
    """Lifecycle states for a conversation."""

    ACTIVE = "ACTIVE"
    CLOSED = "CLOSED"
    ARCHIVED = "ARCHIVED"


class MessageSenderType(StrEnum):
    """Permitted message sender roles."""

    BUYER = "BUYER"
    ASSISTANT = "ASSISTANT"
    SALES_EXECUTIVE = "SALES_EXECUTIVE"
    SYSTEM = "SYSTEM"


class MessageStatus(StrEnum):
    """Delivery and visibility status of a message."""

    SENT = "SENT"
    DELIVERED = "DELIVERED"
    READ = "READ"


def utcnow() -> datetime:
    """Return the current timezone-aware UTC timestamp."""

    return datetime.now(UTC)


def _quoted_values(values: type[StrEnum]) -> str:
    return ", ".join(f"'{value.value}'" for value in values)


class Conversation(Base):
    """A dialogue thread linked to a buyer, lead, and project."""

    __tablename__ = "conversations"
    __table_args__ = (
        CheckConstraint(
            f"status IN ({_quoted_values(ConversationStatus)})",
            name="ck_conversations_status",
        ),
        Index("ix_conversations_buyer_id_created_at", "buyer_id", "created_at"),
        Index("ix_conversations_project_id_created_at", "project_id", "created_at"),
        Index("ix_conversations_lead_id_created_at", "lead_id", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    lead_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("leads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    buyer_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=ConversationStatus.ACTIVE.value,
        server_default=ConversationStatus.ACTIVE.value,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        server_default=func.now(),
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        server_default=func.now(),
        onupdate=utcnow,
    )

    lead: Mapped[Lead] = relationship()
    project: Mapped[Project] = relationship()
    buyer: Mapped[User] = relationship(foreign_keys=[buyer_id])
    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Message.created_at",
    )


class Message(Base):
    """An individual entry within a conversation."""

    __tablename__ = "messages"
    __table_args__ = (
        CheckConstraint(
            f"sender_type IN ({_quoted_values(MessageSenderType)})",
            name="ck_messages_sender_type",
        ),
        CheckConstraint(
            f"status IN ({_quoted_values(MessageStatus)})",
            name="ck_messages_status",
        ),
        CheckConstraint(
            "length(trim(content)) > 0",
            name="ck_messages_content_non_empty",
        ),
        Index(
            "ix_messages_conversation_id_created_at",
            "conversation_id",
            "created_at",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    conversation_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_type: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        index=True,
    )
    sender_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=MessageStatus.SENT.value,
        server_default=MessageStatus.SENT.value,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        server_default=func.now(),
        index=True,
    )

    conversation: Mapped[Conversation] = relationship(back_populates="messages")
    sender: Mapped[User | None] = relationship(foreign_keys=[sender_id])
