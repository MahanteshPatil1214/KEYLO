"""Lead intake, duplicate detection, assignment, and lifecycle logic."""

from __future__ import annotations

import hashlib
from threading import Lock
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.leads import repository
from app.modules.leads.exceptions import (
    DuplicateLeadError,
    InvalidBudgetRangeError,
    InvalidLeadExecutiveError,
    InvalidLeadStatusTransitionError,
    LeadAssignmentConflictError,
    LeadConsentRequiredError,
    LeadFieldAccessDeniedError,
    LeadNotFoundError,
)
from app.modules.leads.models import (
    Lead,
    LeadAssignment,
    LeadSource,
    LeadStatus,
    utcnow,
)
from app.modules.leads.schemas import (
    DuplicateCheckResponse,
    LeadAssignmentListResponse,
    LeadAssignmentResponse,
    LeadAssignRequest,
    LeadCreateRequest,
    LeadListResponse,
    LeadResponse,
    LeadStatusUpdateRequest,
    LeadUpdateRequest,
)
from app.modules.projects.exceptions import ProjectNotFoundError
from app.modules.projects.models import ProjectStatus
from app.modules.projects.repository import get_project_by_id
from app.modules.users import repository as users_repository
from app.modules.users.exceptions import InsufficientPermissionsError
from app.modules.users.models import RoleName, User

_ALLOWED_STATUS_TRANSITIONS: dict[LeadStatus, frozenset[LeadStatus]] = {
    LeadStatus.NEW: frozenset(
        {
            LeadStatus.CONTACTED,
            LeadStatus.QUALIFIED,
            LeadStatus.NOT_INTERESTED,
            LeadStatus.LOST,
        }
    ),
    LeadStatus.CONTACTED: frozenset(
        {
            LeadStatus.QUALIFIED,
            LeadStatus.NOT_INTERESTED,
            LeadStatus.VISIT_BOOKED,
            LeadStatus.LOST,
        }
    ),
    LeadStatus.QUALIFIED: frozenset(
        {
            LeadStatus.VISIT_BOOKED,
            LeadStatus.NOT_INTERESTED,
            LeadStatus.LOST,
        }
    ),
    LeadStatus.VISIT_BOOKED: frozenset(
        {
            LeadStatus.VISITED,
            LeadStatus.VISIT_CANCELLED,
            LeadStatus.NOT_INTERESTED,
            LeadStatus.LOST,
        }
    ),
    LeadStatus.VISIT_CANCELLED: frozenset(
        {
            LeadStatus.VISIT_BOOKED,
            LeadStatus.NOT_INTERESTED,
            LeadStatus.LOST,
        }
    ),
    LeadStatus.VISITED: frozenset(
        {
            LeadStatus.CONVERTED,
            LeadStatus.NOT_INTERESTED,
            LeadStatus.LOST,
        }
    ),
    LeadStatus.CONVERTED: frozenset(),
    LeadStatus.NOT_INTERESTED: frozenset(),
    LeadStatus.LOST: frozenset(),
}

_CONTACT_REQUIRING_STATUSES = frozenset(
    {
        LeadStatus.CONTACTED,
        LeadStatus.QUALIFIED,
        LeadStatus.VISIT_BOOKED,
        LeadStatus.VISITED,
        LeadStatus.CONVERTED,
    }
)

_SALES_ADMIN_ONLY_FIELDS = frozenset({"project_id", "source"})
_LEAD_MANAGER_ROLES = frozenset(
    {RoleName.ADMIN.value, RoleName.SALES_EXECUTIVE.value}
)


def _is_admin(user: User) -> bool:
    return user.role.name == RoleName.ADMIN.value


def _require_lead_manager(user: User) -> None:
    if user.role.name not in _LEAD_MANAGER_ROLES:
        raise InsufficientPermissionsError()


def _require_admin(user: User) -> None:
    if not _is_admin(user):
        raise InsufficientPermissionsError()


def _pages(total: int, page_size: int) -> int:
    return (total + page_size - 1) // page_size if total else 0


