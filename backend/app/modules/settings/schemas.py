"""Pydantic schemas for administrative system settings, templates, and audit logs."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Reminder Settings
# ---------------------------------------------------------------------------

class ReminderSettings(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    enabled_24h: bool = True
    enabled_2h: bool = True
    channels: list[str] = Field(default_factory=lambda: ["IN_APP", "SMS", "WHATSAPP"])
    advance_hours_first: int = 24
    advance_hours_second: int = 2
    notify_buyer: bool = True
    notify_executive: bool = True
    last_run_at: datetime | None = None
    last_run_dispatched_count: int = 0


class UpdateReminderSettingsRequest(BaseModel):
    enabled_24h: bool | None = None
    enabled_2h: bool | None = None
    channels: list[str] | None = None
    advance_hours_first: int | None = Field(None, ge=1, le=168)
    advance_hours_second: int | None = Field(None, ge=1, le=24)
    notify_buyer: bool | None = None
    notify_executive: bool | None = None


# ---------------------------------------------------------------------------
# AI Assistant Settings
# ---------------------------------------------------------------------------

class AIAssistantSettings(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    grounding_mode: str = "STRICT_FACTS_ONLY"  # STRICT_FACTS_ONLY | BALANCED
    default_temperature: float = 0.2
    max_response_tokens: int = 500
    fallback_reply: str = (
        "Thank you for your message. Our AI assistant is currently unable to "
        "generate a response, but our sales team has received your inquiry and "
        "a sales executive will confirm the details with you shortly."
    )
    unconfigured_project_reply: str = (
        "Thank you for reaching out! Our sales team has received your inquiry and "
        "a sales executive will connect with you shortly with verified project details."
    )
    multilingual_auto_detect: bool = True


class UpdateAIAssistantSettingsRequest(BaseModel):
    grounding_mode: str | None = None
    default_temperature: float | None = Field(None, ge=0.0, le=1.0)
    max_response_tokens: int | None = Field(None, ge=100, le=2000)
    fallback_reply: str | None = None
    unconfigured_project_reply: str | None = None
    multilingual_auto_detect: bool | None = None


# ---------------------------------------------------------------------------
# Language Settings
# ---------------------------------------------------------------------------

class LanguageItem(BaseModel):
    code: str
    name: str
    native_name: str
    is_default: bool = False
    is_enabled: bool = True


class LanguageSettings(BaseModel):
    languages: list[LanguageItem] = Field(default_factory=list)


class UpdateLanguageSettingsRequest(BaseModel):
    languages: list[LanguageItem]


# ---------------------------------------------------------------------------
# Lead Assignment Settings
# ---------------------------------------------------------------------------

class LeadAssignmentSettings(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    strategy: str = "ROUND_ROBIN"  # ROUND_ROBIN | LOAD_BALANCED | MANUAL_ONLY
    working_hours_enabled: bool = True
    working_hours_start: str = "09:00"
    working_hours_end: str = "19:00"
    unreached_sla_hours: int = 24
    auto_reassignment_enabled: bool = True
    fallback_executive_id: str | None = None


class UpdateLeadAssignmentSettingsRequest(BaseModel):
    strategy: str | None = None
    working_hours_enabled: bool | None = None
    working_hours_start: str | None = None
    working_hours_end: str | None = None
    unreached_sla_hours: int | None = Field(None, ge=1, le=168)
    auto_reassignment_enabled: bool | None = None
    fallback_executive_id: str | None = None


# ---------------------------------------------------------------------------
# Global Settings Aggregation
# ---------------------------------------------------------------------------

class AllSystemSettingsResponse(BaseModel):
    reminders: ReminderSettings
    ai_assistant: AIAssistantSettings
    languages: LanguageSettings
    lead_assignment: LeadAssignmentSettings


# ---------------------------------------------------------------------------
# Notification Templates
# ---------------------------------------------------------------------------

class NotificationTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    type: str
    channel: str
    title_template: str
    body_template: str
    variables: list[str]
    is_active: bool
    updated_at: datetime
    updated_by_name: str | None = None


class NotificationTemplateUpdateRequest(BaseModel):
    title_template: str = Field(..., min_length=1, max_length=255)
    body_template: str = Field(..., min_length=1)
    is_active: bool | None = None


class NotificationTemplateListResponse(BaseModel):
    items: list[NotificationTemplateResponse]
    total: int


# ---------------------------------------------------------------------------
# Audit Logs
# ---------------------------------------------------------------------------

class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    action: str
    actor_id: UUID | None
    actor_name: str
    actor_email: str
    resource_type: str
    resource_id: str | None
    details: dict[str, Any]
    created_at: datetime


class AuditLogListResponse(BaseModel):
    items: list[AuditLogResponse]
    total: int
    page: int
    page_size: int
    pages: int


# ---------------------------------------------------------------------------
# Broadcast & System Notifications
# ---------------------------------------------------------------------------

class BroadcastNotificationRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)
    target_role: str = "ALL"  # ALL | SALES_EXECUTIVE | BUYER | ADMIN


class BroadcastNotificationResponse(BaseModel):
    dispatched_count: int
    message: str


class SystemNotificationItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    recipient_name: str
    recipient_email: str
    recipient_role: str
    type: str
    title: str
    message: str
    is_read: bool
    read_at: datetime | None
    created_at: datetime


class SystemNotificationListResponse(BaseModel):
    items: list[SystemNotificationItem]
    total: int
    page: int
    page_size: int
    pages: int
