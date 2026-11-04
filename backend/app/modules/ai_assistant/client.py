"""Groq API client wrapper with timeout, retry, and exception mapping."""

from __future__ import annotations

import logging
from typing import Any

from groq import (
    APIConnectionError,
    APIError,
    APITimeoutError,
    Groq,
    GroqError,
    RateLimitError,
)

from app.core.config import get_settings
from app.modules.ai_assistant.exceptions import (
    GroqAPIError,
    GroqNotConfiguredError,
    GroqRateLimitError,
    GroqTimeoutError,
)

logger = logging.getLogger("keylo.ai_assistant.client")


class GroqClient:
    """Production wrapper around official Groq Python SDK."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str = "openai/gpt-oss-120b",
        timeout: float = 20.0,
        max_retries: int = 2,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self.max_retries = max_retries
        self._client: Groq | None = None

    @property
    def is_configured(self) -> bool:
        """Return True if an API key is present."""

        return bool(self.api_key and self.api_key.strip())

    def _get_client(self) -> Groq:
        if not self.is_configured:
            raise GroqNotConfiguredError("Groq API key is not configured.")
        if self._client is None:
            self._client = Groq(
                api_key=self.api_key,
                timeout=self.timeout,
                max_retries=self.max_retries,
            )
        return self._client

    def generate_chat_completion(
        self,
        *,
        system_prompt: str,
        messages: list[dict[str, str]],
        temperature: float = 0.2,
    ) -> str:
        """Call Groq chat completion endpoint with formatted system and dialog messages."""

        client = self._get_client()
        formatted_messages = [
            {"role": "system", "content": system_prompt}
        ] + messages

        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=formatted_messages,
                temperature=temperature,
            )
            if not response.choices:
                raise GroqAPIError("No completion choices returned by Groq.")
            choice = response.choices[0]
            if not choice.message or not choice.message.content:
                raise GroqAPIError("Empty message content returned by Groq.")
            return choice.message.content.strip()
        except APITimeoutError as exc:
            logger.warning("Groq API request timed out: %s", exc)
            raise GroqTimeoutError(str(exc)) from exc
        except RateLimitError as exc:
            logger.warning("Groq API rate limit exceeded: %s", exc)
            raise GroqRateLimitError(str(exc)) from exc
        except GroqError as exc:
            logger.warning("Groq API error: %s", exc)
            raise GroqAPIError(str(exc)) from exc
        except Exception as exc:
            logger.error("Unexpected error during Groq API call: %s", exc)
            raise GroqAPIError(str(exc)) from exc


def get_groq_client() -> GroqClient:
    """Factory creating a GroqClient from application settings."""

    settings = get_settings()
    api_key = (
        settings.groq_api_key.get_secret_value()
        if settings.groq_api_key is not None
        else None
    )
    return GroqClient(
        api_key=api_key,
        model=settings.groq_model,
        timeout=settings.groq_timeout_seconds,
        max_retries=settings.groq_max_retries,
    )