def _project_is_active(session: Session, project_id: UUID) -> None:
    project = get_project_by_id(session, project_id)
    if project is None or project.status != ProjectStatus.ACTIVE.value:
        raise ProjectNotFoundError()


def _advisory_key(prefix: str, value: str) -> int:
    digest = hashlib.blake2b(
        f"{prefix}:{value}".encode(),
        digest_size=8,
    ).digest()
    return int.from_bytes(digest, "big", signed=True)


def _lock_contact_keys(
    session: Session,
    *,
    email: str | None,
    phone: str | None,
) -> None:
    """Serialize duplicate checks for identical contacts on PostgreSQL.

    SQLite, used only by the isolated test suite, has no advisory locks. The
    locks are transaction-scoped and are released on commit or rollback.
    """

    if session.get_bind().dialect.name != "postgresql":
        return

    keys: list[int] = []
    if phone is not None:
        keys.append(_advisory_key("phone", phone))
    if email is not None:
        keys.append(_advisory_key("email", email))
    for key in sorted(set(keys)):
        session.execute(
            text("SELECT pg_advisory_xact_lock(:key)"),
            {"key": key},
        )


def _raise_if_duplicate(
    session: Session,
    *,
    email: str | None,
    phone: str | None,
    exclude_lead_id: UUID | None = None,
) -> None:
    matches, matching_fields = repository.find_duplicate_leads(
        session,
        email=email,
        phone=phone,
        exclude_lead_id=exclude_lead_id,
    )
    if matches:
        raise DuplicateLeadError(
            matching_lead_ids=[match.id for match in matches],
            matching_fields=matching_fields,
        )


def _lead_response(lead: Lead) -> LeadResponse:
    return LeadResponse.model_validate(lead)


def _assignment_response(assignment: LeadAssignment) -> LeadAssignmentResponse:
    return LeadAssignmentResponse.model_validate(assignment)


def _duplicate_summary(
    *,
    matching_lead_ids: list[UUID],
    matching_fields: list[str],
) -> str:
    if not matching_lead_ids:
        return "No existing lead matches the supplied contact information."
    count = len(matching_lead_ids)
    field_text = " and ".join(matching_fields) or "contact"
    noun = "lead" if count == 1 else "leads"
    verb = "matches" if count == 1 else "match"
    return f"{count} existing {noun} {verb} the supplied {field_text}."


def _get_visible_lead(
    session: Session,
    *,
    actor: User,
    lead_id: UUID,
    for_update: bool = False,
) -> Lead:
    """Return a lead only when the caller may manage it.

    Administrators see every lead. Sales executives see only leads actively
    assigned to them on an active project. Hidden records return 404 so their
    existence is not disclosed.
    """

    _require_lead_manager(actor)
    lead = repository.get_lead_by_id(session, lead_id, for_update=for_update)
    if lead is None:
        raise LeadNotFoundError()

    if _is_admin(actor):
        return lead

    if lead.project.status != ProjectStatus.ACTIVE.value:
        raise LeadNotFoundError()
    if (
        lead.current_assignment is None
        or lead.current_assignment.executive_id != actor.id
    ):
        raise LeadNotFoundError()
    return lead


_local_process_contact_lock = Lock()


def create_lead(
    session: Session,
    *,
    payload: LeadCreateRequest,
) -> LeadResponse:
    """Create a public/staff lead after project, budget, and duplicate checks."""

    _project_is_active(session, payload.project_id)
    email_value = str(payload.email) if payload.email is not None else None
    phone_value = payload.phone

    _lock_contact_keys(
        session,
        email=email_value,
        phone=phone_value,
    )
    with _local_process_contact_lock:
        _raise_if_duplicate(
            session,
            email=email_value,
            phone=phone_value,
        )

        lead = Lead(
            full_name=payload.full_name,
            email=email_value,
            phone=phone_value,
            project_id=payload.project_id,
            source=payload.source.value,
            status=LeadStatus.NEW.value,
            budget_min=payload.budget_min,
            budget_max=payload.budget_max,
            preferred_configuration=payload.preferred_configuration,
            consent_to_contact=payload.consent_to_contact,
        )
        session.add(lead)
        try:
            session.commit()
        except IntegrityError:
            session.rollback()
            # The advisory lock normally prevents this race. If a database
            # constraint still fails, surface the duplicate rather than a 500.
            _raise_if_duplicate(
                session,
                email=email_value,
                phone=phone_value,
            )
            raise

        session.refresh(lead)
        return _lead_response(lead)


