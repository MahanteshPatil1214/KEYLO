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
from app.modules.projects import repository as project_repo
from app.modules.projects.models import (
    FactStatus,
    FactVersion,
    Project,
    ProjectFact,
    ProjectStatus,
)
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

        # 4. Developer Projects & Fact Sheets
        admin_user = repository.get_user_by_email(session, "admin.demo@keylo.com")
        if admin_user:
            projects_data = [
                {
                    "name": "Greenwood Heights",
                    "slug": "greenwood-heights",
                    "location": "Sarjapur Road, Bangalore",
                    "description": "Luxury 2 & 3 BHK eco-friendly residences nestled amidst 12 acres of verdant landscaping with curated lifestyle amenities.",
                    "rera_number": "PRM/KA/RERA/1251/308/PR/200122/003188",
                    "status": ProjectStatus.ACTIVE.value,
                    "facts": [
                        (
                            "AMENITIES",
                            "What clubhouse and sports amenities are available?",
                            "Greenwood Heights features an Olympic-sized swimming pool, badminton courts, clubhouse gymnasium, yoga pavilion, and children play park.",
                            FactStatus.APPROVED.value,
                        ),
                        (
                            "CONFIGURATIONS",
                            "What apartment configurations and sizes are offered?",
                            "Spacious 2 BHK (1,150 - 1,280 sq.ft) and 3 BHK (1,580 - 1,890 sq.ft) luxury apartments with expansive sundecks and Italian marble living spaces.",
                            FactStatus.APPROVED.value,
                        ),
                        (
                            "LOCATION & CONNECTIVITY",
                            "How close is the project to major tech parks and schools?",
                            "Located on Sarjapur Main Road, 12 minutes to Wipro SEZ, 20 minutes to Bellandur ORR, and within 3 km of Greenwood High International School.",
                            FactStatus.APPROVED.value,
                        ),
                        (
                            "PRICING & PAYMENT",
                            "What is the starting price and payment schedule?",
                            "Pricing starts at ₹1.15 Cr for 2 BHK and ₹1.65 Cr for 3 BHK. Flexible construction-linked milestone payment plan available.",
                            FactStatus.APPROVED.value,
                        ),
                        (
                            "APPROVALS & RERA",
                            "Is the project RERA approved and which banks have approved home loans?",
                            "Yes, fully RERA compliant under PRM/KA/RERA/1251/308/PR/200122/003188. Home loans approved by SBI, HDFC, ICICI, and Axis Bank.",
                            FactStatus.APPROVED.value,
                        ),
                        (
                            "SPECIFICATIONS",
                            "What are the structural and flooring specifications?",
                            "RCC shear-wall earthquake resistant structure, Italian marble in living and dining, engineered wooden flooring in master bedroom, and premium Grohe sanitary fittings.",
                            FactStatus.DRAFT.value,
                        ),
                    ],
                },
                {
                    "name": "Skyline Waterfront",
                    "slug": "skyline-waterfront",
                    "location": "Financial District, Hyderabad",
                    "description": "Ultra-luxury waterfront towers offering panoramic lake views, private high-speed elevators, and concierge services.",
                    "rera_number": "P02400003892",
                    "status": ProjectStatus.ACTIVE.value,
                    "facts": [
                        (
                            "CONFIGURATIONS",
                            "What unit layouts are available at Skyline Waterfront?",
                            "Exclusive 3 BHK & 4 BHK sky villas ranging from 2,400 to 4,200 sq.ft with 11-foot clear ceilings and private elevator lobbies.",
                            FactStatus.APPROVED.value,
                        ),
                        (
                            "AMENITIES",
                            "What luxury amenities are included?",
                            "Private infinity pool overlooking the lake, rooftop sky lounge, squash court, EV charging stations at all parking bays.",
                            FactStatus.APPROVED.value,
                        ),
                        (
                            "PRICING & PAYMENT",
                            "What are the price brackets for 3 and 4 BHK sky villas?",
                            "3 BHK starts at ₹2.40 Cr, 4 BHK starts at ₹3.80 Cr with a 10:90 possession-linked builder subvention scheme.",
                            FactStatus.DRAFT.value,
                        ),
                    ],
                },
                {
                    "name": "The Grand Boulevard",
                    "slug": "the-grand-boulevard",
                    "location": "Golf Course Extension, Gurgaon",
                    "description": "Mixed-use urban master community integrating premium high-street retail, Grade-A commercial spaces, and luxury boutique residences.",
                    "rera_number": "RC/REP/HARERA/GGM/641/373/2022/108",
                    "status": ProjectStatus.DRAFT.value,
                    "facts": [
                        (
                            "AMENITIES",
                            "What retail and lifestyle features are planned?",
                            "Direct access to European-style high-street promenade, signature fine-dining restaurants, and a 50,000 sq.ft central social club.",
                            FactStatus.DRAFT.value,
                        ),
                    ],
                },
            ]

            for p_info in projects_data:
                project = project_repo.get_project_by_slug(session, p_info["slug"])
                if not project:
                    project = Project(
                        name=p_info["name"],
                        slug=p_info["slug"],
                        location=p_info["location"],
                        description=p_info["description"],
                        rera_number=p_info["rera_number"],
                        status=p_info["status"],
                        created_by=admin_user.id,
                    )
                    session.add(project)
                    session.flush()
                    print(f"Configured project: {project.name}")

                    for cat, q, a, f_status in p_info["facts"]:
                        fact = ProjectFact(
                            project_id=project.id,
                            category=cat,
                            question=q,
                            answer=a,
                            status=f_status,
                            updated_by=admin_user.id,
                        )
                        session.add(fact)
                        session.flush()
                        session.add(
                            FactVersion(
                                fact_id=fact.id,
                                previous_answer=None,
                                new_answer=a,
                                version_number=1,
                                changed_by=admin_user.id,
                            )
                        )
                    session.commit()
                    print(f"Seeded {len(p_info['facts'])} facts for {project.name}")

    print("Setup completed successfully.")


if __name__ == "__main__":
    setup()
