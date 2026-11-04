"""Business logic and orchestration for the AI Assistant module."""

from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.modules.ai_assistant.client import GroqClient, get_groq_client
from app.modules.ai_assistant.exceptions import (
    AIAssistantException,
    EmptyBuyerMessageError,
)
from app.modules.ai_assistant.prompts import (
    FALLBACK_ASSISTANT_REPLY,
    UNCONFIGURED_ASSISTANT_REPLY,
    build_system_message,
)
from app.modules.ai_assistant.schemas import ChatResponse
from app.modules.conversations import repository as conversations_repository
from app.modules.conversations.exceptions import (
    ConversationInactiveError,
    ConversationNotFoundError,
)
from app.modules.conversations.models import ConversationStatus, MessageSenderType
from app.modules.conversations.schemas import MessageCreateRequest
from app.modules.conversations.service import (
    _get_visible_conversation,
    create_assistant_message,
    create_message,
)
from app.modules.projects.repository import get_project_by_id
from app.modules.projects.service import get_approved_facts
from app.modules.users.models import RoleName, User

logger = logging.getLogger("keylo.ai_assistant.service")


def chat(
    session: Session,
    *,
    actor: User,
    conversation_id: UUID,
    message: str,
    groq_client: GroqClient | None = None,
) -> ChatResponse:
    """Process a buyer chat message with AI generation grounded in approved facts.

    Guarantees:
    - Caller must be authorized to access the conversation.
    - Conversation must be in ACTIVE status.
    - Buyer message is persisted and committed first; it is never lost even if
      the AI generation times out or fails.
    - Only APPROVED project facts are retrieved from Module 2.
    - Contextual history is retrieved from Module 4.
    - Fallback responses are saved and returned on timeouts, missing API keys,
      or Groq failures.
    """

    cleaned_message = message.strip()
    if not cleaned_message:
        raise EmptyBuyerMessageError()

    # 1. Access control and conversation validation
    conversation = _get_visible_conversation(
        session, actor=actor, conversation_id=conversation_id, for_update=True
    )
    if conversation.status != ConversationStatus.ACTIVE.value:
        raise ConversationInactiveError(conversation.status)

    settings = get_settings()

    # 2. Persist the buyer's message first (Never lose buyer enquiry)
    sender_type = (
        MessageSenderType.BUYER
        if actor.role.name == RoleName.BUYER.value
        else None
    )
    buyer_msg_payload = MessageCreateRequest(
        content=cleaned_message,
        sender_type=sender_type,
    )
    buyer_message = create_message(
        session,
        actor=actor,
        conversation_id=conversation.id,
        payload=buyer_msg_payload,
    )

    # 3. Retrieve approved project facts (Module 2 service boundary)
    approved_facts = get_approved_facts(session, conversation.project_id)
    project = get_project_by_id(session, conversation.project_id)
    project_name = project.name if project else None

    # 4. Fetch past messages for conversational context
    history_limit = settings.assistant_max_history_messages
    past_messages = conversations_repository.list_messages(
        session,
        conversation_id=conversation.id,
        offset=0,
        limit=history_limit + 1,
        order="desc",
    )
    # Reverse to chronological order
    chronological = list(reversed(past_messages))

    dialog_messages: list[dict[str, str]] = []
    for msg in chronological:
        # Exclude the current newly posted message from the history loop
        if msg.id == buyer_message.id:
            continue
        if msg.sender_type == MessageSenderType.BUYER.value:
            dialog_messages.append({"role": "user", "content": msg.content})
        elif msg.sender_type == MessageSenderType.ASSISTANT.value:
            dialog_messages.append({"role": "assistant", "content": msg.content})
        elif msg.sender_type in (
            MessageSenderType.SALES_EXECUTIVE.value,
            MessageSenderType.SYSTEM.value,
        ):
            dialog_messages.append(
                {"role": "assistant", "content": f"[Sales Team Note]: {msg.content}"}
            )

    # Append current buyer message
    dialog_messages.append({"role": "user", "content": buyer_message.content})

    # 5. Build system prompt and call Groq
    system_prompt = build_system_message(approved_facts, project_name=project_name)

    client = groq_client if groq_client is not None else get_groq_client()
    assistant_reply_text: str

    if not client.is_configured:
        logger.warning(
            "Groq API key not configured; generating graceful unconfigured response."
        )
        assistant_reply_text = UNCONFIGURED_ASSISTANT_REPLY
    else:
        try:
            assistant_reply_text = client.generate_chat_completion(
                system_prompt=system_prompt,
                messages=dialog_messages,
                temperature=settings.assistant_temperature,
            )
        except (AIAssistantException, Exception) as exc:
            logger.error("AI assistant completion failed: %s", exc)
            assistant_reply_text = FALLBACK_ASSISTANT_REPLY

    # 6. Save assistant message via Module 4
    assistant_message = create_assistant_message(
        session,
        conversation_id=conversation.id,
        content=assistant_reply_text,
    )

    # 7. Check if human handoff should be flagged automatically
    from app.modules.handoffs.models import HandoffReason
    from app.modules.handoffs.service import create_auto_handoff

    handoff_reason: HandoffReason | None = None
    if not client.is_configured or assistant_reply_text == FALLBACK_ASSISTANT_REPLY:
        handoff_reason = HandoffReason.AI_FALLBACK
    elif any(
        term in cleaned_message.lower()
        for term in (
            "human",
            "executive",
            "representative",
            "agent",
            "call me",
            "speak to",
            "talk to",
            "contact me",
        )
    ):
        handoff_reason = HandoffReason.BUYER_REQUESTED
    elif not approved_facts or any(
        phrase in assistant_reply_text.lower()
        for phrase in (
            "sales executive will confirm",
            "sales executive will connect",
            "not in the verified project fact sheet",
            "currently unavailable",
            "not available",
        )
    ):
        handoff_reason = HandoffReason.FACT_UNAVAILABLE

    if handoff_reason is not None:
        try:
            create_auto_handoff(
                session,
                conversation_id=conversation.id,
                reason=handoff_reason,
                notify_conversation=False,
            )
        except Exception as exc:
            logger.warning("Could not auto-flag handoff: %s", exc)

    return ChatResponse(
        conversation_id=conversation.id,
        buyer_message=buyer_message,
        assistant_message=assistant_message,
        reply=assistant_message.content,
    )

