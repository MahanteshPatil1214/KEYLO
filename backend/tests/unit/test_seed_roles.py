"""Role seeding tests."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker

from app.modules.users.models import Role, RoleName
from app.modules.users.service import seed_roles


def test_seed_roles_is_idempotent(
    test_session_factory: sessionmaker[Session],
) -> None:
    with test_session_factory() as session:
        created = seed_roles(session)

    assert set(created) == set(RoleName)

    with test_session_factory() as session:
        created_again = seed_roles(session)
        roles = list(session.scalars(select(Role).order_by(Role.name)).all())
        count = session.scalar(select(func.count()).select_from(Role))

    assert created_again == []
    assert count == 3
    assert {role.name for role in roles} == {role.value for role in RoleName}
    assert all(role.description for role in roles)