def check_duplicates(
    session: Session,
    *,
    actor: User,
    email: str | None,
    phone: str | None,
) -> DuplicateCheckResponse:
    """Return safe duplicate references for administrators only."""

    _require_admin(actor)
    matches, matching_fields = repository.find_duplicate_leads(
        session,
        email=email,
        phone=phone,
    )
    matching_ids = [match.id for match in matches]
    return DuplicateCheckResponse(
        duplicate=bool(matching_ids),
        matching_lead_ids=matching_ids,
        matching_fields=matching_fields,  # type: ignore[arg-type]
        summary=_duplicate_summary(
            matching_lead_ids=matching_ids,
            matching_fields=matching_fields,
        ),
    )


def list_leads(
    session: Session,
    *,
    actor: User,
    page: int,
    page_size: int,
    search: str | None = None,
    project_id: UUID | None = None,
    source: LeadSource | None = None,
    status: LeadStatus | None = None,
    assigned_executive_id: UUID | None = None,
    newest_first: bool = True,
) -> LeadListResponse:
    """Return a bounded page of leads visible to the caller."""

    _require_lead_manager(actor)
    search_value = search.strip() if search and search.strip() else None

    if _is_admin(actor):
        active_project_only = False
        executive_filter = assigned_executive_id
    else:
        active_project_only = True
        # Sales executives cannot use the filter to inspect another
        # executive's leads; the filter is clamped to their own identity.
        executive_filter = actor.id

    total = repository.count_leads(
        session,
        search=search_value,
        project_id=project_id,
        source=source,
        status=status,
        assigned_executive_id=executive_filter,
        active_project_only=active_project_only,
    )
    items = repository.list_leads(
        session,
        offset=(page - 1) * page_size,
        limit=page_size,
        search=search_value,
        project_id=project_id,
        source=source,
        status=status,
        assigned_executive_id=executive_filter,
        active_project_only=active_project_only,
        newest_first=newest_first,
    )
    return LeadListResponse(
        items=[_lead_response(lead) for lead in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=_pages(total, page_size),
    )


def get_lead(
    session: Session,
    *,
    actor: User,
    lead_id: UUID,
) -> LeadResponse:
    """Return one lead when the caller is authorized to manage it."""

    lead = _get_visible_lead(session, actor=actor, lead_id=lead_id)
    return _lead_response(lead)


def update_lead(
    session: Session,
    *,
    actor: User,
    lead_id: UUID,
    payload: LeadUpdateRequest,
) -> LeadResponse:
    """Update permitted fields while preserving omitted values."""

    lead = _get_visible_lead(
        session,
        actor=actor,
        lead_id=lead_id,
        for_update=True,
    )
    fields = payload.model_dump(exclude_unset=True)

    if not _is_admin(actor):
        denied = set(fields) & _SALES_ADMIN_ONLY_FIELDS
        if denied:
            raise LeadFieldAccessDeniedError(sorted(denied))

    budget_min = fields.get("budget_min", lead.budget_min)
    budget_max = fields.get("budget_max", lead.budget_max)
    if (
        budget_min is not None
        and budget_max is not None
        and budget_min > budget_max
    ):
        raise InvalidBudgetRangeError()

    new_email = fields.get("email", lead.email)
    new_phone = fields.get("phone", lead.phone)
    if new_email is None and new_phone is None:
        raise ValueError(
            "A lead must retain at least one contact method (email or phone)."
        )
    email_value = str(new_email) if new_email is not None else None

    if new_email != lead.email or new_phone != lead.phone:
        _lock_contact_keys(session, email=email_value, phone=new_phone)
        _raise_if_duplicate(
            session,
            email=email_value,
            phone=new_phone,
            exclude_lead_id=lead.id,
        )

    if "project_id" in fields:
        _project_is_active(session, fields["project_id"])

    changed_fields = {
        name: value
        for name, value in fields.items()
        if getattr(lead, name) != value
    }
    if not changed_fields:
        return _lead_response(lead)

    for name, value in changed_fields.items():
        setattr(lead, name, value)

    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        if changed_fields.keys() & {"email", "phone"}:
            _raise_if_duplicate(
                session,
                email=email_value,
                phone=new_phone,
                exclude_lead_id=lead_id,
            )
        raise

    session.refresh(lead)
    return _lead_response(lead)


def update_lead_status(
    session: Session,
    *,
    actor: User,
    lead_id: UUID,
    payload: LeadStatusUpdateRequest,
) -> LeadResponse:
    """Move a lead through the explicitly supported lifecycle graph."""

    lead = _get_visible_lead(
        session,
        actor=actor,
        lead_id=lead_id,
        for_update=True,
    )
    current = LeadStatus(lead.status)
    requested = payload.status

    if current == requested:
        return _lead_response(lead)

    if requested not in _ALLOWED_STATUS_TRANSITIONS.get(current, frozenset()):
        raise InvalidLeadStatusTransitionError(current, requested)

    if (
        requested in _CONTACT_REQUIRING_STATUSES
        and not lead.consent_to_contact
    ):
        raise LeadConsentRequiredError(requested.value.lower().replace("_", " "))

    lead.status = requested.value
    session.commit()
    session.refresh(lead)
    return _lead_response(lead)


def assign_lead(
    session: Session,
    *,
    actor: User,
    lead_id: UUID,
    payload: LeadAssignRequest,
) -> LeadAssignmentResponse:
    """Assign or reassign a lead, preserving the previous assignment segment."""

    _require_admin(actor)
    lead = repository.get_lead_by_id(session, lead_id, for_update=True)
    if lead is None:
        raise LeadNotFoundError()
    if not lead.consent_to_contact:
        raise LeadConsentRequiredError("lead assignment")

    executive = users_repository.get_user_by_id(session, payload.executive_id)
    if (
        executive is None
        or not executive.is_active
        or executive.role.name != RoleName.SALES_EXECUTIVE.value
    ):
        raise InvalidLeadExecutiveError()

    current = repository.get_active_assignment(
        session,
        lead_id=lead.id,
        for_update=True,
    )
    if current is not None and current.executive_id == executive.id:
        return _assignment_response(current)

    now = utcnow()
    if current is not None:
        # Flush the closing update before inserting the replacement. The
        # partial unique index permits only one active row, and SQLAlchemy's
        # default unit-of-work order emits inserts before updates.
        current.unassigned_at = now
        session.flush()

    assignment = LeadAssignment(
        lead_id=lead.id,
        executive_id=executive.id,
        assigned_by=actor.id,
        assigned_at=now,
    )
    session.add(assignment)
    lead.updated_at = now

    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise LeadAssignmentConflictError()

    session.refresh(assignment)
    return _assignment_response(assignment)


def list_lead_assignments(
    session: Session,
    *,
    actor: User,
    lead_id: UUID,
    page: int,
    page_size: int,
) -> LeadAssignmentListResponse:
    """Return assignment history to admins or the currently assigned executive."""

    _get_visible_lead(session, actor=actor, lead_id=lead_id)
    total = repository.count_assignments(session, lead_id=lead_id)
    items = repository.list_assignments(
        session,
        lead_id=lead_id,
        offset=(page - 1) * page_size,
        limit=page_size,
    )
    return LeadAssignmentListResponse(
        items=[_assignment_response(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=_pages(total, page_size),
    )
