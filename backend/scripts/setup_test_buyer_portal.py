"""Script to seed test data for buyer portal verification."""

from datetime import UTC, datetime, timedelta
import uuid

from app.db.session import SessionLocal
from app.modules.projects.models import Project, ProjectFact, FactStatus
from app.modules.leads.models import Lead, LeadSource, LeadStatus
from app.modules.bookings.models import VisitSlot, Booking, BookingStatus
from app.modules.conversations.models import Conversation, ConversationStatus, Message, MessageSenderType, MessageStatus
from app.modules.notifications.models import Notification, NotificationType
from app.modules.users.models import User

def main():
    db = SessionLocal()
    try:
        # 1. Get Greenwood Heights project
        project = db.query(Project).filter(Project.name == "Greenwood Heights").first()
        if not project:
            print("Project Greenwood Heights not found!")
            return

        print(f"Setting up portal data for project: {project.name} ({project.id})")

        # 2. Approve draft facts so buyer can see them
        facts = db.query(ProjectFact).filter(ProjectFact.project_id == project.id).all()
        for fact in facts:
            fact.status = FactStatus.APPROVED.value
        print(f"Approved {len(facts)} facts for {project.name}")

        # 3. Find buyer user
        buyer = db.query(User).filter(User.email == "patilmahantesh642@gmail.com").first()
        if not buyer:
            print("Buyer not found!")
            return

        print(f"Found buyer: {buyer.full_name} ({buyer.email})")

        # 4. Check or create Lead for this buyer
        lead = db.query(Lead).filter(Lead.email == buyer.email, Lead.project_id == project.id).first()
        if not lead:
            lead = Lead(
                id=uuid.uuid4(),
                full_name=buyer.full_name,
                email=buyer.email,
                phone=buyer.phone or "+919876543210",
                project_id=project.id,
                source=LeadSource.WEBSITE.value,
                status=LeadStatus.VISIT_BOOKED.value,
                budget_min=10000000,
                budget_max=15000000,
                preferred_configuration="3 BHK",
                created_at=datetime.now(UTC) - timedelta(days=2),
                updated_at=datetime.now(UTC),
            )
            db.add(lead)
            db.flush()
            print(f"Created Lead: {lead.id}")
        else:
            lead.status = LeadStatus.VISIT_BOOKED.value

        # 5. Check or create Conversation
        conv = db.query(Conversation).filter(Conversation.buyer_id == buyer.id, Conversation.project_id == project.id).first()
        if not conv:
            now = datetime.now(UTC)
            conv = Conversation(
                id=uuid.uuid4(),
                lead_id=lead.id,
                project_id=project.id,
                buyer_id=buyer.id,
                status=ConversationStatus.ACTIVE.value,
                created_at=now - timedelta(days=1),
                updated_at=now - timedelta(hours=2),
            )
            db.add(conv)
            db.flush()

            msg1 = Message(
                id=uuid.uuid4(),
                conversation_id=conv.id,
                sender_type=MessageSenderType.BUYER.value,
                sender_id=buyer.id,
                content="Hello, I am interested in a 3 BHK unit at Greenwood Heights with west-facing balcony.",
                status=MessageStatus.SENT.value,
                created_at=now - timedelta(days=1),
            )
            msg2 = Message(
                id=uuid.uuid4(),
                conversation_id=conv.id,
                sender_type=MessageSenderType.SALES_EXECUTIVE.value,
                sender_id=None,
                content="Welcome to Keylo! We have 3 premium 3 BHK units available in Tower B with panoramic sunset views. Would you like to schedule an in-person site visit?",
                status=MessageStatus.SENT.value,
                created_at=now - timedelta(hours=2),
            )
            db.add_all([msg1, msg2])
            print(f"Created conversation: {conv.id}")

        # 6. Check or create Visit Slots
        now = datetime.now(UTC)
        tomorrow_10am = (now + timedelta(days=2)).replace(hour=10, minute=0, second=0, microsecond=0)
        tomorrow_11am = tomorrow_10am + timedelta(hours=1)

        slot = db.query(VisitSlot).filter(VisitSlot.project_id == project.id, VisitSlot.start_time == tomorrow_10am).first()
        if not slot:
            slot = VisitSlot(
                id=uuid.uuid4(),
                project_id=project.id,
                start_time=tomorrow_10am,
                end_time=tomorrow_11am,
                capacity=5,
                is_active=True,
                notes="Morning slot with model apartment walkthrough.",
                created_at=now,
                updated_at=now,
            )
            db.add(slot)
            db.flush()
            print(f"Created visit slot: {slot.id} for {tomorrow_10am}")

        # 7. Check or create Booking
        booking = db.query(Booking).filter(Booking.buyer_id == buyer.id, Booking.slot_id == slot.id).first()
        if not booking:
            booking = Booking(
                id=uuid.uuid4(),
                slot_id=slot.id,
                lead_id=lead.id,
                project_id=project.id,
                buyer_id=buyer.id,
                executive_id=None,
                status=BookingStatus.CONFIRMED.value,
                notes="Buyer requested 3 BHK model flat walkthrough and floor plans brochure.",
                created_at=now - timedelta(hours=5),
                updated_at=now - timedelta(hours=5),
            )
            db.add(booking)
            db.flush()
            print(f"Created confirmed booking: {booking.id}")

        # 8. Check or create in-app Notifications for buyer
        notif1 = db.query(Notification).filter(Notification.user_id == buyer.id, Notification.type == NotificationType.BOOKING_CONFIRMED.value).first()
        if not notif1:
            notif1 = Notification(
                id=uuid.uuid4(),
                user_id=buyer.id,
                type=NotificationType.BOOKING_CONFIRMED.value,
                title="Site Visit Confirmed",
                message=f"Your visit to Greenwood Heights is confirmed for {tomorrow_10am.strftime('%a, %b %d at %I:%M %p')}. Our concierge team looks forward to hosting you.",
                is_read=False,
                booking_id=booking.id,
                project_id=project.id,
                lead_id=lead.id,
                created_at=now - timedelta(hours=5),
                updated_at=now - timedelta(hours=5),
            )
            db.add(notif1)

        notif2 = db.query(Notification).filter(Notification.user_id == buyer.id, Notification.type == NotificationType.SYSTEM.value).first()
        if not notif2:
            notif2 = Notification(
                id=uuid.uuid4(),
                user_id=buyer.id,
                type=NotificationType.SYSTEM.value,
                title="Welcome to Keylo Concierge",
                message="Your buyer portal is active. You can review verified RERA disclosures and communicate directly with property consultants.",
                is_read=False,
                project_id=project.id,
                created_at=now - timedelta(days=1),
                updated_at=now - timedelta(days=1),
            )
            db.add(notif2)

        db.commit()
        print("Setup completed successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    main()

