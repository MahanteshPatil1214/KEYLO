"""HTTP exceptions raised by the conversations module."""

from __future__ import annotations

from fastapi import HTTPException, status


class ConversationNotFoundError(HTTPException):
    """The conversation does not exist or is not visible to the caller."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found.",
        )


class MessageNotFoundError(HTTPException):
    """The message does not exist or is not visible to the caller."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found.",
        )


class EmptyMessageError(HTTPException):
    """Message content cannot be empty or whitespace only."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Message content cannot be empty.",
        )


class InvalidLeadProjectAssociationError(HTTPException):
    """The specified lead does not belong to the specified project."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The specified lead does not belong to the specified project.",
        )


class ConversationInactiveError(HTTPException):
    """Cannot send messages to a closed or archived conversation."""

    def __init__(self, current_status: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot post messages to a {current_status.lower()} conversation.",
        )


class InvalidSenderTypeError(HTTPException):
    """The caller attempted to use an unauthorized sender type."""

    def __init__(self, message: str = "Invalid sender type for your role.") -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=message,
        )


class ConversationOwnershipError(HTTPException):
    """The caller is not the owner of the lead or permitted to start this conversation."""

    def __init__(
        self,
        message: str = "You do not have permission to start a conversation for this lead.",
    ) -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=message,
        )


class LeadNotActiveProjectError(HTTPException):
    """Conversations can only be started for active projects."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conversations can only be created for active projects.",
        )
