"""AI Assistant module powered by Groq.

Provides fact-grounded conversational assistance for buyers enquiring about
developer real-estate projects using approved project facts.
"""

from __future__ import annotations

from app.modules.ai_assistant.client import GroqClient, get_groq_client
from app.modules.ai_assistant.router import router

__all__ = [
    "GroqClient",
    "get_groq_client",
    "router",
]

