"""Project and fact-sheet business logic."""

from __future__ import annotations

import re
import unicodedata
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.projects import repository
from app.modules.projects.exceptions import (
    FactNotFoundError,
    InvalidProjectStatusTransitionError,
    ProjectNotFoundError,
    ProjectSlugAlreadyExistsError,
)
from app.modules.projects.models import (
    FactStatus,
    FactVersion,
    Project,
    ProjectFact,
    ProjectStatus,
)
from app.modules.projects.schemas import (
    ApprovedFactContent,
    FactCreateRequest,
    FactListResponse,
    FactResponse,
    FactUpdateRequest,
    FactVersionListResponse,
    FactVersionResponse,
    PendingFactChanges,
    ProjectCreateRequest,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdateRequest,
    normalize_category,
    normalize_slug,
)
from app.modules.users.exceptions import InsufficientPermissionsError
from app.modules.users.models import RoleName, User

_ALLOWED_PROJECT_TRANSITIONS: dict[ProjectStatus, frozenset[ProjectStatus]] = {
    ProjectStatus.DRAFT: frozenset(
        {ProjectStatus.DRAFT, ProjectStatus.ACTIVE, ProjectStatus.INACTIVE}
    ),
    ProjectStatus.ACTIVE: frozenset(
        {ProjectStatus.ACTIVE, ProjectStatus.INACTIVE}
    ),
    ProjectStatus.INACTIVE: frozenset(
        {ProjectStatus.INACTIVE, ProjectStatus.ACTIVE}
    ),
}


def _is_admin(user: User) -> bool:
    return user.role.name == RoleName.ADMIN.value


def _require_admin(user: User) -> None:
    if not _is_admin(user):
        raise InsufficientPermissionsError()


def _status_value(value: ProjectStatus | str) -> str:
    return value.value if isinstance(value, ProjectStatus) else str(value)


def _pages(total: int, page_size: int) -> int:
    return (total + page_size - 1) // page_size if total else 0


def _slugify(name: str) -> str:
    """Build a URL-safe base slug from a project name."""

    ascii_name = (
        unicodedata.normalize("NFKD", name)
        .encode("ascii", "ignore")
        .decode("ascii")
    )
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_name.lower()).strip("-")
    return (slug[:240].strip("-") or "project")


def _unique_generated_slug(session: Session, name: str) -> str:
    """Return an unused generated slug, adding a numeric suffix if needed."""

    base = _slugify(name)
    candidate = base
    suffix = 2
    while repository.get_project_by_slug(session, candidate) is not None:
        candidate = f"{base[:240].rstrip('-')}-{suffix}"
        suffix += 1
    return candidate


def _project_response(project: Project) -> ProjectResponse:
    return ProjectResponse.model_validate(project)


def _fact_response(fact: ProjectFact, *, include_internal: bool) -> FactResponse:
    pending_changes: PendingFactChanges | None = None
    if include_internal and fact.pending_answer is not None:
        pending_changes = PendingFactChanges(
            category=fact.pending_category or fact.category,
            question=fact.pending_question or fact.question,
            answer=fact.pending_answer,
        )

    return FactResponse(
        id=fact.id,
        project_id=fact.project_id,
        category=fact.category,
        question=fact.question,
        answer=fact.answer,
        status=FactStatus(fact.status),
        updated_by=fact.updated_by if include_internal else None,
        pending_changes=pending_changes,
        created_at=fact.created_at,
        updated_at=fact.updated_at,
    )


def _clear_pending(fact: ProjectFact) -> None:
    fact.pending_category = None
    fact.pending_question = None
    fact.pending_answer = None


def _append_version(
    session: Session,
    *,
    fact: ProjectFact,
    previous_answer: str | None,
    new_answer: str,
    changed_by: UUID,
) -> None:
    """Append the next sequential version in the caller's transaction."""

    next_number = repository.get_latest_version_number(session, fact.id) + 1
    session.add(
        FactVersion(
            fact_id=fact.id,
            previous_answer=previous_answer,
            new_answer=new_answer,
            version_number=next_number,
            changed_by=changed_by,
        )
    )


