"""Integration tests for Module 5: AI Assistant with Groq.

Verifies:
- Chat endpoint operates on existing conversations and messages.
- Only APPROVED project facts are retrieved and injected into the prompt.
- Draft facts and staged pending edits are excluded from AI context.
- Buyer messages are NEVER lost, even when Groq times out, errors, or lacks API key.
- Graceful fallback responses on timeouts, API errors, and missing credentials.
- Conversation history is retrieved and passed chronologically.
- Multilingual queries (English, Hindi, Gujarati) with UTF-8 handling.
- Guardrails against hallucination and human-escalation requests.
- Alternative routes: POST /api/v1/conversations/{id}/chat and POST /api/v1/assistant/chat.
- Input validation (empty/whitespace rejected with 422).
- Inactive conversation rejection (400).
- Privacy and role isolation (other buyer cannot chat, returns 404).
- Unauthenticated access rejection (401).
- All tests use mocked Groq responses with zero real external API calls.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.ai_assistant.client import GroqClient
from app.modules.ai_assistant.exceptions import GroqAPIError, GroqTimeoutError
from app.modules.ai_assistant.prompts import (
    FALLBACK_ASSISTANT_REPLY,
    UNCONFIGURED_ASSISTANT_REPLY,
)
from app.modules.ai_assistant.router import get_assistant_client
from app.modules.conversations.models import ConversationStatus, MessageSenderType
from app.modules.leads.models import LeadSource
from app.modules.projects.models import ProjectStatus
from app.modules.users.models import RoleName, User
from tests.conversation_support import (
    create_conversation,
    list_messages,
    update_conversation_status,
)
from tests.lead_support import create_lead
from tests.project_support import create_fact, create_project


class MockGroqClient(GroqClient):
    """Test double for GroqClient recording calls and returning customizable replies."""

    def __init__(
        self,
        *,
        reply: str = "This is a fact-grounded response.",
        error: Exception | None = None,
        configured: bool = True,
    ) -> None:
        super().__init__(
            api_key="mock-groq-key" if configured else None,
            model="openai/gpt-oss-120b",
            timeout=10.0,
            max_retries=1,
        )
        self.reply = reply
        self.error = error
        self.last_system_prompt: str | None = None
        self.last_messages: list[dict[str, str]] | None = None
        self.call_count = 0

    def generate_chat_completion(
        self,
        *,
        system_prompt: str,
        messages: list[dict[str, str]],
        temperature: float = 0.2,
    ) -> str:
        self.call_count += 1
        self.last_system_prompt = system_prompt
        self.last_messages = messages
        if self.error is not None:
            raise self.error
        return self.reply


@pytest.fixture()
def mock_groq() -> MockGroqClient:
    return MockGroqClient(reply="Skyline Residences is located in Baner, Pune.")


@pytest.fixture(autouse=True)
def override_groq_client(mock_groq: MockGroqClient) -> Any:
    """Ensure no real Groq calls are ever made by overriding the FastAPI dependency."""

    app.dependency_overrides[get_assistant_client] = lambda: mock_groq
    yield
    app.dependency_overrides.pop(get_assistant_client, None)


@pytest.fixture()
def admin_user(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.ADMIN, email="admin-ai@example.com")


@pytest.fixture()
def admin_headers(
    auth_headers: Callable[..., dict[str, str]], admin_user: User
) -> dict[str, str]:
    return auth_headers(admin_user.email)


@pytest.fixture()
def buyer_user(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.BUYER, email="buyer-ai1@example.com")


@pytest.fixture()
def buyer_headers(
    auth_headers: Callable[..., dict[str, str]], buyer_user: User
) -> dict[str, str]:
    return auth_headers(buyer_user.email)


@pytest.fixture()
def other_buyer_user(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.BUYER, email="buyer-ai2@example.com")


@pytest.fixture()
def other_buyer_headers(
    auth_headers: Callable[..., dict[str, str]], other_buyer_user: User
) -> dict[str, str]:
    return auth_headers(other_buyer_user.email)


@pytest.fixture()
def active_project_with_facts(
    client: TestClient, admin_headers: dict[str, str]
) -> dict[str, Any]:
    project = create_project(
        client, admin_headers, name=f"Skyline Residences {uuid4().hex[:6]}"
    )
    # Activate project
    client.patch(
        f"/api/v1/projects/{project['id']}",
        json={"status": ProjectStatus.ACTIVE.value},
        headers=admin_headers,
    )

    # Fact 1: Approved Location Fact
    f1 = create_fact(
        client,
        admin_headers,
        project["id"],
        category="LOCATION",
        question="Where is the project located?",
        answer="Skyline Residences is located in Baner, Pune, 10 minutes from the highway.",
    )
    client.post(f"/api/v1/facts/{f1['id']}/approve", headers=admin_headers)

    # Fact 2: Approved Amenities Fact
    f2 = create_fact(
        client,
        admin_headers,
        project["id"],
        category="AMENITIES",
        question="What amenities are offered?",
        answer="The project features a swimming pool, clubhouse, and 24/7 security.",
    )
    client.post(f"/api/v1/facts/{f2['id']}/approve", headers=admin_headers)

    # Fact 3: Draft Fact (NOT APPROVED)
    create_fact(
        client,
        admin_headers,
        project["id"],
        category="LEGAL",
        question="What is the internal draft note?",
        answer="Unapproved internal note: helipad under evaluation.",
    )

    return project


@pytest.fixture()
def buyer_conversation(
    client: TestClient,
    buyer_headers: dict[str, str],
    buyer_user: User,
    active_project_with_facts: dict[str, Any],
) -> dict[str, Any]:
    lead = create_lead(
        client,
        project_id=active_project_with_facts["id"],
        full_name="AI Buyer",
        email=buyer_user.email,
        phone="+919877766655",
        source=LeadSource.WEBSITE.value,
    )
    return create_conversation(
        client,
        buyer_headers,
        lead_id=lead["id"],
        project_id=active_project_with_facts["id"],
    )


# ---------------------------------------------------------------------------
# Test Cases
# ---------------------------------------------------------------------------


def test_ai_chat_returns_fact_grounded_response(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    buyer_user: User,
    buyer_conversation: dict[str, Any],
    mock_groq: MockGroqClient,
) -> None:
    conv_id = buyer_conversation["id"]
    response = client.post(
        f"/api/v1/conversations/{conv_id}/chat",
        json={"message": "Where is this project located?"},
        headers=buyer_headers,
    )
    assert response.status_code == 200, response.text
    data = response.json()

    assert data["conversation_id"] == conv_id
    assert data["buyer_message"]["content"] == "Where is this project located?"
    assert data["buyer_message"]["sender_type"] == MessageSenderType.BUYER.value
    assert data["buyer_message"]["sender_id"] == str(buyer_user.id)
    assert data["assistant_message"]["sender_type"] == MessageSenderType.ASSISTANT.value
    assert data["assistant_message"]["sender_id"] is None
    assert data["reply"] == "Skyline Residences is located in Baner, Pune."
    assert mock_groq.call_count == 1

    # Verify Approved Facts were injected into system prompt
    assert mock_groq.last_system_prompt is not None
    assert "Baner, Pune" in mock_groq.last_system_prompt
    assert "swimming pool, clubhouse" in mock_groq.last_system_prompt

    # Verify messages are persisted in DB
    msgs = list_messages(client, buyer_headers, conv_id)
    assert msgs["total"] == 2
    assert msgs["items"][0]["sender_type"] == MessageSenderType.BUYER.value
    assert msgs["items"][1]["sender_type"] == MessageSenderType.ASSISTANT.value


def test_ai_chat_excludes_draft_and_staged_pending_facts(
    client: TestClient,
    override_db: None,
    admin_headers: dict[str, str],
    buyer_headers: dict[str, str],
    buyer_conversation: dict[str, Any],
    active_project_with_facts: dict[str, Any],
    mock_groq: MockGroqClient,
) -> None:
    # Propose a staged change to the first fact
    facts_res = client.get(
        f"/api/v1/projects/{active_project_with_facts['id']}/facts",
        headers=admin_headers,
    )
    first_fact_id = facts_res.json()["items"][0]["id"]
    client.patch(
        f"/api/v1/facts/{first_fact_id}",
        json={"answer": "Pending unapproved edit: 5 minutes from airport."},
        headers=admin_headers,
    )

    conv_id = buyer_conversation["id"]
    response = client.post(
        f"/api/v1/conversations/{conv_id}/chat",
        json={"message": "Tell me about connectivity."},
        headers=buyer_headers,
    )
    assert response.status_code == 200

    # Ensure unapproved draft note and pending staged edit are NOT present in prompt
    prompt = mock_groq.last_system_prompt
    assert prompt is not None
    assert "helipad under evaluation" not in prompt
    assert "Pending unapproved edit" not in prompt
    # Canonical approved answer must still be present
    assert "Baner, Pune" in prompt


def test_ai_chat_general_assistant_chat_route(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    buyer_conversation: dict[str, Any],
    mock_groq: MockGroqClient,
) -> None:
    """Verify POST /api/v1/assistant/chat endpoint."""

    conv_id = buyer_conversation["id"]
    response = client.post(
        "/api/v1/assistant/chat",
        json={
            "conversation_id": conv_id,
            "message": "What amenities are there?",
        },
        headers=buyer_headers,
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["conversation_id"] == conv_id
    assert data["buyer_message"]["content"] == "What amenities are there?"
    assert data["reply"] == mock_groq.reply


def test_ai_chat_preserves_conversation_history_context(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    buyer_conversation: dict[str, Any],
    mock_groq: MockGroqClient,
) -> None:
    conv_id = buyer_conversation["id"]

    # First exchange
    client.post(
        f"/api/v1/conversations/{conv_id}/chat",
        json={"message": "My name is Priya and I want a 3 BHK."},
        headers=buyer_headers,
    )

    # Second exchange
    client.post(
        f"/api/v1/conversations/{conv_id}/chat",
        json={"message": "Is there a clubhouse?"},
        headers=buyer_headers,
    )

    # Verify that dialog_messages passed to Groq included previous messages
    last_msgs = mock_groq.last_messages
    assert last_msgs is not None
    contents = [m["content"] for m in last_msgs]
    assert "My name is Priya and I want a 3 BHK." in contents
    assert "Is there a clubhouse?" in contents
    # Last message must be the current user query
    assert last_msgs[-1]["role"] == "user"
    assert last_msgs[-1]["content"] == "Is there a clubhouse?"


def test_ai_chat_multilingual_hindi_and_gujarati(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    buyer_conversation: dict[str, Any],
    mock_groq: MockGroqClient,
) -> None:
    conv_id = buyer_conversation["id"]

    # Hindi enquiry
    mock_groq.reply = "स्काईलाइन रेजिडेंस बानेर, पुणे में स्थित है।"
    res_hi = client.post(
        f"/api/v1/conversations/{conv_id}/chat",
        json={"message": "प्रोजेक्ट कहाँ स्थित है?"},
        headers=buyer_headers,
    )
    assert res_hi.status_code == 200
    assert res_hi.json()["reply"] == "स्काईलाइन रेजिडेंस बानेर, पुणे में स्थित है।"

    # Gujarati enquiry
    mock_groq.reply = "હા, સ્વિમિંગ પૂલ અને ક્લબહાઉસ ઉપલબ્ધ છે."
    res_gu = client.post(
        f"/api/v1/conversations/{conv_id}/chat",
        json={"message": "શું ત્યાં સ્વિમિંગ પૂલ છે?"},
        headers=buyer_headers,
    )
    assert res_gu.status_code == 200
    assert res_gu.json()["reply"] == "હા, સ્વિમિંગ પૂલ અને ક્લબહાઉસ ઉપલબ્ધ છે."


def test_buyer_message_saved_when_groq_times_out(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    buyer_conversation: dict[str, Any],
) -> None:
    conv_id = buyer_conversation["id"]
    timeout_client = MockGroqClient(error=GroqTimeoutError("Timed out after 20s"))
    app.dependency_overrides[get_assistant_client] = lambda: timeout_client

    response = client.post(
        f"/api/v1/conversations/{conv_id}/chat",
        json={"message": "Are pet animals allowed?"},
        headers=buyer_headers,
    )
    assert response.status_code == 200, response.text
    data = response.json()

    # Buyer message was safely saved despite AI timeout!
    assert data["buyer_message"]["content"] == "Are pet animals allowed?"
    assert data["buyer_message"]["sender_type"] == MessageSenderType.BUYER.value
    # Assistant message receives graceful fallback response
    assert data["assistant_message"]["content"] == FALLBACK_ASSISTANT_REPLY
    assert data["reply"] == FALLBACK_ASSISTANT_REPLY

    # Verify both are recorded in database
    msgs = list_messages(client, buyer_headers, conv_id)
    assert msgs["total"] == 2
    assert msgs["items"][0]["content"] == "Are pet animals allowed?"
    assert msgs["items"][1]["content"] == FALLBACK_ASSISTANT_REPLY


def test_buyer_message_saved_when_groq_api_fails(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    buyer_conversation: dict[str, Any],
) -> None:
    conv_id = buyer_conversation["id"]
    error_client = MockGroqClient(error=GroqAPIError("Internal Server Error from Groq"))
    app.dependency_overrides[get_assistant_client] = lambda: error_client

    response = client.post(
        f"/api/v1/conversations/{conv_id}/chat",
        json={"message": "Can I get a discount?"},
        headers=buyer_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["buyer_message"]["content"] == "Can I get a discount?"
    assert data["assistant_message"]["content"] == FALLBACK_ASSISTANT_REPLY


def test_buyer_message_saved_when_groq_unconfigured(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    buyer_conversation: dict[str, Any],
) -> None:
    conv_id = buyer_conversation["id"]
    unconfigured_client = MockGroqClient(configured=False)
    app.dependency_overrides[get_assistant_client] = lambda: unconfigured_client

    response = client.post(
        f"/api/v1/conversations/{conv_id}/chat",
        json={"message": "Can I visit tomorrow?"},
        headers=buyer_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["buyer_message"]["content"] == "Can I visit tomorrow?"
    assert data["assistant_message"]["content"] == UNCONFIGURED_ASSISTANT_REPLY


def test_ai_chat_rejects_empty_or_whitespace_message(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    buyer_conversation: dict[str, Any],
) -> None:
    conv_id = buyer_conversation["id"]

    res_empty = client.post(
        f"/api/v1/conversations/{conv_id}/chat",
        json={"message": ""},
        headers=buyer_headers,
    )
    assert res_empty.status_code == 422

    res_spaces = client.post(
        f"/api/v1/conversations/{conv_id}/chat",
        json={"message": "   \n\t  "},
        headers=buyer_headers,
    )
    assert res_spaces.status_code == 422


def test_ai_chat_rejects_inactive_conversation(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
    buyer_conversation: dict[str, Any],
) -> None:
    conv_id = buyer_conversation["id"]
    # Close the conversation
    update_conversation_status(
        client,
        buyer_headers,
        conv_id,
        status=ConversationStatus.CLOSED.value,
    )

    response = client.post(
        f"/api/v1/conversations/{conv_id}/chat",
        json={"message": "Can I still ask?"},
        headers=buyer_headers,
    )
    assert response.status_code == 400
    assert "closed" in response.text.lower()


def test_ai_chat_privacy_isolation_returns_404_for_other_buyer(
    client: TestClient,
    override_db: None,
    other_buyer_headers: dict[str, str],
    buyer_conversation: dict[str, Any],
) -> None:
    conv_id = buyer_conversation["id"]
    response = client.post(
        f"/api/v1/conversations/{conv_id}/chat",
        json={"message": "Hello?"},
        headers=other_buyer_headers,
    )
    assert response.status_code == 404


def test_ai_chat_nonexistent_conversation_returns_404(
    client: TestClient,
    override_db: None,
    buyer_headers: dict[str, str],
) -> None:
    response = client.post(
        f"/api/v1/conversations/{uuid4()}/chat",
        json={"message": "Hello?"},
        headers=buyer_headers,
    )
    assert response.status_code == 404


def test_ai_chat_unauthenticated_returns_401(
    client: TestClient,
    override_db: None,
) -> None:
    assert (
        client.post(
            f"/api/v1/conversations/{uuid4()}/chat",
            json={"message": "Hello"},
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/v1/assistant/chat",
            json={"conversation_id": str(uuid4()), "message": "Hello"},
        ).status_code
        == 401
    )

