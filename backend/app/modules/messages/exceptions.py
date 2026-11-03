"""Message module exceptions."""

from __future__ import annotations

from app.modules.conversations.exceptions import (
    EmptyMessageError,
    InvalidSenderTypeError,
    MessageNotFoundError,
)

__all__ = [
    "EmptyMessageError",
    "InvalidSenderTypeError",
    "MessageNotFoundError",
]

