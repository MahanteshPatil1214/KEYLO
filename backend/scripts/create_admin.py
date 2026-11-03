"""Create the first administrator through a trusted local process.

No default administrator account or password exists. Run this script
interactively, or provide ``KEYLO_ADMIN_EMAIL``, ``KEYLO_ADMIN_FULL_NAME``,
and ``KEYLO_ADMIN_PASSWORD`` through a secure deployment environment.
"""

from __future__ import annotations

import getpass
import os

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.session import SessionLocal
from app.modules.auth.exceptions import EmailAlreadyRegisteredError
from app.modules.auth.security import validate_password_strength
from app.modules.auth.service import create_user_with_role
from app.modules.users.models import RoleName
from app.modules.users.service import seed_roles

_EMAIL_ADAPTER = TypeAdapter(EmailStr)


def _read_value(env_name: str, prompt: str, *, secret: bool = False) -> str:
    environment_value = os.getenv(env_name)
    if environment_value:
        return environment_value
    if secret:
        return getpass.getpass(prompt)
    return input(prompt)


def main() -> int:
    configure_logging(get_settings())

    raw_email = _read_value("KEYLO_ADMIN_EMAIL", "Admin email: ")
    try:
        email = str(_EMAIL_ADAPTER.validate_python(raw_email.strip())).lower()
    except ValidationError:
        print("Invalid admin email address.")
        return 1

    full_name = _read_value("KEYLO_ADMIN_FULL_NAME", "Admin full name: ").strip()
    if len(full_name) < 2:
        print("Admin full name must be at least 2 characters.")
        return 1

    password_from_environment = bool(os.getenv("KEYLO_ADMIN_PASSWORD"))
    password = _read_value(
        "KEYLO_ADMIN_PASSWORD",
        "Admin password: ",
        secret=True,
    )
    if not password_from_environment:
        confirmation = getpass.getpass("Confirm admin password: ")
        if password != confirmation:
            print("Passwords do not match.")
            return 1

    try:
        validate_password_strength(password)
    except ValueError as exc:
        print(str(exc))
        return 1

    try:
        with SessionLocal() as session:
            seed_roles(session)
            user = create_user_with_role(
                session,
                full_name=full_name,
                email=email,
                password=password,
                role_name=RoleName.ADMIN,
            )
    except EmailAlreadyRegisteredError:
        print("An account with this email already exists.")
        return 1
    except SQLAlchemyError as exc:
        print(f"Administrator creation failed ({type(exc).__name__}).")
        return 1

    print(f"Administrator created: {user.email}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
