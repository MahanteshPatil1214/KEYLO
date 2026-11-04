"""Unit tests for AI Assistant Groq client, prompts, and exception mapping."""

from __future__ import annotations

from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest
from groq import APITimeoutError, GroqError, RateLimitError

from app.modules.ai_assistant.client import GroqClient
from app.modules.ai_assistant.exceptions import (
    GroqAPIError,
    GroqNotConfiguredError,
    GroqRateLimitError,
    GroqTimeoutError,
)
from app.modules.ai_assistant.prompts import (
    FALLBACK_ASSISTANT_REPLY,
    UNCONFIGURED_ASSISTANT_REPLY,
    build_system_message,
    format_approved_facts,
)
from app.modules.projects.schemas import ApprovedFactContent


def test_groq_client_is_configured_property() -> None:
    client_none = GroqClient(api_key=None)
    assert not client_none.is_configured

    client_empty = GroqClient(api_key="   ")
    assert not client_empty.is_configured

    client_valid = GroqClient(api_key="gsk-validkey123")
    assert client_valid.is_configured


def test_groq_client_raises_when_unconfigured() -> None:
    client = GroqClient(api_key=None)
    with pytest.raises(GroqNotConfiguredError):
        client.generate_chat_completion(
            system_prompt="Test",
            messages=[{"role": "user", "content": "Hi"}],
        )


def test_groq_client_timeout_mapping() -> None:
    client = GroqClient(api_key="mock-key")
    mock_groq = MagicMock()
    mock_groq.chat.completions.create.side_effect = APITimeoutError(
        request=MagicMock()
    )
    client._client = mock_groq

    with pytest.raises(GroqTimeoutError):
        client.generate_chat_completion(
            system_prompt="Test",
            messages=[{"role": "user", "content": "Hi"}],
        )


def test_groq_client_rate_limit_mapping() -> None:
    client = GroqClient(api_key="mock-key")
    mock_groq = MagicMock()
    mock_groq.chat.completions.create.side_effect = RateLimitError(
        message="Rate limit exceeded",
        response=MagicMock(status_code=429),
        body={},
    )
    client._client = mock_groq

    with pytest.raises(GroqRateLimitError):
        client.generate_chat_completion(
            system_prompt="Test",
            messages=[{"role": "user", "content": "Hi"}],
        )


def test_groq_client_generic_error_mapping() -> None:
    client = GroqClient(api_key="mock-key")
    mock_groq = MagicMock()
    mock_groq.chat.completions.create.side_effect = GroqError("Unknown API failure")
    client._client = mock_groq

    with pytest.raises(GroqAPIError):
        client.generate_chat_completion(
            system_prompt="Test",
            messages=[{"role": "user", "content": "Hi"}],
        )


def test_groq_client_empty_response_raises_api_error() -> None:
    client = GroqClient(api_key="mock-key")
    mock_groq = MagicMock()
    mock_response = MagicMock()
    mock_response.choices = []
    mock_groq.chat.completions.create.return_value = mock_response
    client._client = mock_groq

    with pytest.raises(GroqAPIError, match="No completion choices"):
        client.generate_chat_completion(
            system_prompt="Test",
            messages=[{"role": "user", "content": "Hi"}],
        )


def test_format_approved_facts_with_and_without_facts() -> None:
    # Empty facts
    empty_result = format_approved_facts([])
    assert "No approved facts are currently available" in empty_result
    assert "sales executive will provide" in empty_result

    # Populated facts
    facts = [
        ApprovedFactContent(
            fact_id=uuid4(),
            category="LOCATION",
            question="Where is it?",
            answer="Pune, Baner.",
        ),
        ApprovedFactContent(
            fact_id=uuid4(),
            category="PRICING",
            question="What is the starting price?",
            answer="Starts from 85 Lakhs indicative.",
        ),
    ]
    formatted = format_approved_facts(facts, project_name="Grand Palms")
    assert "Grand Palms" in formatted
    assert "[LOCATION] Q: Where is it? | A: Pune, Baner." in formatted
    assert "[PRICING] Q: What is the starting price? | A: Starts from 85 Lakhs indicative." in formatted

    # Build system message contains core rules and facts
    system_msg = build_system_message(facts, project_name="Grand Palms")
    assert "STRICT FACT GROUNDING" in system_msg
    assert "NEVER INVENT OR PROMISE INFORMATION" in system_msg
    assert "REQUESTING A HUMAN REPRESENTATIVE" in system_msg
    assert "MULTILINGUAL SUPPORT" in system_msg
    assert "Grand Palms" in system_msg