def _commit(session: Session) -> None:
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise


def create_project(
    session: Session,
    *,
    actor: User,
    payload: ProjectCreateRequest,
) -> ProjectResponse:
    """Create a project. Administrator access is required."""

    _require_admin(actor)

    if payload.slug is None:
        slug = _unique_generated_slug(session, payload.name)
    else:
        slug = normalize_slug(payload.slug)
        if repository.get_project_by_slug(session, slug) is not None:
            raise ProjectSlugAlreadyExistsError()

    project = Project(
        name=payload.name,
        slug=slug,
        location=payload.location,
        description=payload.description,
        rera_number=payload.rera_number,
        status=_status_value(payload.status),
        created_by=actor.id,
    )
    session.add(project)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        if repository.get_project_by_slug(session, slug) is not None:
            raise ProjectSlugAlreadyExistsError() from exc
        raise

    session.refresh(project)
    return _project_response(project)


def get_project(
    session: Session,
    *,
    actor: User,
    project_id: UUID,
) -> ProjectResponse:
    """Return a project when it is visible to the caller."""

    project = repository.get_project_by_id(session, project_id)
    if project is None:
        raise ProjectNotFoundError()
    if not _is_admin(actor) and project.status != ProjectStatus.ACTIVE.value:
        raise ProjectNotFoundError()
    return _project_response(project)


