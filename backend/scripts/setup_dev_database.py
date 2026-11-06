import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.modules.auth.service import create_user_with_role
from app.modules.users import repository
from app.modules.users.models import RoleName
from app.modules.users.service import seed_roles

def setup():
    print("Creating tables on engine:", engine.url)
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as session:
        seed_roles(session)

        # 1. Admin account
        if not repository.get_user_by_email(session, "admin.demo@keylo.com"):
            create_user_with_role(
                session,
                full_name="Keylo System Administrator",
                email="admin.demo@keylo.com",
                password="KeyloAdmin!2026#",
                role_name=RoleName.ADMIN,
                phone="+91 98000 00001",
                is_active=True,
            )
            print("Created admin: admin.demo@keylo.com")

        # 2. Sales Executive accounts
        if not repository.get_user_by_email(session, "sales.demo@keylo.com"):
            create_user_with_role(
                session,
                full_name="Rohit Sharma",
                email="sales.demo@keylo.com",
                password="KeyloSales!2026#",
                role_name=RoleName.SALES_EXECUTIVE,
                phone="+91 98111 11111",
                is_active=True,
            )
            print("Created sales: sales.demo@keylo.com")

        if not repository.get_user_by_email(session, "priya.sales@keylo.com"):
            create_user_with_role(
                session,
                full_name="Priya Patel",
                email="priya.sales@keylo.com",
                password="KeyloSales!2026#",
                role_name=RoleName.SALES_EXECUTIVE,
                phone="+91 98222 22222",
                is_active=True,
            )
            print("Created sales: priya.sales@keylo.com")

        if not repository.get_user_by_email(session, "arjun.sales@keylo.com"):
            create_user_with_role(
                session,
                full_name="Arjun Verma",
                email="arjun.sales@keylo.com",
                password="KeyloSales!2026#",
                role_name=RoleName.SALES_EXECUTIVE,
                phone="+91 98333 33333",
                is_active=True,
            )
            print("Created sales: arjun.sales@keylo.com")

        # 3. Buyer accounts
        if not repository.get_user_by_email(session, "buyer.demo@keylo.com"):
            create_user_with_role(
                session,
                full_name="Sneha Reddy",
                email="buyer.demo@keylo.com",
                password="KeyloBuyer!2026#",
                role_name=RoleName.BUYER,
                phone="+91 98444 44444",
                is_active=True,
            )
            print("Created buyer: buyer.demo@keylo.com")

        if not repository.get_user_by_email(session, "ananya.buyer@keylo.com"):
            create_user_with_role(
                session,
                full_name="Ananya Deshmukh",
                email="ananya.buyer@keylo.com",
                password="KeyloBuyer!2026#",
                role_name=RoleName.BUYER,
                phone="+91 98555 55555",
                is_active=True,
            )
            print("Created buyer: ananya.buyer@keylo.com")

        if not repository.get_user_by_email(session, "vikram.malhotra@example.com"):
            create_user_with_role(
                session,
                full_name="Vikram Malhotra",
                email="vikram.malhotra@example.com",
                password="KeyloBuyer!2026#",
                role_name=RoleName.BUYER,
                phone="+91 98666 66666",
                is_active=False,
            )
            print("Created deactivated buyer: vikram.malhotra@example.com")

    print("Setup completed successfully.")

if __name__ == "__main__":
    setup()
