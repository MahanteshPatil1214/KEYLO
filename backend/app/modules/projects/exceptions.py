"""HTTP exceptions raised by the projects module."""

from __future__ import annotations

from fastapi import HTTPException, status

from app.modules.projects.models import ProjectStatus


class ProjectNotFoundError(HTTPException):
    """The requested project does not exist or is not visible to the caller."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )


class ProjectSlugAlreadyExistsError(HTTPException):
    """A project with the requested slug already exists."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail="A project with this slug already exists.",
        )


class InvalidProjectStatusTransitionError(HTTPException):
    """The requested project status transition is not allowed."""

    def __init__(
        self,
        current: ProjectStatus | str,
        requested: ProjectStatus | str,
    ) -> None:
        current_value = current.value if isinstance(current, ProjectStatus) else current
        requested_value = (
            requested.value if isinstance(requested, ProjectStatus) else requested
        )
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Invalid project status transition from "
                f"{current_value} to {requested_value}."
            ),
        )


class FactNotFoundError(HTTPException):
    """The requested fact does not exist or is not visible to the caller."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fact not found.",
        )