def list_projects(
    session: Session,
    *,
    actor: User,
    page: int,
    page_size: int,
    status: ProjectStatus | None = None,
) -> ProjectListResponse:
    """Return a page of projects visible to the caller."""

    if _is_admin(actor):
        status_value = status.value if status is not None else None
    else:
        status_value = ProjectStatus.ACTIVE.value

    total = repository.count_projects(session, status=status_value)
    items = repository.list_projects(
        session,
        offset=(page - 1) * page_size,
        limit=page_size,
        status=status_value,
    )
    return ProjectListResponse(
        items=[_project_response(project) for project in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=_pages(total, page_size),
    )


def update_project(
    session: Session,
    *,
    actor: User,
    project_id: UUID,
    payload: ProjectUpdateRequest,
) -> ProjectResponse:
    """Update project details or move it through an allowed status change."""

    _require_admin(actor)
    project = repository.get_project_by_id(session, project_id, for_update=True)
    if project is None:
        raise ProjectNotFoundError()

    fields = payload.model_dump(exclude_unset=True)

    if "status" in fields:
        current = ProjectStatus(project.status)
        requested = ProjectStatus(fields["status"])
        if requested not in _ALLOWED_PROJECT_TRANSITIONS[current]:
            raise InvalidProjectStatusTransitionError(current, requested)
        project.status = requested.value

    if "slug" in fields:
        requested_slug = normalize_slug(fields["slug"])
        if requested_slug != project.slug:
            existing = repository.get_project_by_slug(session, requested_slug)
            if existing is not None and existing.id != project.id:
                raise ProjectSlugAlreadyExistsError()
        project.slug = requested_slug

    for field_name in ("name", "location", "description", "rera_number"):
        if field_name in fields:
            setattr(project, field_name, fields[field_name])

    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        if "slug" in fields:
            existing = repository.get_project_by_slug(
                session, normalize_slug(fields["slug"])
            )
            if existing is not None and existing.id != project_id:
                raise ProjectSlugAlreadyExistsError() from exc
        raise

    session.refresh(project)
    return _project_response(project)


def create_fact(
    session: Session,
    *,
    actor: User,
    project_id: UUID,
    payload: FactCreateRequest,
) -> FactResponse:
    """Create a draft fact and its initial answer version."""

    _require_admin(actor)
    project = repository.get_project_by_id(session, project_id)
    if project is None:
        raise ProjectNotFoundError()

    fact = ProjectFact(
        project_id=project.id,
        category=payload.category,
        question=payload.question,
        answer=payload.answer,
        status=FactStatus.DRAFT.value,
        updated_by=actor.id,
    )
    session.add(fact)
    session.flush()
    session.add(
        FactVersion(
            fact_id=fact.id,
            previous_answer=None,
            new_answer=fact.answer,
            version_number=1,
            changed_by=actor.id,
        )
    )
    _commit(session)
    session.refresh(fact)
    return _fact_response(fact, include_internal=True)


def list_facts(
    session: Session,
    *,
    actor: User,
    project_id: UUID,
    page: int,
    page_size: int,
    status: FactStatus | None = None,
    category: str | None = None,
) -> FactListResponse:
    """Return a page of facts visible to the caller."""

    project = repository.get_project_by_id(session, project_id)
    if project is None:
        raise ProjectNotFoundError()

    include_internal = _is_admin(actor)
    if not include_internal and project.status != ProjectStatus.ACTIVE.value:
        raise ProjectNotFoundError()

    status_value = (
        (status.value if status is not None else None)
        if include_internal
        else FactStatus.APPROVED.value
    )
    category_value = normalize_category(category) if category else None
    project_status_value = (
        None if include_internal else ProjectStatus.ACTIVE.value
    )

    total = repository.count_facts(
        session,
        project_id=project_id,
        status=status_value,
        category=category_value,
        project_status=project_status_value,
    )
    items = repository.list_facts(
        session,
        project_id=project_id,
        offset=(page - 1) * page_size,
        limit=page_size,
        status=status_value,
        category=category_value,
        project_status=project_status_value,
    )
    return FactListResponse(
        items=[
            _fact_response(fact, include_internal=include_internal)
            for fact in items
        ],
        total=total,
        page=page,
        page_size=page_size,
        pages=_pages(total, page_size),
    )


def get_fact(
    session: Session,
    *,
    actor: User,
    fact_id: UUID,
) -> FactResponse:
    """Return a visible fact, hiding drafts from non-admin callers."""

    fact = repository.get_fact_by_id(session, fact_id)
    if fact is None:
        raise FactNotFoundError()

    include_internal = _is_admin(actor)
    if not include_internal and (
        fact.status != FactStatus.APPROVED.value
        or fact.project.status != ProjectStatus.ACTIVE.value
    ):
        raise FactNotFoundError()

    return _fact_response(fact, include_internal=include_internal)


def update_fact(
    session: Session,
    *,
    actor: User,
    fact_id: UUID,
    payload: FactUpdateRequest,
) -> FactResponse:
    """Edit a fact safely.

    Draft facts are edited directly. For approved facts, the proposed values
    are staged in ``pending_*`` fields and remain invisible until approval.
    """

    _require_admin(actor)
    fact = repository.get_fact_by_id(session, fact_id, for_update=True)
    if fact is None:
        raise FactNotFoundError()

    fields = payload.model_dump(exclude_unset=True)

    if fact.status == FactStatus.APPROVED.value:
        base_category = fact.pending_category or fact.category
        base_question = fact.pending_question or fact.question
        base_answer = fact.pending_answer or fact.answer
        proposed_category = fields.get("category", base_category)
        proposed_question = fields.get("question", base_question)
        proposed_answer = fields.get("answer", base_answer)

        if (
            proposed_category == base_category
            and proposed_question == base_question
            and proposed_answer == base_answer
        ):
            return _fact_response(fact, include_internal=True)

        if (
            proposed_category == fact.category
            and proposed_question == fact.question
            and proposed_answer == fact.answer
        ):
            _clear_pending(fact)
            fact.updated_by = actor.id
        else:
            fact.pending_category = proposed_category
            fact.pending_question = proposed_question
            fact.pending_answer = proposed_answer
            fact.updated_by = actor.id

        _commit(session)
        session.refresh(fact)
        return _fact_response(fact, include_internal=True)

    previous_answer = fact.answer
    changed_fields = {
        field_name: value
        for field_name, value in fields.items()
        if getattr(fact, field_name) != value
    }
    if not changed_fields:
        return _fact_response(fact, include_internal=True)

    for field_name, value in changed_fields.items():
        setattr(fact, field_name, value)
    if fact.answer != previous_answer:
        _append_version(
            session,
            fact=fact,
            previous_answer=previous_answer,
            new_answer=fact.answer,
            changed_by=actor.id,
        )
    fact.updated_by = actor.id

    _commit(session)
    session.refresh(fact)
    return _fact_response(fact, include_internal=True)


def approve_fact(
    session: Session,
    *,
    actor: User,
    fact_id: UUID,
) -> FactResponse:
    """Approve a draft fact or publish its staged approved-fact edit."""

    _require_admin(actor)
    fact = repository.get_fact_by_id(session, fact_id, for_update=True)
    if fact is None:
        raise FactNotFoundError()

    if fact.status == FactStatus.DRAFT.value:
        _clear_pending(fact)
        fact.status = FactStatus.APPROVED.value
        fact.updated_by = actor.id
        _commit(session)
        session.refresh(fact)
        return _fact_response(fact, include_internal=True)

    if fact.pending_answer is None:
        return _fact_response(fact, include_internal=True)

    previous_answer = fact.answer
    new_answer = fact.pending_answer
    changed_by = fact.updated_by

    fact.category = fact.pending_category or fact.category
    fact.question = fact.pending_question or fact.question
    fact.answer = new_answer
    _clear_pending(fact)

    if new_answer != previous_answer:
        _append_version(
            session,
            fact=fact,
            previous_answer=previous_answer,
            new_answer=new_answer,
            changed_by=changed_by,
        )

    fact.updated_by = actor.id
    _commit(session)
    session.refresh(fact)
    return _fact_response(fact, include_internal=True)


def reject_fact(
    session: Session,
    *,
    actor: User,
    fact_id: UUID,
) -> FactResponse:
    """Reject staged changes or unpublish an approved fact.

    If an approved fact has pending edits, rejecting discards those edits and
    keeps the previously approved content visible. If an approved fact has no
    pending edits, rejecting returns it to DRAFT and removes it from
    buyer-visible reads.
    """

    _require_admin(actor)
    fact = repository.get_fact_by_id(session, fact_id, for_update=True)
    if fact is None:
        raise FactNotFoundError()

    if fact.pending_answer is not None:
        _clear_pending(fact)
        fact.updated_by = actor.id
    elif fact.status != FactStatus.DRAFT.value:
        fact.status = FactStatus.DRAFT.value
        fact.updated_by = actor.id
    else:
        return _fact_response(fact, include_internal=True)

    _commit(session)
    session.refresh(fact)
    return _fact_response(fact, include_internal=True)


def list_fact_versions(
    session: Session,
    *,
    actor: User,
    fact_id: UUID,
    page: int,
    page_size: int,
) -> FactVersionListResponse:
    """Return a paginated history of a fact's answer versions."""

    _require_admin(actor)
    fact = repository.get_fact_by_id(session, fact_id)
    if fact is None:
        raise FactNotFoundError()

    total = repository.count_fact_versions(session, fact_id=fact_id)
    items = repository.list_fact_versions(
        session,
        fact_id=fact_id,
        offset=(page - 1) * page_size,
        limit=page_size,
    )
    return FactVersionListResponse(
        items=[FactVersionResponse.model_validate(version) for version in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=_pages(total, page_size),
    )


def get_approved_facts(
    session: Session,
    project_id: UUID,
    category: str | None = None,
) -> list[ApprovedFactContent]:
    """Return AI-safe approved facts for an active project.

    This is the service boundary future AI code must use. It returns plain
    DTOs rather than ORM objects, and returns an empty list for missing or
    non-active projects.
    """

    category_value = normalize_category(category) if category else None
    facts = repository.list_approved_facts(
        session,
        project_id=project_id,
        category=category_value,
    )
    return [
        ApprovedFactContent(
            fact_id=fact.id,
            category=fact.category,
            question=fact.question,
            answer=fact.answer,
        )
        for fact in facts
    ]
