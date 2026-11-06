"""Script to configure and seed user accounts for local development.

No fixed or production credentials are hardcoded. Passwords are read from
environment variables (e.g. KEYLO_ADMIN_PASSWORD, KEYLO_SALES_PASSWORD,
KEYLO_BUYER_PASSWORD, KEYLO_DEV_PASSWORD), or securely generated at runtime.
"""

from __future__ import annotations

import os
import secrets
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.modules.auth.service import create_user_with_role
from app.modules.users import repository
from app.modules.users.models import RoleName
from app.modules.users.service import seed_roles


def _resolve_password(env_name: str) -> str:
    """Read password from environment variable or generate a secure compliant fallback."""
    val = os.getenv(env_name)
    if val and val.strip():
        return val.strip()

    shared_dev_pw = os.getenv("KEYLO_DEV_PASSWORD")
    if shared_dev_pw and shared_dev_pw.strip():
        return shared_dev_pw.strip()

    return f"Aa1!{secrets.token_urlsafe(16)}"


def setup() -> None:
    print(f"Configuring database tables on engine: {engine.url.render_as_string(hide_password=True)}")
    Base.metadata.create_all(bind=engine)

    admin_password = _resolve_password("KEYLO_ADMIN_PASSWORD")
    sales_password = _resolve_password("KEYLO_SALES_PASSWORD")
    buyer_password = _resolve_password("KEYLO_BUYER_PASSWORD")

    with SessionLocal() as session:
        seed_roles(session)

        # 1. Admin account
        if not repository.get_user_by_email(session, "admin.demo@keylo.com"):
            create_user_with_role(
                session,
                full_name="Keylo System Administrator",
                email="admin.demo@keylo.com",
                password=admin_password,
                role_name=RoleName.ADMIN,
                phone="+91 98000 00001",
                is_active=True,
            )
            print("Configured admin: admin.demo@keylo.com")

        # 2. Sales Executive accounts
        sales_users = [
            ("Rohit Sharma", "sales.demo@keylo.com", "+91 98111 11111"),
            ("Priya Patel", "priya.sales@keylo.com", "+91 98222 22222"),
            ("Arjun Verma", "arjun.sales@keylo.com", "+91 98333 33333"),
        ]
        for full_name, email, phone in sales_users:
            if not repository.get_user_by_email(session, email):
                create_user_with_role(
                    session,
                    full_name=full_name,
                    email=email,
                    password=sales_password,
                    role_name=RoleName.SALES_EXECUTIVE,
                    phone=phone,
                    is_active=True,
                )
                print(f"Configured sales executive: {email}")

        # 3. Buyer accounts
        buyer_users = [
            ("Sneha Reddy", "buyer.demo@keylo.com", "+91 98444 44444", True),
            ("Ananya Deshmukh", "ananya.buyer@keylo.com", "+91 98555 55555", True),
            ("Vikram Malhotra", "vikram.malhotra@example.com", "+91 98666 66666", False),
        ]
        for full_name, email, phone, is_active in buyer_users:
            if not repository.get_user_by_email(session, email):
                create_user_with_role(
                    session,
                    full_name=full_name,
                    email=email,
                    password=buyer_password,
                    role_name=RoleName.BUYER,
                    phone=phone,
                    is_active=is_active,
                )
                status_str = "active" if is_active else "deactivated"
                print(f"Configured buyer ({status_str}): {email}")

    print("Setup completed successfully.")


if __name__ == "__main__":
    setup()
