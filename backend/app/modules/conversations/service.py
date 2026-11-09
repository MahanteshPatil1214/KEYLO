"""Business logic and authorization for conversations and messages."""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.conversations import repository
from app.modules.conversations.exceptions import (
    ConversationInactiveError,
    ConversationNotFoundError,
    ConversationOwnershipError,
    EmptyMessageError,
    InvalidLeadProjectAssociationError,
    InvalidSenderTypeError,
    LeadNotActiveProjectError,
    MessageNotFoundError,
)
from app.modules.conversations.models import (
    Conversation,
    ConversationStatus,
    Message,
    MessageSenderType,
    MessageStatus,
    utcnow,
)
from app.modules.conversations.schemas import (
    ConversationCreateRequest,
    ConversationListResponse,
    ConversationResponse,
    ConversationStatusUpdateRequest,
    MessageCreateRequest,
    MessageListResponse,
    MessageResponse,
)
from app.modules.leads.exceptions import LeadNotFoundError
from app.modules.leads.models import Lead, LeadStatus
from app.modules.leads.repository import find_leads_by_email, get_lead_by_id
from app.modules.leads.schemas import normalize_email, normalize_phone
from app.modules.projects.exceptions import ProjectNotFoundError
from app.modules.projects.models import ProjectStatus
from app.modules.projects.repository import get_project_by_id
from app.modules.users import repository as users_repository
from app.modules.users.models import RoleName, User


def _is_admin(user: User) -> bool:
    return user.role.name == RoleName.ADMIN.value


def _pages(total: int, page_size: int) -> int:
    return (total + page_size - 1) // page_size if total else 0


def _get_visible_conversation(
    session: Session,
    *,
    actor: User,
    conversation_id: UUID,
    for_update: bool = False,
) -> Conversation:
    """Return a conversation only when authorized for the actor."""

    conversation = repository.get_conversation_by_id(
        session, conversation_id, for_update=for_update
    )
    if conversation is None:
        raise ConversationNotFoundError()

    if _is_admin(actor):
        return conversation

    if actor.role.name == RoleName.BUYER.value:
        if conversation.buyer_id != actor.id:
            raise ConversationNotFoundError()
        return conversation

    if actor.role.name == RoleName.SALES_EXECUTIVE.value:
        lead = conversation.lead
        if lead.project.status != ProjectStatus.ACTIVE.value:
            raise ConversationNotFoundError()
        if (
            lead.current_assignment is None
            or lead.current_assignment.executive_id != actor.id
        ):
            raise ConversationNotFoundError()
        return conversation

    raise ConversationNotFoundError()


