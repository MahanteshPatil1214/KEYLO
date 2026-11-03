"""Database access for projects, facts, and fact versions."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.modules.projects.models import (
    FactStatus,
    FactVersion,
    Project,
    ProjectFact,
    ProjectStatus,
)


def _locked(session: Session, statement: Select[object]) -> Select[object]:
    """Apply a row lock on databases that support it.

    SQLite is used by the isolated test suite and does not support
    ``FOR UPDATE``; PostgreSQL is used in production and does.
    """

    if session.get_bind().dialect.name != "sqlite":
        return statement.with_for_update()
    return statement


def get_project_by_id(
    session: Session,
    project_id: UUID,
    *,
    for_update: bool = False,
) -> Project | None:
    """Return a project by ID, optionally locking its row."""

    statement = select(Project).where(Project.id == project_id)
    if for_update:
        statement = _locked(session, statement)
    return session.scalar(statement)


def get_project_by_slug(session: Session, slug: str) -> Project | None:
    """Return a project by normalized slug."""

    return session.scalar(select(Project).where(Project.slug == slug))


def count_projects(session: Session, *, status: str | None = None) -> int:
    """Count projects, optionally constrained to one lifecycle state."""

    statement = select(func.count()).select_from(Project)
    if status is not None:
        statement = statement.where(Project.status == status)
    return session.scalar(statement) or 0


def list_projects(
    session: Session,
    *,
    offset: int,
    limit: int,
    status: str | None = None,
) -> list[Project]:
    """Return a stable page of projects."""

    statement = select(Project)
    if status is not None:
        statement = statement.where(Project.status == status)
    statement = (
        statement.order_by(Project.created_at.desc(), Project.id)
        .offset(offset)
        .limit(limit)
    )
    return list(session.scalars(statement).all())


def get_fact_by_id(
    session: Session,
    fact_id: UUID,
    *,
    for_update: bool = False,
) -> ProjectFact | None:
    """Return a fact by ID, optionally locking its row."""

    statement = select(ProjectFact).where(ProjectFact.id == fact_id)
    if for_update:
        statement = _locked(session, statement)
    return session.scalar(statement)


def count_facts(
    session: Session,
    *,
    project_id: UUID,
    status: str | None = None,
    category: str | None = None,
    project_status: str | None = None,
) -> int:
    """Count facts belonging to a project with optional filters."""

    statement = (
        select(func.count())
        .select_from(ProjectFact)
        .where(ProjectFact.project_id == project_id)
    )
    if project_status is not None:
        statement = statement.join(
            Project, Project.id == ProjectFact.project_id
        ).where(Project.status == project_status)
    if status is not None:
        statement = statement.where(ProjectFact.status == status)
    if category is not None:
        statement = statement.where(ProjectFact.category == category)
    return session.scalar(statement) or 0


def list_facts(
    session: Session,
    *,
    project_id: UUID,
    offset: int,
    limit: int,
    status: str | None = None,
    category: str | None = None,
    project_status: str | None = None,
) -> list[ProjectFact]:
    """Return a stable page of facts for one project."""

    statement = select(ProjectFact).where(ProjectFact.project_id == project_id)
    if project_status is not None:
        statement = statement.join(
            Project, Project.id == ProjectFact.project_id
        ).where(Project.status == project_status)
    if status is not None:
        statement = statement.where(ProjectFact.status == status)
    if category is not None:
        statement = statement.where(ProjectFact.category == category)
    statement = (
        statement.order_by(
            ProjectFact.category.asc(),
            ProjectFact.created_at.asc(),
            ProjectFact.id,
        )
        .offset(offset)
        .limit(limit)
    )
    return list(session.scalars(statement).all())


def list_approved_facts(
    session: Session,
    *,
    project_id: UUID,
    category: str | None = None,
) -> list[ProjectFact]:
    """Return approved facts only when their project is active."""

    statement = (
        select(ProjectFact)
        .join(Project, Project.id == ProjectFact.project_id)
        .where(
            ProjectFact.project_id == project_id,
            ProjectFact.status == FactStatus.APPROVED.value,
            Project.status == ProjectStatus.ACTIVE.value,
        )
    )
    if category is not None:
        statement = statement.where(ProjectFact.category == category)
    statement = statement.order_by(
        ProjectFact.category.asc(),
        ProjectFact.created_at.asc(),
        ProjectFact.id,
    )
    return list(session.scalars(statement).all())


def get_latest_version_number(session: Session, fact_id: UUID) -> int:
    """Return the highest version number recorded for a fact, or zero."""

    value = session.scalar(
        select(func.max(FactVersion.version_number)).where(
            FactVersion.fact_id == fact_id
        )
    )
    return int(value or 0)


def count_fact_versions(session: Session, *, fact_id: UUID) -> int:
    """Count historical versions for a fact."""

    return (
        session.scalar(
            select(func.count())
            .select_from(FactVersion)
            .where(FactVersion.fact_id == fact_id)
        )
        or 0
    )


def list_fact_versions(
    session: Session,
    *,
    fact_id: UUID,
    offset: int,
    limit: int,
) -> list[FactVersion]:
    """Return a chronological page of a fact's versions."""

    statement = (
        select(FactVersion)
        .where(FactVersion.fact_id == fact_id)
        .order_by(FactVersion.version_number.asc())
        .offset(offset)
        .limit(limit)
    )
    return list(session.scalars(statement).all())
