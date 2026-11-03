"""Project and fact-sheet HTTP endpoints."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import AdminUser, CurrentUser
from app.modules.projects.models import FactStatus, ProjectStatus
from app.modules.projects.schemas import (
    FactCreateRequest,
    FactListResponse,
    FactResponse,
    FactUpdateRequest,
    FactVersionListResponse,
    ProjectCreateRequest,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdateRequest,
)
from app.modules.projects.service import (
    approve_fact,
    create_fact,
    create_project,
    get_fact,
    get_project,
    list_fact_versions,
    list_facts,
    list_projects,
    reject_fact,
    update_fact,
    update_project,
)

router = APIRouter()


@router.post(
    "/projects",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["projects"],
    summary="Create a project (admin only)",
)
def create_project_endpoint(
    payload: ProjectCreateRequest,
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> ProjectResponse:
    """Create a project in the requested initial lifecycle state."""

    return create_project(db, actor=admin, payload=payload)


@router.get(
    "/projects",
    response_model=ProjectListResponse,
    tags=["projects"],
    summary="List projects",
)
def list_projects_endpoint(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    project_status: Annotated[
        ProjectStatus | None,
        Query(alias="status", description="Admin-only lifecycle filter."),
    ] = None,
) -> ProjectListResponse:
    """List active projects for buyers/sales and all projects for admins."""

    return list_projects(
        db,
        actor=current_user,
        page=page,
        page_size=page_size,
        status=project_status,
    )


@router.get(
    "/projects/{project_id}",
    response_model=ProjectResponse,
    tags=["projects"],
    summary="Get a project",
)
def get_project_endpoint(
    project_id: UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> ProjectResponse:
    """Return an active project to non-admins; admins may read drafts."""

    return get_project(db, actor=current_user, project_id=project_id)


@router.patch(
    "/projects/{project_id}",
    response_model=ProjectResponse,
    tags=["projects"],
    summary="Update a project (admin only)",
)
def update_project_endpoint(
    project_id: UUID,
    payload: ProjectUpdateRequest,
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> ProjectResponse:
    """Update project details or move it through an allowed status change."""

    return update_project(
        db,
        actor=admin,
        project_id=project_id,
        payload=payload,
    )


@router.post(
    "/projects/{project_id}/facts",
    response_model=FactResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["project-facts"],
    summary="Create a draft fact (admin only)",
)
def create_fact_endpoint(
    project_id: UUID,
    payload: FactCreateRequest,
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> FactResponse:
    """Create an independently editable draft fact."""

    return create_fact(
        db,
        actor=admin,
        project_id=project_id,
        payload=payload,
    )


@router.get(
    "/projects/{project_id}/facts",
    response_model=FactListResponse,
    tags=["project-facts"],
    summary="List project facts",
)
def list_facts_endpoint(
    project_id: UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    fact_status: Annotated[
        FactStatus | None,
        Query(alias="status", description="Admin-only approval filter."),
    ] = None,
    category: Annotated[str | None, Query(max_length=100)] = None,
) -> FactListResponse:
    """List facts; buyers/sales receive approved facts on active projects only."""

    return list_facts(
        db,
        actor=current_user,
        project_id=project_id,
        page=page,
        page_size=page_size,
        status=fact_status,
        category=category,
    )


@router.get(
    "/facts/{fact_id}",
    response_model=FactResponse,
    tags=["project-facts"],
    summary="Get a fact",
)
def get_fact_endpoint(
    fact_id: UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> FactResponse:
    """Return a fact when it is visible to the caller."""

    return get_fact(db, actor=current_user, fact_id=fact_id)


@router.patch(
    "/facts/{fact_id}",
    response_model=FactResponse,
    tags=["project-facts"],
    summary="Edit a fact (admin only)",
)
def update_fact_endpoint(
    fact_id: UUID,
    payload: FactUpdateRequest,
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> FactResponse:
    """Edit a draft fact or stage a reviewed edit on an approved fact."""

    return update_fact(db, actor=admin, fact_id=fact_id, payload=payload)


@router.post(
    "/facts/{fact_id}/approve",
    response_model=FactResponse,
    tags=["project-facts"],
    summary="Approve a fact or publish its staged edit (admin only)",
)
def approve_fact_endpoint(
    fact_id: UUID,
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> FactResponse:
    """Approve a draft or publish the pending edit of an approved fact."""

    return approve_fact(db, actor=admin, fact_id=fact_id)


@router.post(
    "/facts/{fact_id}/reject",
    response_model=FactResponse,
    tags=["project-facts"],
    summary="Reject a fact or discard its staged edit (admin only)",
)
def reject_fact_endpoint(
    fact_id: UUID,
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> FactResponse:
    """Discard pending edits or unpublish an approved fact."""

    return reject_fact(db, actor=admin, fact_id=fact_id)


@router.get(
    "/facts/{fact_id}/versions",
    response_model=FactVersionListResponse,
    tags=["project-facts"],
    summary="List fact version history (admin only)",
)
def list_fact_versions_endpoint(
    fact_id: UUID,
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> FactVersionListResponse:
    """Return an append-only, paginated answer history."""

    return list_fact_versions(
        db,
        actor=admin,
        fact_id=fact_id,
        page=page,
        page_size=page_size,
    )
