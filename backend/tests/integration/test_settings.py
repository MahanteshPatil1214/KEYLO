"""Integration tests for System Settings, Notification Templates, and Audit Logs."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from collections.abc import Callable
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.modules.settings.models import AuditLog, NotificationTemplate, SystemSetting
from app.modules.users.models import RoleName, User
from tests.support import TEST_PASSWORD


@pytest.fixture()
def admin_user(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.ADMIN)


@pytest.fixture()
def sales_executive_user(user_factory: Callable[..., User]) -> User:
    return user_factory(role=RoleName.SALES_EXECUTIVE)


def test_admin_can_get_all_system_settings(
    client: TestClient,
    admin_user: User,
    auth_headers: Callable[..., dict[str, str]],
    override_db: None,
) -> None:
    headers = auth_headers(admin_user.email)
    resp = client.get("/api/v1/settings", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert "reminders" in data
    assert "ai_assistant" in data
    assert "languages" in data
    assert "lead_assignment" in data

    # Verify reminder defaults
    assert data["reminders"]["enabled_24h"] is True
    assert data["reminders"]["enabled_2h"] is True
    assert "IN_APP" in data["reminders"]["channels"]

    # Verify AI defaults
    assert data["ai_assistant"]["grounding_mode"] == "STRICT_FACTS_ONLY"

    # Verify Language defaults
    lang_codes = [l["code"] for l in data["languages"]["languages"]]
    assert "en" in lang_codes
    assert "hi" in lang_codes


def test_admin_can_update_reminder_settings(
    client: TestClient,
    admin_user: User,
    auth_headers: Callable[..., dict[str, str]],
    override_db: None,
) -> None:
    headers = auth_headers(admin_user.email)
    payload = {
        "enabled_24h": False,
        "enabled_2h": True,
        "channels": ["IN_APP", "WHATSAPP"],
        "advance_hours_first": 48,
        "advance_hours_second": 3,
    }
    resp = client.patch("/api/v1/settings/reminders", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["enabled_24h"] is False
    assert data["channels"] == ["IN_APP", "WHATSAPP"]
    assert data["advance_hours_first"] == 48

    # Verify audit log created
    audit_resp = client.get("/api/v1/settings/audit-logs?action=UPDATE_REMINDER_SETTINGS", headers=headers)
    assert audit_resp.status_code == 200
    logs = audit_resp.json()["items"]
    assert len(logs) >= 1
    assert logs[0]["actor_email"] == admin_user.email


def test_admin_can_trigger_reminder_scan(
    client: TestClient,
    admin_user: User,
    auth_headers: Callable[..., dict[str, str]],
    override_db: None,
) -> None:
    headers = auth_headers(admin_user.email)
    resp = client.post("/api/v1/settings/reminders/trigger", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "dispatched_count" in data
    assert "last_run_at" in data

    # Check that settings were updated with last_run_at
    settings_resp = client.get("/api/v1/settings", headers=headers)
    rem = settings_resp.json()["reminders"]
    assert rem["last_run_at"] is not None


def test_admin_can_update_ai_settings(
    client: TestClient,
    admin_user: User,
    auth_headers: Callable[..., dict[str, str]],
    override_db: None,
) -> None:
    headers = auth_headers(admin_user.email)
    payload = {
        "grounding_mode": "BALANCED",
        "default_temperature": 0.4,
        "max_response_tokens": 600,
        "fallback_reply": "Custom fallback message.",
    }
    resp = client.patch("/api/v1/settings/ai-assistant", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["grounding_mode"] == "BALANCED"
    assert data["default_temperature"] == 0.4
    assert data["fallback_reply"] == "Custom fallback message."


def test_admin_can_update_languages(
    client: TestClient,
    admin_user: User,
    auth_headers: Callable[..., dict[str, str]],
    override_db: None,
) -> None:
    headers = auth_headers(admin_user.email)
    payload = {
        "languages": [
            {"code": "en", "name": "English", "native_name": "English", "is_default": True, "is_enabled": True},
            {"code": "hi", "name": "Hindi", "native_name": "हिन्दी", "is_default": False, "is_enabled": True},
            {"code": "gu", "name": "Gujarati", "native_name": "ગુજરાતી", "is_default": False, "is_enabled": False},
        ]
    }
    resp = client.patch("/api/v1/settings/languages", json=payload, headers=headers)
    assert resp.status_code == 200
    langs = resp.json()["languages"]
    assert len(langs) == 3
    assert langs[2]["is_enabled"] is False


def test_admin_can_update_lead_assignment(
    client: TestClient,
    admin_user: User,
    auth_headers: Callable[..., dict[str, str]],
    override_db: None,
) -> None:
    headers = auth_headers(admin_user.email)
    payload = {
        "strategy": "LOAD_BALANCED",
        "working_hours_enabled": True,
        "working_hours_start": "08:30",
        "working_hours_end": "20:00",
        "unreached_sla_hours": 12,
        "auto_reassignment_enabled": True,
    }
    resp = client.patch("/api/v1/settings/lead-assignment", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["strategy"] == "LOAD_BALANCED"
    assert data["working_hours_start"] == "08:30"
    assert data["unreached_sla_hours"] == 12


def test_admin_can_manage_templates(
    client: TestClient,
    admin_user: User,
    auth_headers: Callable[..., dict[str, str]],
    override_db: None,
) -> None:
    headers = auth_headers(admin_user.email)

    # 1. List templates
    resp = client.get("/api/v1/settings/templates", headers=headers)
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) >= 4

    target = items[0]
    tmpl_id = target["id"]

    # 2. Update template
    update_payload = {
        "title_template": "Updated Title: {project_name}",
        "body_template": "Updated message body for {buyer_name}.",
        "is_active": True,
    }
    patch_resp = client.patch(f"/api/v1/settings/templates/{tmpl_id}", json=update_payload, headers=headers)
    assert patch_resp.status_code == 200
    assert patch_resp.json()["title_template"] == "Updated Title: {project_name}"

    # 3. Reset template
    reset_resp = client.post(f"/api/v1/settings/templates/{tmpl_id}/reset", headers=headers)
    assert reset_resp.status_code == 200
    # Restored to default
    assert reset_resp.json()["title_template"] != "Updated Title: {project_name}"


def test_admin_can_view_system_notifications_and_broadcast(
    client: TestClient,
    admin_user: User,
    sales_executive_user: User,
    auth_headers: Callable[..., dict[str, str]],
    override_db: None,
) -> None:
    admin_headers = auth_headers(admin_user.email)

    # 1. Broadcast notification to ALL
    broadcast_payload = {
        "title": "System Scheduled Maintenance",
        "message": "Routine server maintenance scheduled for 10 PM tonight.",
        "target_role": "ALL",
    }
    b_resp = client.post("/api/v1/settings/notifications/broadcast", json=broadcast_payload, headers=admin_headers)
    assert b_resp.status_code == 201
    assert b_resp.json()["dispatched_count"] >= 2

    # 2. View all system notifications as admin
    sys_resp = client.get("/api/v1/settings/notifications?search=Maintenance", headers=admin_headers)
    assert sys_resp.status_code == 200
    notifs = sys_resp.json()["items"]
    assert len(notifs) >= 1
    assert notifs[0]["title"] == "System Scheduled Maintenance"


def test_non_admin_cannot_access_settings(
    client: TestClient,
    sales_executive_user: User,
    auth_headers: Callable[..., dict[str, str]],
    override_db: None,
) -> None:
    headers = auth_headers(sales_executive_user.email)
    resp = client.get("/api/v1/settings", headers=headers)
    assert resp.status_code == 403

    resp2 = client.get("/api/v1/settings/audit-logs", headers=headers)
    assert resp2.status_code == 403

    resp3 = client.get("/api/v1/settings/templates", headers=headers)
    assert resp3.status_code == 403
