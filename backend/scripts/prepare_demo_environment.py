"""Prepare a realistic one-month demo environment for Keylo (October 7 - November 7, 2026).

Generates realistic demo data for Ahmedabad residential projects with:
- 45 Buyers with realistic Indian names, emails, and phone numbers.
- 3 Residential projects in Ahmedabad with 2/3 BHK configurations and full fact sheets.
- 125 Leads distributed across projects and sales executives across the past 30 days.
- Realistic lead sources: Google Ads (WEBSITE), Meta Ads (SOCIAL_MEDIA), Portals, Referrals, Walk-ins.
- Multilingual conversations with natural English, Hindi, and Gujarati dialogs.
- Site visits (Bookings) with realistic statuses (Completed, Confirmed, Cancelled, No-show).
- Follow-ups across priority tiers (Due today, Overdue, Upcoming, Completed).
- Human handoffs, in-app notifications, and audit logs.
- Marketing spend records for realistic analytics and CPL / CPV calculations.

Safety:
- Idempotent: can be run repeatedly without duplicating or corrupting data.
- Does not delete or overwrite real user accounts.
- Provides a clean --reset flag to purge demo data cleanly.
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import UUID, uuid4

# Ensure backend root is on sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
os.chdir(BASE_DIR)

from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.modules.auth.service import create_user_with_role, hash_password
from app.modules.bookings.models import Booking, BookingStatus, VisitSlot
from app.modules.conversations.models import (
    Conversation,
    ConversationStatus,
    Message,
    MessageSenderType,
    MessageStatus,
)
from app.modules.dashboard.models import MarketingSpend
from app.modules.follow_ups.models import (
    FollowUp,
    FollowUpOutcome,
    FollowUpPriority,
    FollowUpStatus,
    FollowUpType,
)
from app.modules.handoffs.models import Handoff, HandoffReason, HandoffStatus
from app.modules.leads.models import Lead, LeadAssignment, LeadSource, LeadStatus
from app.modules.notifications.models import Notification, NotificationType
from app.modules.projects.models import (
    FactStatus,
    FactVersion,
    Project,
    ProjectFact,
    ProjectStatus,
)
from app.modules.settings.models import AuditLog
from app.modules.settings.service import ensure_defaults_seeded, log_admin_action
from app.modules.users.models import Role, RoleName, User
from app.modules.users.service import seed_roles


DEMO_EMAIL_DOMAIN = "@demo.keylo.in"
DEMO_PROJECT_SLUGS = [
    "riviera-elegance-prahladnagar",
    "shantigram-sky-greens",
    "heritage-terraces-science-city",
]

# Anchor date: November 7, 2026
ANCHOR_NOW = datetime(2026, 11, 7, 18, 0, 0, tzinfo=UTC)
START_DATE = ANCHOR_NOW - timedelta(days=31)  # October 7, 2026


def _resolve_password(env_name: str, default_val: str) -> str:
    """Read password from environment variable or use the standard test credential."""
    val = os.getenv(env_name)
    if val and val.strip():
        return val.strip()
    shared_dev_pw = os.getenv("KEYLO_DEV_PASSWORD")
    if shared_dev_pw and shared_dev_pw.strip():
        return shared_dev_pw.strip()
    return default_val


def reset_demo_data(session) -> None:
    """Safely remove generated demo records without touching real user accounts."""
    print("Purging existing demo data...")

    # 1. Delete notifications tied to demo leads or projects
    demo_projects = session.query(Project).filter(Project.slug.in_(DEMO_PROJECT_SLUGS)).all()
    demo_proj_ids = [p.id for p in demo_projects]

    demo_buyers = session.query(User).filter(User.email.like(f"%{DEMO_EMAIL_DOMAIN}")).all()
    demo_buyer_ids = [u.id for u in demo_buyers]

    demo_leads = session.query(Lead).filter(
        (Lead.project_id.in_(demo_proj_ids)) | (Lead.email.like(f"%{DEMO_EMAIL_DOMAIN}"))
    ).all()
    demo_lead_ids = [l.id for l in demo_leads]

    # Delete notifications
    session.query(Notification).filter(
        (Notification.lead_id.in_(demo_lead_ids))
        | (Notification.project_id.in_(demo_proj_ids))
        | (Notification.user_id.in_(demo_buyer_ids))
    ).delete(synchronize_session=False)

    # Delete follow-ups
    session.query(FollowUp).filter(
        (FollowUp.lead_id.in_(demo_lead_ids)) | (FollowUp.project_id.in_(demo_proj_ids))
    ).delete(synchronize_session=False)

    # Delete handoffs
    session.query(Handoff).filter(
        (Handoff.lead_id.in_(demo_lead_ids)) | (Handoff.project_id.in_(demo_proj_ids))
    ).delete(synchronize_session=False)

    # Delete messages & conversations
    demo_convs = session.query(Conversation).filter(
        (Conversation.lead_id.in_(demo_lead_ids))
        | (Conversation.project_id.in_(demo_proj_ids))
        | (Conversation.buyer_id.in_(demo_buyer_ids))
    ).all()
    demo_conv_ids = [c.id for c in demo_convs]

    if demo_conv_ids:
        session.query(Message).filter(Message.conversation_id.in_(demo_conv_ids)).delete(synchronize_session=False)
        session.query(Conversation).filter(Conversation.id.in_(demo_conv_ids)).delete(synchronize_session=False)

    # Delete bookings
    session.query(Booking).filter(
        (Booking.lead_id.in_(demo_lead_ids))
        | (Booking.project_id.in_(demo_proj_ids))
        | (Booking.buyer_id.in_(demo_buyer_ids))
    ).delete(synchronize_session=False)

    # Delete visit slots for demo projects
    session.query(VisitSlot).filter(VisitSlot.project_id.in_(demo_proj_ids)).delete(synchronize_session=False)

    # Delete lead assignments & leads
    session.query(LeadAssignment).filter(LeadAssignment.lead_id.in_(demo_lead_ids)).delete(synchronize_session=False)
    session.query(Lead).filter(Lead.id.in_(demo_lead_ids)).delete(synchronize_session=False)

    # Delete demo audit logs
    demo_resource_ids = ["PRJ_RIVIERA", "AHMEDABAD_SLOTS", "TMPL_VISIT", "ASSIGN_RULES", "SPEND_OCT"]
    session.query(AuditLog).filter(AuditLog.resource_id.in_(demo_resource_ids)).delete(synchronize_session=False)

    # Delete marketing spends for demo projects
    session.query(MarketingSpend).filter(MarketingSpend.project_id.in_(demo_proj_ids)).delete(synchronize_session=False)

    # Delete demo project facts and fact versions
    for p in demo_projects:
        for f in p.facts:
            session.query(FactVersion).filter(FactVersion.fact_id == f.id).delete(synchronize_session=False)
            session.delete(f)
        session.delete(p)

    # Delete demo buyers
    for b in demo_buyers:
        session.delete(b)

    # Also clean up non-realistic test artifacts if any exist
    unrealistic_users = session.query(User).filter(User.email.like("maya.sen.%@keylo.com")).all()
    for u in unrealistic_users:
        session.delete(u)

    unrealistic_projects = session.query(Project).filter(Project.slug == "emerald-valley-residences-2").all()
    for p in unrealistic_projects:
        session.delete(p)

    session.commit()
    print("Demo data reset cleanly.")


def seed_demo_environment() -> dict[str, int]:
    """Execute complete idempotent demo data seed."""
    print("=" * 70)
    print("PREPARING REALISTIC 1-MONTH KEYLO DEMO ENVIRONMENT (OCT 7 - NOV 7, 2026)")
    print("=" * 70)

    Base.metadata.create_all(bind=engine)

    admin_pw = os.getenv("KEYLO_ADMIN_PASSWORD", "Admin@123456")
    sales_pw = os.getenv("KEYLO_SALES_PASSWORD", "Sales@123456")
    buyer_pw = os.getenv("KEYLO_BUYER_PASSWORD", "Buyer@123456")

    with SessionLocal() as session:
        seed_roles(session)
        ensure_defaults_seeded(session)

        # -------------------------------------------------------------
        # 1. CORE DEMO ACCOUNTS (Admin, Sales Executives, Primary Buyer)
        # -------------------------------------------------------------
        print("\n--- 1. Ensuring Core Demo Accounts ---")
        admin_user = session.query(User).filter(User.email == "admin.demo@keylo.com").first()
        if not admin_user:
            admin_user = create_user_with_role(
                session,
                full_name="Keylo System Administrator",
                email="admin.demo@keylo.com",
                password=admin_pw,
                role_name=RoleName.ADMIN,
                phone="+91 98000 00001",
                is_active=True,
            )
            print("  Created Admin: admin.demo@keylo.com")
        else:
            admin_user.password_hash = hash_password(admin_pw)
            session.add(admin_user)
            session.commit()
            print("  Verified Admin: admin.demo@keylo.com")

        # Sales executives
        executives = []
        sales_team_data = [
            ("Rohit Sharma", "sales.demo@keylo.com", "+91 98250 11001"),
            ("Priya Patel", "priya.sales@keylo.com", "+91 98250 11002"),
            ("Arjun Verma", "arjun.sales@keylo.com", "+91 98250 11003"),
        ]
        for name, email, phone in sales_team_data:
            exec_user = session.query(User).filter(User.email == email).first()
            if not exec_user:
                exec_user = create_user_with_role(
                    session,
                    full_name=name,
                    email=email,
                    password=sales_pw,
                    role_name=RoleName.SALES_EXECUTIVE,
                    phone=phone,
                    is_active=True,
                )
                print(f"  Created Sales Exec: {email} ({name})")
            else:
                exec_user.password_hash = hash_password(sales_pw)
                session.add(exec_user)
                session.commit()
                print(f"  Verified Sales Exec: {email} ({name})")
            executives.append(exec_user)

        # Primary buyer
        primary_buyer = session.query(User).filter(User.email == "buyer.demo@keylo.com").first()
        if not primary_buyer:
            primary_buyer = create_user_with_role(
                session,
                full_name="Sneha Reddy",
                email="buyer.demo@keylo.com",
                password=buyer_pw,
                role_name=RoleName.BUYER,
                phone="+91 98250 22001",
                is_active=True,
            )
            print("  Created Buyer: buyer.demo@keylo.com (Sneha Reddy)")
        else:
            primary_buyer.password_hash = hash_password(buyer_pw)
            session.add(primary_buyer)
            session.commit()
            print("  Verified Buyer: buyer.demo@keylo.com (Sneha Reddy)")

        # -------------------------------------------------------------
        # 2. AHMEDABAD RESIDENTIAL PROJECTS & FACT SHEETS (2 & 3 BHK)
        # -------------------------------------------------------------
        print("\n--- 2. Seeding Ahmedabad Residential Projects & Fact Sheets ---")
        ahmedabad_projects_data = [
            {
                "name": "Riviera Elegance @ Prahlad Nagar",
                "slug": "riviera-elegance-prahladnagar",
                "location": "Prahlad Nagar, Ahmedabad",
                "description": "Ultra-modern 2 & 3 BHK luxury residences in Ahmedabad's prime business district featuring rooftop infinity pool, Italian marble flooring, 3-tier smart security, and EV charging bays.",
                "rera_number": "PR/GJ/AHMEDABAD/AHMEDABAD CITY/AUDA/RAA08543/150323",
                "status": ProjectStatus.ACTIVE.value,
                "facts": [
                    (
                        "CONFIGURATIONS",
                        "What apartment configurations and sizes are offered at Riviera Elegance?",
                        "Spacious 2 BHK (1,290 - 1,410 sq.ft, carpet 850 - 920 sq.ft) and 3 BHK (1,750 - 2,100 sq.ft, carpet 1,180 - 1,420 sq.ft) residences with expansive sundecks and modular kitchens.",
                        FactStatus.APPROVED.value,
                    ),
                    (
                        "PRICING & PAYMENT",
                        "What is the starting price and payment milestone plan?",
                        "2 BHK residences start at ₹88 Lakhs and 3 BHK residences start at ₹1.38 Cr. Flexible construction-linked milestone plan (10% booking token, 15% on plinth, balanced on slab completion).",
                        FactStatus.APPROVED.value,
                    ),
                    (
                        "AMENITIES",
                        "What clubhouse, wellness, and lifestyle amenities are provided?",
                        "35,000 sq.ft grand clubhouse, rooftop infinity pool, squash court, state-of-the-art gym, indoor badminton court, children's thematic play zone, and senior citizen reflexology garden.",
                        FactStatus.APPROVED.value,
                    ),
                    (
                        "LOCATION & CONNECTIVITY",
                        "How connected is the project to major Ahmedabad hubs and transport?",
                        "Located in Prahlad Nagar near Corporate Road: 2 minutes to SG Highway, 8 minutes to Iscon Cross Road, 18 minutes to Sabarmati Riverfront, and 28 minutes to Ahmedabad International Airport.",
                        FactStatus.APPROVED.value,
                    ),
                    (
                        "APPROVALS & RERA",
                        "Is the project AUDA approved and which banks have loan sanction tie-ups?",
                        "Fully approved under Gujarat RERA: PR/GJ/AHMEDABAD/AHMEDABAD CITY/AUDA/RAA08543/150323. Home loan approvals in place with SBI, HDFC, ICICI, and Bank of Baroda with competitive rates.",
                        FactStatus.APPROVED.value,
                    ),
                    (
                        "POSSESSION & SPECIFICATIONS",
                        "When is the handover date and what are the construction specifications?",
                        "RERA possession scheduled for March 2027. Earthquake-resistant RCC shear structure, Italian marble in living room, wooden flooring in master bedroom, and Grohe / Kohler sanitary fittings.",
                        FactStatus.APPROVED.value,
                    ),
                ],
            },
            {
                "name": "Shantigram Sky Greens @ SG Highway",
                "slug": "shantigram-sky-greens",
                "location": "SG Highway, Bodakdev, Ahmedabad",
                "description": "Premium 2 & 3 BHK eco-residences along SG Highway corridor, integrated with 10 acres of landscaped green spaces, sports pavilion, and rooftop stargazing lounge.",
                "rera_number": "PR/GJ/AHMEDABAD/AHMEDABAD CITY/AUDA/RAA09876/010123",
                "status": ProjectStatus.ACTIVE.value,
                "facts": [
                    (
                        "CONFIGURATIONS",
                        "What unit layouts and sizes are available at Shantigram Sky Greens?",
                        "Contemporary 2 BHK (1,220 - 1,350 sq.ft) and 3 BHK (1,650 - 1,980 sq.ft) apartments with cross-ventilation, double-glazed windows, and utility balconies.",
                        FactStatus.APPROVED.value,
                    ),
                    (
                        "PRICING & PAYMENT",
                        "What are the price brackets and payment schemes?",
                        "2 BHK starts at ₹78 Lakhs, 3 BHK starts at ₹1.15 Cr. Special 20:80 possession-linked builder subvention scheme available through nationalized partner banks.",
                        FactStatus.APPROVED.value,
                    ),
                    (
                        "AMENITIES",
                        "What recreational and sports facilities are available?",
                        "Half-Olympic swimming pool, automated bowling alley, rooftop jogging track, cricket net practice pitch, co-working hub with high-speed fiber, and solar-powered EV parking stations.",
                        FactStatus.APPROVED.value,
                    ),
                    (
                        "LOCATION & CONNECTIVITY",
                        "What is the proximity to SG Highway, GIFT City, and schools?",
                        "Right off SG Highway near Bodakdev: 5 minutes to Vaishnodevi Circle, 20 minutes to GIFT City Gandhinagar via SP Ring Road, and under 3 km from SGVP International School.",
                        FactStatus.APPROVED.value,
                    ),
                    (
                        "APPROVALS & RERA",
                        "Is the project RERA compliant?",
                        "Approved by AUDA and registered under Gujarat RERA PR/GJ/AHMEDABAD/AHMEDABAD CITY/AUDA/RAA09876/010123. Clear freehold title with zero encumbrances.",
                        FactStatus.APPROVED.value,
                    ),
                ],
            },
            {
                "name": "The Heritage Terraces @ Science City",
                "slug": "heritage-terraces-science-city",
                "location": "Science City Road, Sola, Ahmedabad",
                "description": "Boutique 2 & 3 BHK garden apartments with private sky terraces, dedicated co-working lounges, solar energy integration, and state-of-the-art security systems.",
                "rera_number": "PR/GJ/AHMEDABAD/AHMEDABAD CITY/AUDA/RAA07612/200823",
                "status": ProjectStatus.ACTIVE.value,
                "facts": [
                    (
                        "CONFIGURATIONS",
                        "What apartment types are offered at The Heritage Terraces?",
                        "Signature 2 BHK (1,180 - 1,320 sq.ft) and 3 BHK (1,550 - 1,850 sq.ft) residences featuring private sky terraces with unobstructed greens.",
                        FactStatus.APPROVED.value,
                    ),
                    (
                        "PRICING & PAYMENT",
                        "What is the starting price for 2 and 3 BHK residences?",
                        "2 BHK residences start at ₹72 Lakhs and 3 BHK residences start at ₹1.05 Cr. Down payment discount of 3% available for early token registrations.",
                        FactStatus.APPROVED.value,
                    ),
                    (
                        "AMENITIES",
                        "What lifestyle amenities are included for residents?",
                        "Temperature-controlled indoor pool, amphitheater, yoga & meditation deck, multi-tier automated stack car parking, and EV fast chargers.",
                        FactStatus.APPROVED.value,
                    ),
                    (
                        "LOCATION & CONNECTIVITY",
                        "How accessible is Science City Road and SP Ring Road?",
                        "Situated on Science City Road, Sola: 3 minutes to Science City complex, 5 minutes to Sola Civil Hospital, 7 minutes to SG Highway, and 2 minutes to SP Ring Road.",
                        FactStatus.APPROVED.value,
                    ),
                    (
                        "APPROVALS & RERA",
                        "Is the project approved by AUDA and RERA?",
                        "RERA Registration No: PR/GJ/AHMEDABAD/AHMEDABAD CITY/AUDA/RAA07612/200823. Pre-approved loans from SBI, Axis Bank, Kotak Mahindra, and HDFC.",
                        FactStatus.APPROVED.value,
                    ),
                ],
            },
        ]

        projects = []
        for p_data in ahmedabad_projects_data:
            proj = session.query(Project).filter(Project.slug == p_data["slug"]).first()
            if not proj:
                proj = Project(
                    name=p_data["name"],
                    slug=p_data["slug"],
                    location=p_data["location"],
                    description=p_data["description"],
                    rera_number=p_data["rera_number"],
                    status=p_data["status"],
                    created_by=admin_user.id,
                    created_at=START_DATE,
                )
                session.add(proj)
                session.flush()

                for cat, q, a, f_status in p_data["facts"]:
                    fact = ProjectFact(
                        project_id=proj.id,
                        category=cat,
                        question=q,
                        answer=a,
                        status=f_status,
                        updated_by=admin_user.id,
                        created_at=START_DATE + timedelta(hours=2),
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
                            created_at=START_DATE + timedelta(hours=2),
                        )
                    )
                session.commit()
                print(f"  Created Project: {proj.name} ({len(p_data['facts'])} facts)")
            else:
                print(f"  Verified Project: {proj.name}")
            projects.append(proj)

        # -------------------------------------------------------------
        # 3. 45 REALISTIC BUYERS (Indian Names, Fictional Contacts)
        # -------------------------------------------------------------
        print("\n--- 3. Seeding 45 Realistic Demo Buyers ---")
        indian_names = [
            ("Bhavik", "Patel"), ("Hardik", "Shah"), ("Neha", "Mehta"),
            ("Chirag", "Joshi"), ("Pooja", "Trivedi"), ("Amit", "Verma"),
            ("Ritu", "Sharma"), ("Darshan", "Desai"), ("Kinjal", "Gandhi"),
            ("Mehul", "Dave"), ("Sneha", "Solanki"), ("Jignesh", "Prajapati"),
            ("Tanvi", "Parekh"), ("Rajesh", "Chawla"), ("Smita", "Rathod"),
            ("Pratik", "Vora"), ("Devang", "Thakkar"), ("Anjali", "Bhatt"),
            ("Suresh", "Maniar"), ("Kavita", "Zaveri"), ("Nilesh", "Gajjar"),
            ("Krupa", "Soni"), ("Manish", "Panchal"), ("Bhumika", "Makwana"),
            ("Gautam", "Barot"), ("Harsh", "Doshi"), ("Parul", "Ravandale"),
            ("Karan", "Kapadia"), ("Vaishali", "Modi"), ("Samir", "Sanghavi"),
            ("Hetvi", "Somani"), ("Tushar", "Munshi"), ("Rupal", "Kothari"),
            ("Ashish", "Choksi"), ("Nidhi", "Gohil"), ("Ketul", "Kapadia"),
            ("Mansi", "Shah"), ("Viral", "Patel"), ("Deepa", "Chauhan"),
            ("Sanjay", "Suthar"), ("Alpa", "Upadhyay"), ("Yash", "Oza"),
            ("Swati", "Pandya"), ("Kalpesh", "Mehta"), ("Dhara", "Parikh"),
        ]

        buyers = [primary_buyer]
        hashed_buyer_pw = hash_password(buyer_pw)

        for i, (fname, lname) in enumerate(indian_names, start=1):
            email = f"{fname.lower()}.{lname.lower()}{DEMO_EMAIL_DOMAIN}"
            phone = f"+91 98250 {55000 + i:05d}"
            full_name = f"{fname} {lname}"

            buyer = session.query(User).filter(User.email == email).first()
            if not buyer:
                # Distribute registration timestamps across the 31-day period
                buyer_created = START_DATE + timedelta(days=(i % 30), hours=(i % 12) + 9)
                buyer = User(
                    full_name=full_name,
                    email=email,
                    password_hash=hashed_buyer_pw,
                    phone=phone,
                    role_id=primary_buyer.role_id,
                    is_active=True,
                    is_verified=True,
                    created_at=buyer_created,
                )
                session.add(buyer)
                session.flush()
            buyers.append(buyer)
        session.commit()
        print(f"  Successfully seeded/verified {len(buyers)} demo buyers")

        # -------------------------------------------------------------
        # 4. 125 REALISTIC LEADS (Spread Across Oct 7 - Nov 7, 2026)
        # -------------------------------------------------------------
        print("\n--- 4. Seeding 125 Leads across Oct 7 - Nov 7, 2026 ---")
        existing_demo_leads = session.query(Lead).filter(Lead.project_id.in_([p.id for p in projects])).count()
        
        leads = []
        if existing_demo_leads >= 100:
            print(f"  Existing demo leads verified: {existing_demo_leads}")
            leads = session.query(Lead).filter(Lead.project_id.in_([p.id for p in projects])).order_by(Lead.created_at).all()
        else:
            # Generate 125 realistic leads
            # Sources mapping:
            # - WEBSITE (Google Ads & Organic website)
            # - SOCIAL_MEDIA (Meta Ads / Instagram campaigns)
            # - PROPERTY_PORTAL (99acres / MagicBricks)
            # - REFERRAL (Homeowner / colleague referrals)
            # - OTHER (Walk-in to experience center / hoarding)
            lead_sources = [
                LeadSource.WEBSITE.value,
                LeadSource.SOCIAL_MEDIA.value,
                LeadSource.PROPERTY_PORTAL.value,
                LeadSource.REFERRAL.value,
                LeadSource.OTHER.value,
            ]
            lead_configs = [
                ("2 BHK Smart", 7500000, 9000000),
                ("2 BHK Premium", 8000000, 9500000),
                ("3 BHK Luxury", 11000000, 14500000),
                ("3 BHK Terrace Sky Villa", 13500000, 18500000),
                ("2 BHK Garden View", 7800000, 9200000),
            ]

            # Realistic funnel status distribution for 125 leads:
            # - NEW: ~18
            # - CONTACTED: ~24
            # - QUALIFIED: ~26
            # - VISIT_BOOKED: ~20
            # - VISITED: ~18
            # - CONVERTED: ~10
            # - LOST: ~5
            # - VISIT_CANCELLED: ~4
            funnel_statuses = (
                [LeadStatus.CONVERTED.value] * 10
                + [LeadStatus.VISITED.value] * 18
                + [LeadStatus.VISIT_BOOKED.value] * 20
                + [LeadStatus.QUALIFIED.value] * 26
                + [LeadStatus.CONTACTED.value] * 24
                + [LeadStatus.NEW.value] * 18
                + [LeadStatus.LOST.value] * 5
                + [LeadStatus.VISIT_CANCELLED.value] * 4
            )

            for idx in range(125):
                # Chronological distribution across 31 days
                day_offset = (idx * 31) // 125
                minute_offset = (idx * 47) % 720
                lead_created = START_DATE + timedelta(days=day_offset, minutes=minute_offset)

                proj = projects[idx % len(projects)]
                buyer = buyers[idx % len(buyers)]
                exec_user = executives[idx % len(executives)]
                source = lead_sources[idx % len(lead_sources)]
                cfg_name, b_min, b_max = lead_configs[idx % len(lead_configs)]
                status = funnel_statuses[idx % len(funnel_statuses)]

                lead = Lead(
                    full_name=f"{buyer.full_name}",
                    email=f"lead.{idx+1:03d}.{buyer.email}",
                    phone=f"+91 98250 {60000 + idx:05d}",
                    project_id=proj.id,
                    source=source,
                    status=status,
                    budget_min=b_min,
                    budget_max=b_max,
                    preferred_configuration=cfg_name,
                    consent_to_contact=True,
                    created_at=lead_created,
                    updated_at=lead_created + timedelta(hours=2),
                )
                session.add(lead)
                session.flush()

                # Lead Assignment
                assigned_at = lead_created + timedelta(minutes=15)
                assignment = LeadAssignment(
                    lead_id=lead.id,
                    executive_id=exec_user.id,
                    assigned_by=admin_user.id,
                    assigned_at=assigned_at,
                )
                session.add(assignment)
                leads.append(lead)

            session.commit()
            print(f"  Successfully generated {len(leads)} leads across Oct 7 - Nov 7, 2026")

        # -------------------------------------------------------------
        # 5. VISIT SLOTS & SITE VISITS (BOOKINGS)
        # -------------------------------------------------------------
        print("\n--- 5. Seeding Visit Slots & Site Visit Bookings ---")
        # Generate 4 daily slots (10am, 12pm, 3pm, 5pm) for each project from Oct 7 to Nov 14, 2026
        slots = []
        for proj in projects:
            for day_idx in range(39):  # 31 past days + 8 upcoming days
                day_base = (START_DATE + timedelta(days=day_idx)).replace(minute=0, second=0, microsecond=0)
                for hour in (10, 12, 15, 17):
                    s_time = day_base.replace(hour=hour)
                    e_time = s_time + timedelta(hours=1)
                    existing_slot = session.query(VisitSlot).filter(
                        VisitSlot.project_id == proj.id,
                        VisitSlot.start_time == s_time,
                    ).first()
                    if not existing_slot:
                        existing_slot = VisitSlot(
                            project_id=proj.id,
                            start_time=s_time,
                            end_time=e_time,
                            capacity=3,
                            is_active=True,
                            notes=f"[DEMO DATA] Sales Gallery & Model Flat Slot - {proj.name}",
                            created_at=START_DATE,
                        )
                        session.add(existing_slot)
                    slots.append(existing_slot)
        session.commit()
        print(f"  Configured/verified {len(slots)} visit slots across Ahmedabad projects")

        # Seed realistic site visit bookings (42 bookings across past completed, upcoming, cancelled, and no-shows)
        existing_bookings = session.query(Booking).filter(Booking.project_id.in_([p.id for p in projects])).count()
        if existing_bookings >= 35:
            print(f"  Existing demo bookings verified: {existing_bookings}")
        else:
            eligible_leads = [l for l in leads if l.status in (
                LeadStatus.VISIT_BOOKED.value,
                LeadStatus.VISITED.value,
                LeadStatus.CONVERTED.value,
                LeadStatus.VISIT_CANCELLED.value,
            )]

            booking_statuses = (
                [BookingStatus.COMPLETED.value] * 20
                + [BookingStatus.CONFIRMED.value] * 12
                + [BookingStatus.CANCELLED.value] * 6
                + [BookingStatus.NO_SHOW.value] * 4
            )

            booked_count = 0
            for idx, b_status in enumerate(booking_statuses):
                if idx >= len(eligible_leads):
                    break
                target_lead = eligible_leads[idx]
                target_buyer = buyers[idx % len(buyers)]
                target_exec = executives[idx % len(executives)]

                # Pick slot chronologically
                if b_status == BookingStatus.COMPLETED.value:
                    # Past slot between Oct 10 and Nov 5
                    slot_day = 3 + (idx % 25)
                    slot_hour = (10, 12, 15, 17)[idx % 4]
                elif b_status == BookingStatus.CONFIRMED.value:
                    # Upcoming slot Nov 8 to Nov 14
                    slot_day = 31 + (idx % 7)
                    slot_hour = (10, 12, 15, 17)[idx % 4]
                elif b_status == BookingStatus.NO_SHOW.value:
                    # Past slot where buyer didn't attend
                    slot_day = 10 + (idx % 15)
                    slot_hour = 15
                else:  # CANCELLED
                    slot_day = 8 + (idx % 20)
                    slot_hour = 12

                slot_time = (START_DATE + timedelta(days=slot_day)).replace(hour=slot_hour, minute=0, second=0, microsecond=0)
                matched_slot = session.query(VisitSlot).filter(
                    VisitSlot.project_id == target_lead.project_id,
                    VisitSlot.start_time == slot_time,
                ).first()

                if not matched_slot:
                    matched_slot = session.query(VisitSlot).filter(
                        VisitSlot.project_id == target_lead.project_id
                    ).first()

                if matched_slot:
                    booking_created = target_lead.created_at + timedelta(days=1, hours=2)
                    cancellation_reason = None
                    cancelled_at = None
                    notes = f"[DEMO DATA] Site visit for {target_lead.full_name} ({target_lead.preferred_configuration})."

                    if b_status == BookingStatus.COMPLETED.value:
                        notes += " Buyer attended with family, reviewed 3 BHK model apartment, requested payment schedule."
                    elif b_status == BookingStatus.CANCELLED.value:
                        cancellation_reason = "Buyer had outstation family emergency; requested rescheduling to next weekend."
                        cancelled_at = booking_created + timedelta(days=1)
                        notes += " Cancelled by buyer via portal."
                    elif b_status == BookingStatus.NO_SHOW.value:
                        notes += " Buyer was unreachable on visit morning; follow-up scheduled."

                    booking = Booking(
                        slot_id=matched_slot.id,
                        lead_id=target_lead.id,
                        project_id=target_lead.project_id,
                        buyer_id=target_buyer.id,
                        executive_id=target_exec.id,
                        status=b_status,
                        notes=notes,
                        cancellation_reason=cancellation_reason,
                        cancelled_at=cancelled_at,
                        created_at=booking_created,
                    )
                    session.add(booking)
                    booked_count += 1

            session.commit()
            print(f"  Successfully seeded {booked_count} realistic site visit bookings")

        # -------------------------------------------------------------
        # 6. CONVERSATIONS & NATURAL MULTILINGUAL MESSAGES (EN / HI / GU)
        # -------------------------------------------------------------
        print("\n--- 6. Seeding Multilingual Conversations (English, Hindi, Gujarati) ---")
        existing_convs = session.query(Conversation).filter(Conversation.project_id.in_([p.id for p in projects])).count()
        if existing_convs >= 25:
            print(f"  Existing demo conversations verified: {existing_convs}")
        else:
            multilingual_dialogs = [
                # 1. English - Configuration and Floor Plan
                [
                    ("BUYER", "Hello, I am interested in the 3 BHK apartments at Riviera Elegance. Could you share the carpet area and balcony details?"),
                    ("ASSISTANT", "Hello! Riviera Elegance offers luxury 3 BHK residences ranging from 1,750 to 2,100 sq.ft super built-up with 1,180 to 1,420 sq.ft RERA carpet area. Each unit features an expansive East-facing living deck and a separate utility balcony. Would you like to view the floor plans?"),
                    ("BUYER", "Yes please, and what is the starting price inclusive of car parking?"),
                    ("ASSISTANT", "3 BHK residences start at ₹1.38 Cr, which includes one reserved covered parking bay and access to the 35,000 sq.ft lifestyle clubhouse. We have weekend site visit slots open if you'd like to inspect the model flat!"),
                    ("BUYER", "That sounds good. Let's schedule a site visit for this Saturday at 11 AM."),
                    ("SALES_EXECUTIVE", "Great! I have reserved your slot for Saturday, 11:00 AM. I will meet you at the Prahlad Nagar sales experience lounge with the detailed cost sheet."),
                ],
                # 2. Hindi - Construction Status and Possession
                [
                    ("BUYER", "नमस्ते! क्या शांतिक्रम स्काई ग्रीन्स में 2 BHK फ्लैट्स का कंस्ट्रक्शन तय समय पर चल रहा है? और पजेशन कब तक मिलेगा?"),
                    ("ASSISTANT", "नमस्ते! शांतिक्रम स्काई ग्रीन्स का निर्माण कार्य पूरी गति से चल रहा है और 8वीं मंजिल की स्लैब ढलाई पूरी हो चुकी है। गुजरात रेरा के अनुसार इसका पजेशन दिसंबर 2026 तक निर्धारित है। क्या आप कंस्ट्रक्शन प्रोग्रेस रिपोर्ट देखना चाहेंगे?"),
                    ("BUYER", "हाँ, और क्या बैंक से 80% होम लोन की सुविधा उपलब्ध है?"),
                    ("ASSISTANT", "जी बिल्कुल, प्रोजेक्ट एसबीआई (SBI), एचडीएफसी (HDFC) और आईसीआईसीआई (ICICI) से प्री-अप्रूव्ड है। आपको आसान 20:80 सब्वेंशन स्कीम भी मिल सकती है।"),
                    ("BUYER", "बहुत बढ़िया, मुझे लोन डॉक्यूमेंट्स की लिस्ट व्हाट्सएप पर भेज दीजिए।"),
                    ("SALES_EXECUTIVE", "नमस्ते, मैंने आपकी लोन चेकलिस्ट तैयार कर ली है और हमारे बैंक रिलेशनशिप मैनेजर आज शाम आपसे संपर्क करेंगे।"),
                ],
                # 3. Gujarati - Vastu and Science City Amenities
                [
                    ("BUYER", "નમસ્તે, સાયન્સ સિટી વાળા ધ હેરીટેજ ટેરેસિસ પ્રોજેક્ટમાં 3 BHK ફ્લેટ્સ વાસ્તુ શાસ્ત્ર મુજબ ઈસ્ટ ફેસિંગ ઉપલબ્ધ છે?"),
                    ("ASSISTANT", "નમસ્તે! હા, ધ હેરીટેજ ટેરેસિસમાં ટાવર B અને C ના 3 BHK ફ્લેટ્સ સંપૂર્ણપણે વાસ્તુ શાસ્ત્ર મુજબ ઈસ્ટ અને નોર્થ-ઈસ્ટ એન્ટ્રી સાથે ડિઝાઇન કરેલા છે. લિવિંગ રૂમ અને રસોડું પણ વાસ્તુ નિયમો મુજબ રાખવામાં આવ્યા છે."),
                    ("BUYER", "ખૂબ સરસ! ક્લબહાઉસમાં કયા કયા સ્પોર્ટ્સ ફેસિલિટીઝ છે અને મેઇન્ટેનન્સ કેટલું રહેશે?"),
                    ("ASSISTANT", "ક્લબહાઉસમાં ટેમ્પરેચર કંટ્રોલ્ડ ઇન્ડોર સ્વિમિંગ પૂલ, બેડમિન્ટન કોર્ટ, સ્ટેટ-ઓફ-ધ-આર્ટ જિમ અને બાળકો માટે પ્લે પાર્ક સામેલ છે. અંદાજિત મેઇન્ટેનન્સ ₹3.50 પ્રતિ સ્ક્વેર ફીટ રહેશે."),
                    ("BUYER", "હું આવતીકાલે સાંજે 4 વાગ્યે સાઈટ જોવા આવી શકું?"),
                    ("SALES_EXECUTIVE", "ચોક્કસ! તમારો સાઈટ વિઝિટ સ્લોટ કન્ફર્મ થઈ ગયો છે. હું તમને સાયન્સ સિટી રોડ વાળા સેલ્સ લાઉન્જમાં મળીશ."),
                ],
                # 4. English - Price Milestone & Stamp Duty
                [
                    ("BUYER", "Could you clarify the payment schedule for Shantigram Sky Greens 2 BHK?"),
                    ("ASSISTANT", "Certainly! We offer a milestone-linked payment plan: 10% booking token, 15% on foundation completion, followed by 10% on completion of each residential floor slab, and the final 10% on possession notice."),
                    ("BUYER", "Is GST and stamp duty included in the ₹78 Lakh starting price?"),
                    ("ASSISTANT", "The ₹78 Lakh starting price is the base consideration. Stamp duty (4.9%), registration (1%), and applicable GST (5%) are statutory payments collected as per government norms at registration time."),
                ],
                # 5. Hindi - Amenities & Security
                [
                    ("BUYER", "रिविएरा एलिगेंस में सीनियर सिटीजन और बच्चों के लिए क्या विशेष सुविधाएं हैं?"),
                    ("ASSISTANT", "रिविएरा एलिगेंस में बुजुर्गों के लिए विशेष रिफ्लेक्सोलॉजी पाथवे, शांत गज़ेबो और योग मंडप है। बच्चों के लिए थीम-बेस्ड स्केटिंग रिंग, किड्स पूल और 24x7 सीसीटीवी सर्विलांस युक्त सिक्योर प्ले पार्क है।"),
                ],
                # 6. Gujarati - Location and AUDA RERA
                [
                    ("BUYER", "પ્રોજેક્ટ રેરા રજીસ્ટર્ડ છે કે નહિ? અને એસ.પી. રિંગ રોડ થી કેટલું નજીક છે?"),
                    ("ASSISTANT", "હા, પ્રોજેક્ટ ગુજરાત રેરા માન્ય છે (RERA No: PR/GJ/AHMEDABAD/AHMEDABAD CITY/AUDA/RAA07612/200823). એસ.પી. રિંગ રોડ થી માત્ર 2 મિનિટ અને સાયન્સ સિટી સર્કલ થી 3 મિનિટના અંતરે છે."),
                ],
            ]

            conv_count = 0
            msg_count = 0

            for idx in range(28):
                lead = leads[idx % len(leads)]
                buyer = buyers[idx % len(buyers)]
                proj = session.get(Project, lead.project_id)
                exec_user = executives[idx % len(executives)]

                conv_created = lead.created_at + timedelta(minutes=30)
                conv = Conversation(
                    lead_id=lead.id,
                    project_id=proj.id,
                    buyer_id=buyer.id,
                    status=ConversationStatus.ACTIVE.value if idx % 4 != 0 else ConversationStatus.CLOSED.value,
                    created_at=conv_created,
                    updated_at=conv_created + timedelta(hours=3),
                )
                session.add(conv)
                session.flush()
                conv_count += 1

                # Select template dialog
                dialog_template = multilingual_dialogs[idx % len(multilingual_dialogs)]
                m_time = conv_created
                for s_type, text_content in dialog_template:
                    m_time += timedelta(minutes=4)
                    sender_id = buyer.id if s_type == "BUYER" else (exec_user.id if s_type == "SALES_EXECUTIVE" else None)
                    msg = Message(
                        conversation_id=conv.id,
                        sender_type=s_type,
                        sender_id=sender_id,
                        content=text_content,
                        status=MessageStatus.READ.value,
                        created_at=m_time,
                    )
                    session.add(msg)
                    msg_count += 1

            session.commit()
            print(f"  Successfully seeded {conv_count} conversations with {msg_count} multilingual messages")

        # -------------------------------------------------------------
        # 7. FOLLOW-UPS (DUE TODAY, OVERDUE, UPCOMING, COMPLETED)
        # -------------------------------------------------------------
        print("\n--- 7. Seeding Realistic Sales Follow-ups ---")
        existing_fu = session.query(FollowUp).filter(FollowUp.project_id.in_([p.id for p in projects])).count()
        if existing_fu >= 35:
            print(f"  Existing demo follow-ups verified: {existing_fu}")
        else:
            followup_templates = [
                (FollowUpType.CALL.value, FollowUpPriority.HIGH.value, "Discuss revised cost sheet and bank loan sanction for 3 BHK unit B-602", "Call client at 11 AM; offer free modular kitchen voucher for token this week"),
                (FollowUpType.WHATSAPP.value, FollowUpPriority.MEDIUM.value, "Send high-res master layout plan and brochure PDF via WhatsApp", "Verify receipt and answer queries on possession timeline"),
                (FollowUpType.MEETING.value, FollowUpPriority.HIGH.value, "In-person meeting at sales gallery with family architect for layout customization", "Prepare floor plan blueprints and structural wall specifications"),
                (FollowUpType.CALL.value, FollowUpPriority.LOW.value, "Check back on home loan document collection with HDFC loan officer", "Ensure form 16 and bank statement collected"),
                (FollowUpType.EMAIL.value, FollowUpPriority.MEDIUM.value, "Send payment milestone breakdown and draft agreement of sale", "Track email open and follow up next morning"),
            ]

            fu_count = 0
            for idx in range(40):
                lead = leads[idx % len(leads)]
                exec_user = executives[idx % len(executives)]
                fu_type, fu_prio, note, next_act = followup_templates[idx % len(followup_templates)]

                # Distribute categories:
                # - Past Completed: 18
                # - Overdue (past pending): 8
                # - Due Today (Nov 7): 6
                # - Upcoming (Nov 8-12): 8
                if idx < 18:
                    sched_time = START_DATE + timedelta(days=idx + 2, hours=11)
                    status = FollowUpStatus.COMPLETED.value
                    outcome = (FollowUpOutcome.INTERESTED.value, FollowUpOutcome.CALLBACK_REQUESTED.value, FollowUpOutcome.CONVERTED.value)[idx % 3]
                    completed_at = sched_time + timedelta(hours=1)
                elif idx < 26:
                    sched_time = ANCHOR_NOW - timedelta(days=(idx - 17), hours=2)
                    status = FollowUpStatus.PENDING.value
                    outcome = None
                    completed_at = None
                elif idx < 32:
                    # Due today
                    sched_time = ANCHOR_NOW.replace(hour=14, minute=0)
                    status = FollowUpStatus.PENDING.value
                    outcome = None
                    completed_at = None
                else:
                    # Upcoming
                    sched_time = ANCHOR_NOW + timedelta(days=(idx - 31), hours=3)
                    status = FollowUpStatus.PENDING.value
                    outcome = None
                    completed_at = None

                fu = FollowUp(
                    lead_id=lead.id,
                    project_id=lead.project_id,
                    executive_id=exec_user.id,
                    scheduled_at=sched_time,
                    type=fu_type,
                    priority=fu_prio,
                    status=status,
                    notes=f"[DEMO DATA] {note}",
                    next_action=next_act,
                    outcome=outcome,
                    completed_at=completed_at,
                    created_at=lead.created_at + timedelta(hours=1),
                )
                session.add(fu)
                fu_count += 1

            session.commit()
            print(f"  Successfully seeded {fu_count} follow-ups across all priority states")

        # -------------------------------------------------------------
        # 8. HUMAN HANDOFFS (Escalations from AI to Sales Team)
        # -------------------------------------------------------------
        print("\n--- 8. Seeding Human Handoffs ---")
        existing_handoffs = session.query(Handoff).filter(Handoff.project_id.in_([p.id for p in projects])).count()
        if existing_handoffs >= 8:
            print(f"  Existing demo handoffs verified: {existing_handoffs}")
        else:
            demo_convs = session.query(Conversation).filter(Conversation.project_id.in_([p.id for p in projects])).all()
            handoff_scenarios = [
                (HandoffReason.BUYER_REQUESTED.value, HandoffStatus.RESOLVED.value, "Buyer requested senior sales executive consultation regarding commercial payment milestone flexibility and stamp duty waiver.", "Contacted buyer, agreed on milestone structure with 15% plinth milestone; buyer satisfied."),
                (HandoffReason.COMPLEX_QUERY.value, HandoffStatus.IN_PROGRESS.value, "Buyer inquired regarding Vastu compliance of East-facing Tower C corner unit and feasibility of combining two adjacent 2 BHK units into a 4 BHK.", None),
                (HandoffReason.FACT_UNAVAILABLE.value, HandoffStatus.PENDING.value, "Buyer requested specific technical details regarding transformer substation location and EV fast-charger capacity in basement 2.", None),
                (HandoffReason.BUYER_REQUESTED.value, HandoffStatus.RESOLVED.value, "Buyer requested executive call back to discuss token advance refund policy in case of home loan sanction delay.", "Explained 100% refund guarantee clause within 30 days of loan application; buyer agreed to proceed."),
            ]

            ho_count = 0
            for idx in range(min(len(demo_convs), 9)):
                conv = demo_convs[idx]
                exec_user = executives[idx % len(executives)]
                reason, status, summary, res_note = handoff_scenarios[idx % len(handoff_scenarios)]

                ho_created = conv.created_at + timedelta(hours=1)
                resolved_at = ho_created + timedelta(hours=5) if status == HandoffStatus.RESOLVED.value else None

                ho = Handoff(
                    conversation_id=conv.id,
                    lead_id=conv.lead_id,
                    project_id=conv.project_id,
                    executive_id=exec_user.id,
                    created_by_id=admin_user.id,
                    status=status,
                    reason=reason,
                    summary=f"[DEMO DATA] {summary}",
                    resolution_notes=res_note,
                    assigned_at=ho_created + timedelta(minutes=10),
                    resolved_at=resolved_at,
                    resolved_by_id=exec_user.id if resolved_at else None,
                    created_at=ho_created,
                )
                session.add(ho)
                ho_count += 1
            session.commit()
            print(f"  Successfully seeded {ho_count} human handoffs")

        # -------------------------------------------------------------
        # 9. NOTIFICATIONS & AUDIT TRAIL
        # -------------------------------------------------------------
        print("\n--- 9. Seeding In-App Notifications & Audit Trail ---")
        existing_demo_notifs = session.query(Notification).filter(Notification.project_id.in_([p.id for p in projects])).count()
        if existing_demo_notifs >= 20:
            print(f"  Existing demo notifications verified: {existing_demo_notifs}")
        else:
            notif_templates = [
                (NotificationType.LEAD_ASSIGNED.value, "New High-Intent Lead Assigned", "Lead for 3 BHK luxury configuration has been assigned to your sales queue."),
                (NotificationType.BOOKING_CONFIRMED.value, "Site Visit Confirmed", "Site visit confirmed for sales gallery and model flat inspection."),
                (NotificationType.HANDOFF_ASSIGNED.value, "Conversation Escalation Assigned", "A buyer has requested human sales assistance from the AI assistant."),
                (NotificationType.VISIT_REMINDER_24H.value, "Upcoming Site Visit Reminder (24h)", "Reminder: You have an upcoming site visit scheduled for tomorrow."),
            ]

            notif_count = 0
            for idx in range(30):
                lead = leads[idx % len(leads)]
                exec_user = executives[idx % len(executives)]
                n_type, title, msg = notif_templates[idx % len(notif_templates)]

                n_time = lead.created_at + timedelta(hours=2)
                notif = Notification(
                    user_id=exec_user.id if idx % 2 == 0 else primary_buyer.id,
                    type=n_type,
                    title=f"[DEMO] {title}",
                    message=f"[DEMO DATA] {msg} ({lead.full_name})",
                    is_read=idx % 3 != 0,
                    lead_id=lead.id,
                    project_id=lead.project_id,
                    created_at=n_time,
                )
                session.add(notif)
                notif_count += 1
            session.commit()
            print(f"  Successfully seeded {notif_count} in-app notifications")

        # Audit logs
        demo_resource_ids = ["PRJ_RIVIERA", "AHMEDABAD_SLOTS", "TMPL_VISIT", "ASSIGN_RULES", "SPEND_OCT"]
        existing_demo_logs = session.query(AuditLog).filter(AuditLog.resource_id.in_(demo_resource_ids)).count()
        if existing_demo_logs < len(demo_resource_ids):
            audit_actions = [
                ("PROJECT_FACT_APPROVED", "PROJECT", "PRJ_RIVIERA", {"message": "[DEMO DATA] Approved 2 and 3 BHK specifications and RERA compliance fact sheet."}),
                ("VISIT_SLOT_GENERATION", "SLOTS", "AHMEDABAD_SLOTS", {"message": "[DEMO DATA] Generated recurring daily weekend and weekday slots for Ahmedabad projects."}),
                ("NOTIFICATION_TEMPLATE_UPDATE", "SETTINGS", "TMPL_VISIT", {"message": "[DEMO DATA] Updated 24h SMS and WhatsApp site visit reminder template."}),
                ("LEAD_ASSIGNMENT_RULE_UPDATE", "SETTINGS", "ASSIGN_RULES", {"message": "[DEMO DATA] Updated round-robin lead allocation policy across Ahmedabad executive team."}),
                ("MARKETING_SPEND_RECORDED", "ANALYTICS", "SPEND_OCT", {"message": "[DEMO DATA] Reconciled Meta and Google Ads performance spend for October 2026."}),
            ]
            for idx, (action, r_type, r_id, details) in enumerate(audit_actions):
                if not session.query(AuditLog).filter(AuditLog.resource_id == r_id).first():
                    log_time = START_DATE + timedelta(days=idx * 6, hours=10)
                    log = AuditLog(
                        action=action,
                        actor_id=admin_user.id,
                        actor_name=admin_user.full_name,
                        actor_email=admin_user.email,
                        resource_type=r_type,
                        resource_id=r_id,
                        details=details,
                        created_at=log_time,
                    )
                    session.add(log)
            session.commit()
            print("  Seeded administrative audit trail entries")

        # -------------------------------------------------------------
        # 10. MARKETING SPEND RECORDS (OCT & NOV 2026 ANALYTICS)
        # -------------------------------------------------------------
        print("\n--- 10. Seeding Realistic Marketing Spends (October & November 2026) ---")
        oct_start = date(2026, 10, 1)
        oct_end = date(2026, 10, 31)
        nov_start = date(2026, 11, 1)
        nov_end = date(2026, 11, 30)

        for proj in projects:
            spends = [
                (proj.id, LeadSource.WEBSITE.value, oct_start, oct_end, Decimal("65000.00"), f"[DEMO DATA] Google Ads Search Campaigns (Ahmedabad 2/3 BHK) - {proj.name}"),
                (proj.id, LeadSource.SOCIAL_MEDIA.value, oct_start, oct_end, Decimal("48000.00"), f"[DEMO DATA] Meta Ads (Instagram Feed & Stories) - {proj.name}"),
                (proj.id, LeadSource.PROPERTY_PORTAL.value, oct_start, oct_end, Decimal("55000.00"), f"[DEMO DATA] MagicBricks & 99acres Developer Banner - {proj.name}"),
                (proj.id, LeadSource.WEBSITE.value, nov_start, nov_end, Decimal("70000.00"), f"[DEMO DATA] Google Ads Performance Max - {proj.name}"),
                (proj.id, LeadSource.SOCIAL_MEDIA.value, nov_start, nov_end, Decimal("52000.00"), f"[DEMO DATA] Instagram Video Walkthrough Campaign - {proj.name}"),
            ]
            for p_id, src, s_date, e_date, amt, nts in spends:
                existing_spend = session.query(MarketingSpend).filter(
                    MarketingSpend.project_id == p_id,
                    MarketingSpend.source == src,
                    MarketingSpend.period_start == s_date,
                ).first()
                if not existing_spend:
                    spend = MarketingSpend(
                        project_id=p_id,
                        source=src,
                        period_start=s_date,
                        period_end=e_date,
                        amount=amt,
                        notes=nts,
                        created_by_id=admin_user.id,
                    )
                    session.add(spend)
        session.commit()
        print("  Configured marketing spend records for accurate CPL/CPV analytics")

        # -------------------------------------------------------------
        # 11. RECORD COUNT SUMMARY
        # -------------------------------------------------------------
        print("\n" + "=" * 70)
        print("DEMO ENVIRONMENT SEEDING COMPLETED SUCCESSFULLY!")
        print("=" * 70)

        counts = {
            "Users (Total)": session.query(User).count(),
            "Demo Buyers (@demo.keylo.in)": session.query(User).filter(User.email.like(f"%{DEMO_EMAIL_DOMAIN}")).count(),
            "Projects (Total)": session.query(Project).count(),
            "Ahmedabad Demo Projects": session.query(Project).filter(Project.slug.in_(DEMO_PROJECT_SLUGS)).count(),
            "Project Facts": session.query(ProjectFact).count(),
            "Leads (Total)": session.query(Lead).count(),
            "Ahmedabad Demo Leads": session.query(Lead).filter(Lead.project_id.in_([p.id for p in projects])).count(),
            "Visit Slots": session.query(VisitSlot).count(),
            "Site Visit Bookings": session.query(Booking).count(),
            "Conversations": session.query(Conversation).count(),
            "Messages": session.query(Message).count(),
            "Follow-ups": session.query(FollowUp).count(),
            "Human Handoffs": session.query(Handoff).count(),
            "In-App Notifications": session.query(Notification).count(),
            "Marketing Spend Records": session.query(MarketingSpend).count(),
            "Audit Logs": session.query(AuditLog).count(),
        }

        for entity, cnt in counts.items():
            print(f"  * {entity:30}: {cnt}")

        return counts


def main():
    parser = argparse.ArgumentParser(description="Prepare Keylo Realistic Demo Environment")
    parser.add_argument("--reset", action="store_true", help="Safely reset and remove only generated demo records")
    args = parser.parse_args()

    with SessionLocal() as session:
        if args.reset:
            reset_demo_data(session)
        else:
            seed_demo_environment()


if __name__ == "__main__":
    main()
