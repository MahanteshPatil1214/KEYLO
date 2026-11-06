"""Seed initial follow-ups for sales demo executive."""

from datetime import UTC, datetime, timedelta
from app.db.session import SessionLocal
from app.modules.follow_ups.models import (
    FollowUp,
    FollowUpOutcome,
    FollowUpPriority,
    FollowUpStatus,
    FollowUpType,
)
from app.modules.leads.models import Lead
from app.modules.users.models import User

def main():
    session = SessionLocal()
    sales_user = session.query(User).filter_by(email="sales.demo@keylo.com").first()
    if not sales_user:
        print("Sales user not found!")
        session.close()
        return

    leads = session.query(Lead).all()
    if len(leads) < 4:
        print("Not enough leads!")
        session.close()
        return

    existing = session.query(FollowUp).filter_by(executive_id=sales_user.id).count()
    if existing > 0:
        print(f"Already have {existing} follow-ups for {sales_user.email}")
        session.close()
        return

    now = datetime.now(UTC)

    fu1 = FollowUp(
        lead_id=leads[0].id,
        project_id=leads[0].project_id,
        executive_id=sales_user.id,
        scheduled_at=now + timedelta(hours=2),
        type=FollowUpType.CALL.value,
        priority=FollowUpPriority.HIGH.value,
        status=FollowUpStatus.PENDING.value,
        notes="Call buyer to confirm price breakdown and discuss bank financing options.",
        next_action="Offer complimentary parking slot if token paid this week.",
    )

    fu2 = FollowUp(
        lead_id=leads[1].id,
        project_id=leads[1].project_id,
        executive_id=sales_user.id,
        scheduled_at=now - timedelta(days=1, hours=2),
        type=FollowUpType.WHATSAPP.value,
        priority=FollowUpPriority.MEDIUM.value,
        status=FollowUpStatus.PENDING.value,
        notes="Send project floor plans and sample unit walkthrough video.",
        next_action="Check if received and answer queries on possession timeline.",
    )

    fu3 = FollowUp(
        lead_id=leads[2].id,
        project_id=leads[2].project_id,
        executive_id=sales_user.id,
        scheduled_at=now + timedelta(days=2, hours=3),
        type=FollowUpType.MEETING.value,
        priority=FollowUpPriority.HIGH.value,
        status=FollowUpStatus.PENDING.value,
        notes="In-person site review meeting with buyer and family architect.",
        next_action="Prepare customized layout options and specification sheet.",
    )

    fu4 = FollowUp(
        lead_id=leads[3].id,
        project_id=leads[3].project_id,
        executive_id=sales_user.id,
        scheduled_at=now - timedelta(days=3),
        type=FollowUpType.CALL.value,
        priority=FollowUpPriority.LOW.value,
        status=FollowUpStatus.COMPLETED.value,
        notes="Follow-up after initial brochure download.",
        outcome=FollowUpOutcome.INTERESTED.value,
        outcome_notes="Buyer interested in 3BHK high floor with east orientation.",
        next_action="Schedule site visit next weekend.",
        completed_at=now - timedelta(days=3, hours=-1),
    )

    session.add_all([fu1, fu2, fu3, fu4])
    session.commit()
    print("Successfully seeded 4 follow-ups for sales.demo@keylo.com!")
    session.close()

if __name__ == "__main__":
    main()
