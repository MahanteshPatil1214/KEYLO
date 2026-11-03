"""Fact CRUD, approval, versioning, and visibility tests."""

from __future__ import annotations

from collections.abc import Callable
from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from app.modules.projects.service import get_approved_facts
from app.modules.users.models import RoleName, User
from tests.project_support import (
    approve_fact,
    create_fact,
    create_project,
    reject_fact,
    update_fact,
)


def test_admin_can_create_draft_fact_with_initial_version(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    headers = auth_headers(admin.email)
    project = create_project(client, headers, status="ACTIVE")

    fact = create_fact(
        client,
        headers,
        project["id"],
        category="location",
        question="Where is the project?",
        answer="The project is in Pune.",
    )

    assert fact["project_id"] == project["id"]
    assert fact["category"] == "LOCATION"
    assert fact["status"] == "DRAFT"
    assert fact["updated_by"] == str(admin.id)
    assert fact["pending_changes"] is None

    versions = client.get(
        f"/api/v1/facts/{fact['id']}/versions",
        headers=headers,
    )
    assert versions.status_code == 200
    assert versions.json()["total"] == 1
    version = versions.json()["items"][0]
    assert version["version_number"] == 1
    assert version["previous_answer"] is None
    assert version["new_answer"] == "The project is in Pune."
    assert version["changed_by"] == str(admin.id)


def test_draft_facts_are_hidden_from_buyers_and_sales(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    buyer = user_factory(role=RoleName.BUYER)
    sales = user_factory(role=RoleName.SALES_EXECUTIVE)
    admin_headers = auth_headers(admin.email)
    buyer_headers = auth_headers(buyer.email)
    sales_headers = auth_headers(sales.email)

    active_project = create_project(client, admin_headers, name="Active", status="ACTIVE")
    draft_project = create_project(client, admin_headers, name="Draft")
    approved_fact = create_fact(
        client,
        admin_headers,
        active_project["id"],
        question="Approved question?",
        answer="Approved answer.",
    )
    approve_fact(client, admin_headers, approved_fact["id"])
    draft_fact = create_fact(
        client,
        admin_headers,
        active_project["id"],
        question="Draft question?",
        answer="Draft answer.",
    )
    draft_project_fact = create_fact(
        client,
        admin_headers,
        draft_project["id"],
        question="Hidden project question?",
        answer="Hidden project answer.",
    )
    approve_fact(client, admin_headers, draft_project_fact["id"])

    buyer_list = client.get(
        f"/api/v1/projects/{active_project['id']}/facts",
        headers=buyer_headers,
    )
    sales_list = client.get(
        f"/api/v1/projects/{active_project['id']}/facts",
        headers=sales_headers,
    )
    admin_list = client.get(
        f"/api/v1/projects/{active_project['id']}/facts",
        headers=admin_headers,
    )
    buyer_draft_detail = client.get(
        f"/api/v1/facts/{draft_fact['id']}",
        headers=buyer_headers,
    )
    buyer_approved_detail = client.get(
        f"/api/v1/facts/{approved_fact['id']}",
        headers=buyer_headers,
    )
    buyer_hidden_project_facts = client.get(
        f"/api/v1/projects/{draft_project['id']}/facts",
        headers=buyer_headers,
    )
    buyer_hidden_project_fact = client.get(
        f"/api/v1/facts/{draft_project_fact['id']}",
        headers=buyer_headers,
    )

    assert buyer_list.status_code == 200
    assert buyer_list.json()["total"] == 1
    assert buyer_list.json()["items"][0]["id"] == approved_fact["id"]
    assert sales_list.json()["total"] == 1
    assert admin_list.json()["total"] == 2
    assert buyer_draft_detail.status_code == 404
    assert buyer_approved_detail.status_code == 200
    assert buyer_approved_detail.json()["updated_by"] is None
    assert buyer_approved_detail.json()["pending_changes"] is None
    assert buyer_hidden_project_facts.status_code == 404
    assert buyer_hidden_project_fact.status_code == 404


def test_fact_approval_and_rejection_control_buyer_visibility(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    buyer = user_factory(role=RoleName.BUYER)
    admin_headers = auth_headers(admin.email)
    buyer_headers = auth_headers(buyer.email)
    project = create_project(client, admin_headers, status="ACTIVE")
    fact = create_fact(client, admin_headers, project["id"])

    approved = approve_fact(client, admin_headers, fact["id"])
    assert approved["status"] == "APPROVED"
    assert client.get(
        f"/api/v1/facts/{fact['id']}", headers=buyer_headers
    ).status_code == 200

    rejected = reject_fact(client, admin_headers, fact["id"])
    assert rejected["status"] == "DRAFT"
    assert rejected["pending_changes"] is None
    assert client.get(
        f"/api/v1/facts/{fact['id']}", headers=buyer_headers
    ).status_code == 404

    rejected_again = reject_fact(client, admin_headers, fact["id"])
    assert rejected_again["status"] == "DRAFT"


def test_editing_approved_fact_stages_changes_until_approved(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    editor = user_factory(role=RoleName.ADMIN)
    approver = user_factory(role=RoleName.ADMIN)
    buyer = user_factory(role=RoleName.BUYER)
    editor_headers = auth_headers(editor.email)
    approver_headers = auth_headers(approver.email)
    buyer_headers = auth_headers(buyer.email)
    project = create_project(client, editor_headers, status="ACTIVE")
    fact = create_fact(
        client,
        editor_headers,
        project["id"],
        question="Old question?",
        answer="Old approved answer.",
    )
    approve_fact(client, editor_headers, fact["id"])

    staged = update_fact(
        client,
        editor_headers,
        fact["id"],
        {"question": "New question?", "answer": "New proposed answer."},
    )

    assert staged["status"] == "APPROVED"
    assert staged["answer"] == "Old approved answer."
    assert staged["question"] == "Old question?"
    assert staged["updated_by"] == str(editor.id)
    assert staged["pending_changes"] == {
        "category": "LOCATION",
        "question": "New question?",
        "answer": "New proposed answer.",
    }

    buyer_view = client.get(
        f"/api/v1/facts/{fact['id']}",
        headers=buyer_headers,
    )
    assert buyer_view.status_code == 200
    assert buyer_view.json()["answer"] == "Old approved answer."
    assert buyer_view.json()["pending_changes"] is None
    versions_before = client.get(
        f"/api/v1/facts/{fact['id']}/versions",
        headers=editor_headers,
    )
    assert versions_before.json()["total"] == 1

    published = approve_fact(client, approver_headers, fact["id"])
    assert published["status"] == "APPROVED"
    assert published["question"] == "New question?"
    assert published["answer"] == "New proposed answer."
    assert published["pending_changes"] is None
    assert published["updated_by"] == str(approver.id)

    buyer_after = client.get(
        f"/api/v1/facts/{fact['id']}",
        headers=buyer_headers,
    )
    assert buyer_after.json()["answer"] == "New proposed answer."

    versions_after = client.get(
        f"/api/v1/facts/{fact['id']}/versions",
        headers=editor_headers,
    )
    assert versions_after.json()["total"] == 2
    latest = versions_after.json()["items"][1]
    assert latest["version_number"] == 2
    assert latest["previous_answer"] == "Old approved answer."
    assert latest["new_answer"] == "New proposed answer."
    assert latest["changed_by"] == str(editor.id)


def test_rejecting_pending_edit_keeps_approved_content_visible(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    buyer = user_factory(role=RoleName.BUYER)
    admin_headers = auth_headers(admin.email)
    buyer_headers = auth_headers(buyer.email)
    project = create_project(client, admin_headers, status="ACTIVE")
    fact = create_fact(
        client,
        admin_headers,
        project["id"],
        answer="Stable approved answer.",
    )
    approve_fact(client, admin_headers, fact["id"])
    update_fact(
        client,
        admin_headers,
        fact["id"],
        {"answer": "Unreviewed replacement."},
    )

    rejected = reject_fact(client, admin_headers, fact["id"])

    assert rejected["status"] == "APPROVED"
    assert rejected["answer"] == "Stable approved answer."
    assert rejected["pending_changes"] is None
    buyer_view = client.get(
        f"/api/v1/facts/{fact['id']}",
        headers=buyer_headers,
    )
    assert buyer_view.status_code == 200
    assert buyer_view.json()["answer"] == "Stable approved answer."
    versions = client.get(
        f"/api/v1/facts/{fact['id']}/versions",
        headers=admin_headers,
    )
    assert versions.json()["total"] == 1

    unpublished = reject_fact(client, admin_headers, fact["id"])
    assert unpublished["status"] == "DRAFT"


def test_draft_edits_only_create_versions_when_answer_changes(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    headers = auth_headers(admin.email)
    project = create_project(client, headers)
    fact = create_fact(
        client,
        headers,
        project["id"],
        question="Initial question?",
        answer="Initial answer.",
    )

    update_fact(
        client,
        headers,
        fact["id"],
        {"question": "Revised question only?"},
    )
    after_question_change = client.get(
        f"/api/v1/facts/{fact['id']}/versions",
        headers=headers,
    )
    assert after_question_change.json()["total"] == 1

    update_fact(client, headers, fact["id"], {"answer": "Second answer."})
    after_answer_change = client.get(
        f"/api/v1/facts/{fact['id']}/versions",
        headers=headers,
    )
    assert after_answer_change.json()["total"] == 2

    update_fact(
        client,
        headers,
        fact["id"],
        {"question": "Revised question only?", "answer": "Second answer."},
    )
    after_unchanged_edit = client.get(
        f"/api/v1/facts/{fact['id']}/versions",
        headers=headers,
    )
    assert after_unchanged_edit.json()["total"] == 2


def test_fact_version_numbers_are_sequential_and_paginated(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    headers = auth_headers(admin.email)
    project = create_project(client, headers, status="ACTIVE")
    fact = create_fact(client, headers, project["id"], answer="Version one.")

    update_fact(client, headers, fact["id"], {"answer": "Version two."})
    update_fact(client, headers, fact["id"], {"answer": "Version three."})
    approve_fact(client, headers, fact["id"])
    update_fact(client, headers, fact["id"], {"answer": "Version four."})
    approve_fact(client, headers, fact["id"])

    first_page = client.get(
        f"/api/v1/facts/{fact['id']}/versions?page=1&page_size=3",
        headers=headers,
    )
    second_page = client.get(
        f"/api/v1/facts/{fact['id']}/versions?page=2&page_size=3",
        headers=headers,
    )

    assert first_page.status_code == 200
    assert first_page.json()["total"] == 4
    assert first_page.json()["pages"] == 2
    assert [item["version_number"] for item in first_page.json()["items"]] == [
        1,
        2,
        3,
    ]
    assert [item["version_number"] for item in second_page.json()["items"]] == [4]
    assert first_page.json()["items"][1]["previous_answer"] == "Version one."
    assert first_page.json()["items"][1]["new_answer"] == "Version two."


def test_fact_role_permissions_and_validation(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    buyer = user_factory(role=RoleName.BUYER)
    sales = user_factory(role=RoleName.SALES_EXECUTIVE)
    admin_headers = auth_headers(admin.email)
    buyer_headers = auth_headers(buyer.email)
    sales_headers = auth_headers(sales.email)
    project = create_project(client, admin_headers, status="ACTIVE")
    fact = create_fact(client, admin_headers, project["id"])
    approve_fact(client, admin_headers, fact["id"])

    buyer_create = client.post(
        f"/api/v1/projects/{project['id']}/facts",
        json={"category": "PRICE", "question": "Price?", "answer": "Ask us."},
        headers=buyer_headers,
    )
    sales_update = client.patch(
        f"/api/v1/facts/{fact['id']}",
        json={"answer": "Sales edit."},
        headers=sales_headers,
    )
    buyer_approve = client.post(
        f"/api/v1/facts/{fact['id']}/approve",
        headers=buyer_headers,
    )
    sales_reject = client.post(
        f"/api/v1/facts/{fact['id']}/reject",
        headers=sales_headers,
    )
    buyer_versions = client.get(
        f"/api/v1/facts/{fact['id']}/versions",
        headers=buyer_headers,
    )
    anonymous_read = client.get(f"/api/v1/facts/{fact['id']}")
    blank_category = client.post(
        f"/api/v1/projects/{project['id']}/facts",
        json={"category": "   ", "question": "Question?", "answer": "Answer."},
        headers=admin_headers,
    )
    forbidden_field = client.post(
        f"/api/v1/projects/{project['id']}/facts",
        json={
            "category": "PRICE",
            "question": "Question?",
            "answer": "Answer.",
            "status": "APPROVED",
        },
        headers=admin_headers,
    )
    empty_update = client.patch(
        f"/api/v1/facts/{fact['id']}",
        json={},
        headers=admin_headers,
    )
    null_answer = client.patch(
        f"/api/v1/facts/{fact['id']}",
        json={"answer": None},
        headers=admin_headers,
    )
    missing_project_fact = client.post(
        "/api/v1/projects/00000000-0000-0000-0000-000000000000/facts",
        json={"category": "PRICE", "question": "Question?", "answer": "Answer."},
        headers=admin_headers,
    )
    missing_fact = client.get(
        "/api/v1/facts/00000000-0000-0000-0000-000000000000",
        headers=admin_headers,
    )

    assert buyer_create.status_code == 403
    assert sales_update.status_code == 403
    assert buyer_approve.status_code == 403
    assert sales_reject.status_code == 403
    assert buyer_versions.status_code == 403
    assert anonymous_read.status_code == 401
    assert blank_category.status_code == 422
    assert forbidden_field.status_code == 422
    assert empty_update.status_code == 422
    assert null_answer.status_code == 422
    assert missing_project_fact.status_code == 404
    assert missing_fact.status_code == 404


def test_inactive_project_and_its_approved_facts_are_hidden_from_non_admins(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    buyer = user_factory(role=RoleName.BUYER)
    sales = user_factory(role=RoleName.SALES_EXECUTIVE)
    admin_headers = auth_headers(admin.email)
    buyer_headers = auth_headers(buyer.email)
    sales_headers = auth_headers(sales.email)
    project = create_project(
        client,
        admin_headers,
        status="INACTIVE",
    )
    fact = create_fact(client, admin_headers, project["id"])
    approve_fact(client, admin_headers, fact["id"])

    assert client.get(
        f"/api/v1/projects/{project['id']}", headers=buyer_headers
    ).status_code == 404
    assert client.get(
        f"/api/v1/projects/{project['id']}/facts", headers=sales_headers
    ).status_code == 404
    assert client.get(
        f"/api/v1/facts/{fact['id']}", headers=buyer_headers
    ).status_code == 404
    assert client.get(
        f"/api/v1/projects/{project['id']}", headers=admin_headers
    ).status_code == 200
    assert client.get(
        f"/api/v1/facts/{fact['id']}", headers=admin_headers
    ).status_code == 200


def test_get_approved_facts_returns_only_published_active_project_content(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
    test_session_factory: sessionmaker[Session],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    headers = auth_headers(admin.email)

    active_project = create_project(client, headers, name="Active", status="ACTIVE")
    inactive_project = create_project(
        client,
        headers,
        name="Inactive",
        status="INACTIVE",
    )
    location_fact = create_fact(
        client,
        headers,
        active_project["id"],
        category="LOCATION",
        question="Where is it?",
        answer="Pune.",
    )
    approve_fact(client, headers, location_fact["id"])
    price_fact = create_fact(
        client,
        headers,
        active_project["id"],
        category="PRICE",
        question="What is the price?",
        answer="On request.",
    )
    approve_fact(client, headers, price_fact["id"])
    draft_fact = create_fact(
        client,
        headers,
        active_project["id"],
        category="LOCATION",
        question="Draft question?",
        answer="Draft answer.",
    )
    inactive_fact = create_fact(
        client,
        headers,
        inactive_project["id"],
        category="LOCATION",
        question="Inactive question?",
        answer="Inactive answer.",
    )
    approve_fact(client, headers, inactive_fact["id"])

    update_fact(
        client,
        headers,
        price_fact["id"],
        {"answer": "Unapproved replacement."},
    )

    with test_session_factory() as session:
        all_approved = get_approved_facts(session, UUID(active_project["id"]))
        location_only = get_approved_facts(
            session,
            UUID(active_project["id"]),
            category="location",
        )
        inactive = get_approved_facts(session, UUID(inactive_project["id"]))
        missing = get_approved_facts(
            session,
            UUID("00000000-0000-0000-0000-000000000000"),
        )

    assert {fact.category for fact in all_approved} == {"LOCATION", "PRICE"}
    assert {fact.answer for fact in all_approved} == {"Pune.", "On request."}
    assert all(fact.fact_id != UUID(draft_fact["id"]) for fact in all_approved)
    assert len(location_only) == 1
    assert location_only[0].answer == "Pune."
    assert inactive == []
    assert missing == []
