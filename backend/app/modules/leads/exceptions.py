"""HTTP exceptions raised by the leads module."""

from __future__ import annotations

from collections.abc import Sequence
from uuid import UUID

from fastapi import HTTPException, status

from app.modules.leads.models import LeadStatus


class LeadNotFoundError(HTTPException):
    """The lead does not exist or is not visible to the caller."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found.",
        )


class DuplicateLeadError(HTTPException):
    """One or both normalized contact values already belong to a lead."""

    def __init__(
        self,
        *,
        matching_lead_ids: Sequence[UUID],
        matching_fields: Sequence[str],
    ) -> None:
        unique_ids = list(dict.fromkeys(matching_lead_ids))
        unique_fields = list(dict.fromkeys(matching_fields))
        field_text = " and ".join(unique_fields) if unique_fields else "contact"
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "duplicate": True,
                "matching_lead_ids": [str(lead_id) for lead_id in unique_ids],
                "matching_fields": unique_fields,
                "summary": (
                    f"An existing lead matches the supplied {field_text}. "
                    "Review the existing record instead of creating a duplicate."
                ),
            },
        )


class InvalidLeadStatusTransitionError(HTTPException):
    """The requested lead status transition is not part of the lifecycle."""

    def __init__(
        self,
        current: LeadStatus | str,
        requested: LeadStatus | str,
    ) -> None:
        current_value = current.value if isinstance(current, LeadStatus) else current
        requested_value = (
            requested.value if isinstance(requested, LeadStatus) else requested
        )
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invalid lead status transition from "
                f"{current_value} to {requested_value}."
            ),
        )


class LeadConsentRequiredError(HTTPException):
    """An operation that may contact the buyer lacks contact consent."""

    def __init__(self, action: str = "this action") -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "The lead has not consented to contact; "
                f"contact consent is required for {action}."
            ),
        )


class InvalidLeadExecutiveError(HTTPException):
    """The selected assignment target is not an active sales executive."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "The selected user is not an active sales executive and cannot "
                "be assigned leads."
            ),
        )


class InvalidBudgetRangeError(HTTPException):
    """The effective minimum budget exceeds the effective maximum budget."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="budget_min must not be greater than budget_max.",
        )


class LeadFieldAccessDeniedError(HTTPException):
    """A sales executive attempted to change an administrator-only field."""

    def __init__(self, fields: Sequence[str]) -> None:
        names = ", ".join(sorted(fields))
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only administrators may change the following lead fields: "
                f"{names}."
            ),
        )


class LeadAssignmentConflictError(HTTPException):
    """Another request changed the lead's active assignment concurrently."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail="The lead assignment changed concurrently. Please retry.",
        )


class LeadCreateRateLimitedError(HTTPException):
    """Best-effort per-process public intake limit was exceeded."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many lead submissions. Please try again shortly.",
            headers={"Retry-After": "60"},
        )