def create_conversation(
    session: Session,
    *,
    actor: User,
    payload: ConversationCreateRequest,
) -> ConversationResponse:
    """Initiate a conversation with validation of lead, project, and buyer."""

    project = get_project_by_id(session, payload.project_id)
    if project is None or (
        not _is_admin(actor) and project.status != ProjectStatus.ACTIVE.value
    ):
        raise ProjectNotFoundError()

    lead = get_lead_by_id(session, payload.lead_id)
    if lead is None:
        raise LeadNotFoundError()

    if lead.project_id != project.id:
        raise InvalidLeadProjectAssociationError()

    # Determine and validate buyer association
    if actor.role.name == RoleName.BUYER.value:
        buyer_id = actor.id
        # Validate that the buyer matches the contact on the lead if lead has contact details
        if lead.email and lead.email != actor.email:
            raise ConversationOwnershipError(
                "You cannot start a conversation for a lead belonging to another email."
            )
    elif _is_admin(actor):
        if payload.buyer_id is not None:
            buyer = users_repository.get_user_by_id(session, payload.buyer_id)
            if buyer is None or not buyer.is_active:
                raise ConversationOwnershipError("Invalid or inactive buyer_id specified.")
            buyer_id = buyer.id
        else:
            # Resolve by lead email if a registered user exists
            buyer = (
                users_repository.get_user_by_email(session, lead.email)
                if lead.email
                else None
            )
            if buyer is not None:
                buyer_id = buyer.id
            else:
                raise ConversationOwnershipError(
                    "buyer_id is required when lead does not belong to an existing registered user."
                )
    elif actor.role.name == RoleName.SALES_EXECUTIVE.value:
        if project.status != ProjectStatus.ACTIVE.value:
            raise LeadNotActiveProjectError()
        if (
            lead.current_assignment is None
            or lead.current_assignment.executive_id != actor.id
        ):
            raise ConversationOwnershipError(
                "Sales executives can only start conversations for leads assigned to them."
            )
        buyer = (
            users_repository.get_user_by_email(session, lead.email)
            if lead.email
            else None
        )
        if buyer is not None:
            buyer_id = buyer.id
        elif payload.buyer_id is not None:
            buyer_id = payload.buyer_id
        else:
            raise ConversationOwnershipError(
                "A registered buyer account is required to start a conversation for this lead."
            )
    else:
        raise ConversationOwnershipError()

    now = utcnow()
    conversation = Conversation(
        lead_id=lead.id,
        project_id=project.id,
        buyer_id=buyer_id,
        status=ConversationStatus.ACTIVE.value,
        created_at=now,
        updated_at=now,
    )
    session.add(conversation)
    session.flush()

    if payload.initial_message:
        sender_type = (
            MessageSenderType.BUYER
            if actor.role.name == RoleName.BUYER.value
            else (
                MessageSenderType.SALES_EXECUTIVE
                if actor.role.name == RoleName.SALES_EXECUTIVE.value
                else MessageSenderType.SYSTEM
            )
        )
        message = Message(
            conversation_id=conversation.id,
            sender_type=sender_type.value,
            sender_id=actor.id,
            content=payload.initial_message.strip(),
            status=MessageStatus.SENT.value,
            created_at=now,
        )
        session.add(message)

    session.commit()
    session.refresh(conversation)
    return ConversationResponse.model_validate(conversation)


def start_conversation(
    session: Session,
    *,
    actor: User,
    payload: ConversationStartRequest,
) -> ConversationResponse:
    """Start a conversation for a project, creating a lead if needed.

    If the buyer already has a lead for this project (matched by email),
    that lead is reused. Otherwise a new lead is created. A conversation
    is then created linking the buyer, lead, and project so the buyer can
    immediately chat about that specific project.
    """

    project = get_project_by_id(session, payload.project_id)
    if project is None or (
        not _is_admin(actor) and project.status != ProjectStatus.ACTIVE.value
    ):
        raise ProjectNotFoundError()

    email_value = normalize_email(payload.email)
    phone_value = normalize_phone(payload.phone) if payload.phone else None

    if email_value is None and phone_value is None:
        raise ConversationOwnershipError(
            "At least one contact method (email or phone) is required."
        )

    # Reuse an existing lead for this buyer on this project, if any.
    lead = None
    if email_value:
        existing = find_leads_by_email(session, email=email_value)
        for candidate in existing:
            if candidate.project_id == project.id:
                lead = candidate
                break

    if lead is None:
        # Create a new lead for this project (no cross-project duplicate
        # check: a buyer may have separate leads on different projects).
        now = utcnow()
        lead = Lead(
            full_name=payload.full_name,
            email=email_value,
            phone=phone_value,
            project_id=project.id,
            source=payload.source.value,
            status=LeadStatus.NEW.value,
            consent_to_contact=payload.consent_to_contact,
            opted_out=not payload.consent_to_contact,
            created_at=now,
            updated_at=now,
        )
        session.add(lead)
        session.flush()

    # Determine and validate buyer association
    if actor.role.name == RoleName.BUYER.value:
        buyer_id = actor.id
        if lead.email and lead.email != actor.email:
            raise ConversationOwnershipError(
                "You cannot start a conversation for a lead belonging to another email."
            )
    elif _is_admin(actor):
        buyer_id = actor.id
    elif actor.role.name == RoleName.SALES_EXECUTIVE.value:
        if project.status != ProjectStatus.ACTIVE.value:
            raise LeadNotActiveProjectError()
        buyer = (
            users_repository.get_user_by_email(session, lead.email)
            if lead.email
            else None
        )
        if buyer is not None:
            buyer_id = buyer.id
        else:
            raise ConversationOwnershipError(
                "A registered buyer account is required to start a conversation for this lead."
            )
    else:
        raise ConversationOwnershipError()

    now = utcnow()
    conversation = Conversation(
        lead_id=lead.id,
        project_id=project.id,
        buyer_id=buyer_id,
        status=ConversationStatus.ACTIVE.value,
        created_at=now,
        updated_at=now,
    )
    session.add(conversation)
    session.flush()

    if payload.initial_message:
        sender_type = (
            MessageSenderType.BUYER
            if actor.role.name == RoleName.BUYER.value
            else (
                MessageSenderType.SALES_EXECUTIVE
                if actor.role.name == RoleName.SALES_EXECUTIVE.value
                else MessageSenderType.SYSTEM
            )
        )
        message = Message(
            conversation_id=conversation.id,
            sender_type=sender_type.value,
            sender_id=actor.id,
            content=payload.initial_message.strip(),
            status=MessageStatus.SENT.value,
            created_at=now,
        )
        session.add(message)

    session.commit()
    session.refresh(conversation)
    return ConversationResponse.model_validate(conversation)


