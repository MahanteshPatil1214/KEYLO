"""HTTP and domain exceptions for the AI Assistant module."""

from __future__ import annotations

from fastapi import HTTPException, status


class AIAssistantException(Exception):
    """Base exception for AI Assistant internal failures."""


class GroqNotConfiguredError(AIAssistantException):
    """Raised when the Groq API key is not configured."""


class GroqTimeoutError(AIAssistantException):
    """Raised when the Groq API call times out."""


class GroqRateLimitError(AIAssistantException):
    """Raised when the Groq API rate limit is exceeded."""


class GroqAPIError(AIAssistantException):
    """Raised when the Groq API returns an unhandled error or empty response."""


class EmptyBuyerMessageError(HTTPException):
    """The buyer message was empty or contained only whitespace."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message content cannot be empty.",
        )

