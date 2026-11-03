"""Idempotently create the BUYER, SALES_EXECUTIVE, and ADMIN roles."""

from __future__ import annotations

from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.session import SessionLocal
from app.modules.users.service import seed_roles


def main() -> int:
    configure_logging(get_settings())
    try:
        with SessionLocal() as session:
            created = seed_roles(session)
    except SQLAlchemyError as exc:
        print(f"Role seeding failed ({type(exc).__name__}).")
        return 1

    if created:
        names = ", ".join(role.value for role in created)
        print(f"Created roles: {names}.")
    else:
        print("Roles already initialized; no changes made.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