def get_conversation(
    session: Session,
    *,
    actor: User,
    conversation_id: UUID,
) -> ConversationResponse:
    """Return a single conversation by ID if authorized."""

    conversation = _get_visible_conversation(
        session, actor=actor, conversation_id=conversation_id
    )
    return ConversationResponse.model_validate(conversation)


def list_conversations(
    session: Session,
    *,
    actor: User,
    page: int,
    page_size: int,
    project_id: UUID | None = None,
    lead_id: UUID | None = None,
    status: ConversationStatus | None = None,
) -> ConversationListResponse:
    """Return a paginated list of conversations visible to the caller."""

    if _is_admin(actor):
        buyer_filter = None
        executive_filter = None
        active_project_only = False
    elif actor.role.name == RoleName.BUYER.value:
        buyer_filter = actor.id
        executive_filter = None
        active_project_only = False
    elif actor.role.name == RoleName.SALES_EXECUTIVE.value:
        buyer_filter = None
        executive_filter = actor.id
        active_project_only = True
    else:
        return ConversationListResponse(
            items=[], total=0, page=page, page_size=page_size, pages=0
        )

    total = repository.count_conversations(
        session,
        buyer_id=buyer_filter,
        assigned_executive_id=executive_filter,
        project_id=project_id,
        lead_id=lead_id,
        status=status,
        active_project_only=active_project_only,
    )
    items = repository.list_conversations(
        session,
        offset=(page - 1) * page_size,
        limit=page_size,
        buyer_id=buyer_filter,
        assigned_executive_id=executive_filter,
        project_id=project_id,
        lead_id=lead_id,
        status=status,
        active_project_only=active_project_only,
    )
    return ConversationListResponse(
        items=[ConversationResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=_pages(total, page_size),
    )


def update_conversation_status(
    session: Session,
    *,
    actor: User,
    conversation_id: UUID,
    payload: ConversationStatusUpdateRequest,
) -> ConversationResponse:
    """Update conversation lifecycle status."""

    conversation = _get_visible_conversation(
        session, actor=actor, conversation_id=conversation_id, for_update=True
    )
    requested = payload.status

    if not _is_admin(actor):
        # Non-admins cannot set ARCHIVED
        if requested == ConversationStatus.ARCHIVED:
            raise InvalidSenderTypeError(
                "Only administrators can archive conversations."
            )

    if conversation.status == requested.value:
        return ConversationResponse.model_validate(conversation)

    conversation.status = requested.value
    conversation.updated_at = utcnow()
    session.commit()
    session.refresh(conversation)
    return ConversationResponse.model_validate(conversation)


def create_message(
    session: Session,
    *,
    actor: User,
    conversation_id: UUID,
    payload: MessageCreateRequest,
) -> MessageResponse:
    """Post a new message to an active conversation."""

    conversation = _get_visible_conversation(
        session, actor=actor, conversation_id=conversation_id, for_update=True
    )
    if conversation.status != ConversationStatus.ACTIVE.value:
        raise ConversationInactiveError(conversation.status)

    content = payload.content.strip()
    if not content:
        raise EmptyMessageError()

    # Determine sender type based on role and payload
    if actor.role.name == RoleName.BUYER.value:
        if (
            payload.sender_type is not None
            and payload.sender_type != MessageSenderType.BUYER
        ):
            raise InvalidSenderTypeError("Buyers can only post messages as BUYER.")
        sender_type = MessageSenderType.BUYER
        sender_id = actor.id
    elif actor.role.name == RoleName.SALES_EXECUTIVE.value:
        if (
            payload.sender_type is not None
            and payload.sender_type != MessageSenderType.SALES_EXECUTIVE
        ):
            raise InvalidSenderTypeError(
                "Sales executives can only post messages as SALES_EXECUTIVE."
            )
        sender_type = MessageSenderType.SALES_EXECUTIVE
        sender_id = actor.id
    elif _is_admin(actor):
        sender_type = payload.sender_type or MessageSenderType.SYSTEM
        sender_id = (
            actor.id
            if sender_type
            in (MessageSenderType.SALES_EXECUTIVE, MessageSenderType.SYSTEM)
            else None
        )
    else:
        raise InvalidSenderTypeError()

    now = utcnow()
    message = Message(
        conversation_id=conversation.id,
        sender_type=sender_type.value,
        sender_id=sender_id,
        content=content,
        status=MessageStatus.SENT.value,
        created_at=now,
    )
    session.add(message)
    conversation.updated_at = now
    session.commit()
    session.refresh(message)
    return MessageResponse.model_validate(message)


def create_assistant_message(
    session: Session,
    *,
    conversation_id: UUID,
    content: str,
) -> MessageResponse:
    """Post an assistant message to an active conversation."""

    conversation = repository.get_conversation_by_id(
        session, conversation_id, for_update=True
    )
    if conversation is None:
        raise ConversationNotFoundError()
    if conversation.status != ConversationStatus.ACTIVE.value:
        raise ConversationInactiveError(conversation.status)

    cleaned = content.strip()
    if not cleaned:
        raise EmptyMessageError()

    now = utcnow()
    message = Message(
        conversation_id=conversation.id,
        sender_type=MessageSenderType.ASSISTANT.value,
        sender_id=None,
        content=cleaned,
        status=MessageStatus.SENT.value,
        created_at=now,
    )
    session.add(message)
    conversation.updated_at = now
    session.commit()
    session.refresh(message)
    return MessageResponse.model_validate(message)


def create_system_message(
    session: Session,
    *,
    conversation_id: UUID,
    content: str,
) -> MessageResponse:
    """Post an automated system notice to an active conversation."""

    conversation = repository.get_conversation_by_id(
        session, conversation_id, for_update=True
    )
    if conversation is None:
        raise ConversationNotFoundError()
    if conversation.status != ConversationStatus.ACTIVE.value:
        raise ConversationInactiveError(conversation.status)

    cleaned = content.strip()
    if not cleaned:
        raise EmptyMessageError()

    now = utcnow()
    message = Message(
        conversation_id=conversation.id,
        sender_type=MessageSenderType.SYSTEM.value,
        sender_id=None,
        content=cleaned,
        status=MessageStatus.SENT.value,
        created_at=now,
    )
    session.add(message)
    conversation.updated_at = now
    session.commit()
    session.refresh(message)
    return MessageResponse.model_validate(message)


def list_messages(
    session: Session,
    *,
    actor: User,
    conversation_id: UUID,
    page: int,
    page_size: int,
    order: Literal["asc", "desc"] = "asc",
) -> MessageListResponse:
    """Return paginated messages for an authorized conversation."""

    _get_visible_conversation(
        session, actor=actor, conversation_id=conversation_id
    )
    total = repository.count_messages(session, conversation_id)
    items = repository.list_messages(
        session,
        conversation_id=conversation_id,
        offset=(page - 1) * page_size,
        limit=page_size,
        order=order,
    )
    return MessageListResponse(
        items=[MessageResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=_pages(total, page_size),
    )


def get_message(
    session: Session,
    *,
    actor: User,
    message_id: UUID,
) -> MessageResponse:
    """Return an individual message if authorized to view its conversation."""

    message = repository.get_message_by_id(session, message_id)
    if message is None:
        raise MessageNotFoundError()

    _get_visible_conversation(
        session, actor=actor, conversation_id=message.conversation_id
    )
    return MessageResponse.model_validate(message)

