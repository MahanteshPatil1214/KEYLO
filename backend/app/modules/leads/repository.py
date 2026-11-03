"""Database access for leads and assignment history."""

from __future__ import annotations

import re
from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.modules.leads.models import Lead, LeadAssignment, LeadSource, LeadStatus
from app.modules.projects.models import Project, ProjectStatus


def _locked(session: Session, statement: Select[object]) -> Select[object]:
    """Apply a row lock on databases that support it.

    SQLite is used by the isolated test suite and does not support
    ``FOR UPDATE``; PostgreSQL is used in production and does.
    """

    if session.get_bind().dialect.name != "sqlite":
        return statement.with_for_update()
    return statement


def get_lead_by_id(
    session: Session,
    lead_id: UUID,
    *,
    for_update: bool = False,
) -> Lead | None:
    """Return a lead with its current assignment, optionally locked."""

    statement = (
        select(Lead)
        .options(selectinload(Lead.current_assignment))
        .where(Lead.id == lead_id)
    )
    if for_update:
        statement = _locked(session, statement)
    return session.scalar(statement)


def find_duplicate_leads(
    session: Session,
    *,
    email: str | None = None,
    phone: str | None = None,
    exclude_lead_id: UUID | None = None,
) -> tuple[list[Lead], list[str]]:
    """Return exact normalized contact matches and the fields that matched."""

    conditions: list[object] = []
    if phone:
        conditions.append(Lead.phone == phone)
    if email:
        conditions.append(Lead.email == email)
    if not conditions:
        return [], []

    statement = select(Lead).where(or_(*conditions))
    if exclude_lead_id is not None:
        statement = statement.where(Lead.id != exclude_lead_id)

    matches = list(session.scalars(statement).all())
    matching_fields: list[str] = []
    if phone and any(match.phone == phone for match in matches):
        matching_fields.append("phone")
    if email and any(match.email == email for match in matches):
        matching_fields.append("email")
    return matches, matching_fields


def _escape_like(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace("%", "\\%")
        .replace("_", "\\_")
    )


def _lead_conditions(
    *,
    search: str | None,
    project_id: UUID | None,
    source: LeadSource | str | None,
    status: LeadStatus | str | None,
    assigned_executive_id: UUID | None,
    active_project_only: bool,
) -> list[object]:
    conditions: list[object] = []

    if project_id is not None:
        conditions.append(Lead.project_id == project_id)
    if source is not None:
        source_value = source.value if isinstance(source, LeadSource) else source
        conditions.append(Lead.source == source_value)
    if status is not None:
        status_value = status.value if isinstance(status, LeadStatus) else status
        conditions.append(Lead.status == status_value)
    if assigned_executive_id is not None:
        conditions.append(
            select(LeadAssignment.id)
            .where(
                LeadAssignment.lead_id == Lead.id,
                LeadAssignment.executive_id == assigned_executive_id,
                LeadAssignment.unassigned_at.is_(None),
            )
            .exists()
        )
    if active_project_only:
        conditions.append(
            Lead.project_id.in_(
                select(Project.id).where(
                    Project.status == ProjectStatus.ACTIVE.value
                )
            )
        )
    if search:
        escaped = _escape_like(search)
        pattern = f"%{escaped}%"
        search_conditions = [
            Lead.full_name.ilike(pattern, escape="\\"),
            Lead.email.ilike(pattern, escape="\\"),
            Lead.phone.ilike(pattern, escape="\\"),
        ]
        phone_digits = re.sub(r"\D", "", search)
        if len(phone_digits) >= 3 and phone_digits != search:
            search_conditions.append(
                Lead.phone.ilike(f"%{phone_digits}%", escape="\\")
            )
        conditions.append(or_(*search_conditions))

    return conditions


def count_leads(
    session: Session,
    *,
    search: str | None = None,
    project_id: UUID | None = None,
    source: LeadSource | str | None = None,
    status: LeadStatus | str | None = None,
    assigned_executive_id: UUID | None = None,
    active_project_only: bool = False,
) -> int:
    """Count leads matching the same filters used by the listing query."""

    conditions = _lead_conditions(
        search=search,
        project_id=project_id,
        source=source,
        status=status,
        assigned_executive_id=assigned_executive_id,
        active_project_only=active_project_only,
    )
    statement = select(func.count()).select_from(Lead).where(*conditions)
    return session.scalar(statement) or 0


def list_leads(
    session: Session,
    *,
    offset: int,
    limit: int,
    search: str | None = None,
    project_id: UUID | None = None,
    source: LeadSource | str | None = None,
    status: LeadStatus | str | None = None,
    assigned_executive_id: UUID | None = None,
    active_project_only: bool = False,
    newest_first: bool = True,
) -> list[Lead]:
    """Return a bounded, stable page of leads with current assignments."""

    conditions = _lead_conditions(
        search=search,
        project_id=project_id,
        source=source,
        status=status,
        assigned_executive_id=assigned_executive_id,
        active_project_only=active_project_only,
    )
    created_order = Lead.created_at.desc() if newest_first else Lead.created_at.asc()
    statement = (
        select(Lead)
        .options(selectinload(Lead.current_assignment))
        .where(*conditions)
        .order_by(created_order, Lead.id)
        .offset(offset)
        .limit(limit)
    )
    return list(session.scalars(statement).all())


def get_active_assignment(
    session: Session,
    *,
    lead_id: UUID,
    for_update: bool = False,
) -> LeadAssignment | None:
    """Return the single active assignment for a lead, optionally locked."""

    statement = select(LeadAssignment).where(
        LeadAssignment.lead_id == lead_id,
        LeadAssignment.unassigned_at.is_(None),
    )
    if for_update:
        statement = _locked(session, statement)
    return session.scalar(statement)


def count_assignments(session: Session, *, lead_id: UUID) -> int:
    """Count every historical assignment for a lead."""

    return (
        session.scalar(
            select(func.count())
            .select_from(LeadAssignment)
            .where(LeadAssignment.lead_id == lead_id)
        )
        or 0
    )


def list_assignments(
    session: Session,
    *,
    lead_id: UUID,
    offset: int,
    limit: int,
) -> list[LeadAssignment]:
    """Return a newest-first page of a lead's assignment history."""

    statement = (
        select(LeadAssignment)
        .where(LeadAssignment.lead_id == lead_id)
        .order_by(LeadAssignment.assigned_at.desc(), LeadAssignment.id.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(session.scalars(statement).all())
