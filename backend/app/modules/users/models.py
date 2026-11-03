"""SQLAlchemy models for roles and users."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Uuid, false, func, true
from sqlalchemy.orm import Mapped, mapped_column, relationship, validates

from app.db.base import Base


class RoleName(StrEnum):
    """Built-in application roles."""

    BUYER = "BUYER"
    SALES_EXECUTIVE = "SALES_EXECUTIVE"
    ADMIN = "ADMIN"


def utcnow() -> datetime:
    """Return the current timezone-aware UTC timestamp."""

    return datetime.now(UTC)


class Role(Base):
    """A role that grants a user a set of application capabilities."""

    __tablename__ = "roles"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    name: Mapped[str] = mapped_column(
        String(32), nullable=False, unique=True, index=True
    )
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        server_default=func.now(),
    )

    users: Mapped[list["User"]] = relationship(back_populates="role")

    @validates("name")
    def _normalize_name(self, _key: str, value: str) -> str:
        return value.strip().upper()


class User(Base):
    """A Keylo account.

    Passwords are represented only by an Argon2 hash. Email addresses are
    normalized to lowercase before they reach the database layer.
    """

    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(
        String(320), nullable=False, unique=True, index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    role_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("roles.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=true()
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=false()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        server_default=func.now(),
        onupdate=utcnow,
    )

    role: Mapped[Role] = relationship(back_populates="users", lazy="joined")

    @validates("email")
    def _normalize_email(self, _key: str, value: str) -> str:
        return value.strip().lower()
