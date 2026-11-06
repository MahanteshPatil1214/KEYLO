"""Project CRUD, lifecycle, pagination, and visibility tests."""

from __future__ import annotations

from collections.abc import Callable

from fastapi.testclient import TestClient

from app.modules.users.models import RoleName, User
from tests.project_support import create_project


def test_admin_can_create_project_with_generated_slug(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    headers = auth_headers(admin.email)

    project = create_project(
        client,
        headers,
        name="Skyline Residences",
        description="Premium homes",
        rera_number="P52100012345",
    )

    assert project["name"] == "Skyline Residences"
    assert project["slug"] == "skyline-residences"
    assert project["location"] == "Pune, Maharashtra"
    assert project["description"] == "Premium homes"
    assert project["rera_number"] == "P52100012345"
    assert project["status"] == "DRAFT"
    assert project["created_by"] == str(admin.id)


def test_generated_and_explicit_slugs_remain_unique(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    headers = auth_headers(admin.email)

    first = create_project(client, headers, name="Skyline Residences")
    generated_duplicate = create_project(client, headers, name="Skyline Residences")
    explicit = create_project(client, headers, name="Other", slug="skyline-residences-3")
    conflict = create_project(
        client,
        headers,
        name="Conflicting",
        slug=explicit["slug"],
        expected_status=409,
    )

    assert first["slug"] == "skyline-residences"
    assert generated_duplicate["slug"] == "skyline-residences-2"
    assert explicit["slug"] == "skyline-residences-3"
    assert conflict["error"]["code"] == "CONFLICT"


def test_admin_can_update_project_and_status_transitions_are_validated(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    headers = auth_headers(admin.email)
    project = create_project(client, headers)

    updated = client.patch(
        f"/api/v1/projects/{project['id']}",
        json={
            "name": "Updated Skyline",
            "location": "Mumbai, Maharashtra",
            "status": "ACTIVE",
        },
        headers=headers,
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["name"] == "Updated Skyline"
    assert updated.json()["status"] == "ACTIVE"

    invalid = client.patch(
        f"/api/v1/projects/{project['id']}",
        json={"status": "DRAFT"},
        headers=headers,
    )
    assert invalid.status_code == 400
    assert invalid.json()["error"]["code"] == "BAD_REQUEST"

    inactive = client.patch(
        f"/api/v1/projects/{project['id']}",
        json={"status": "INACTIVE"},
        headers=headers,
    )
    assert inactive.status_code == 200
    assert inactive.json()["status"] == "INACTIVE"

    reactivated = client.patch(
        f"/api/v1/projects/{project['id']}",
        json={"status": "ACTIVE"},
        headers=headers,
    )
    assert reactivated.status_code == 200
    assert reactivated.json()["status"] == "ACTIVE"


def test_project_listing_is_paginated_and_visibility_is_role_aware(
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

    active_one = create_project(client, admin_headers, name="Active One", status="ACTIVE")
    active_two = create_project(client, admin_headers, name="Active Two", status="ACTIVE")
    draft = create_project(client, admin_headers, name="Draft Three")

    admin_page_one = client.get(
        "/api/v1/projects?page=1&page_size=2",
        headers=admin_headers,
    )
    admin_page_two = client.get(
        "/api/v1/projects?page=2&page_size=2",
        headers=admin_headers,
    )
    buyer_list = client.get("/api/v1/projects", headers=buyer_headers)
    buyer_forced_active = client.get(
        "/api/v1/projects?status=DRAFT",
        headers=buyer_headers,
    )
    sales_list = client.get("/api/v1/projects", headers=sales_headers)

    assert admin_page_one.status_code == 200
    assert admin_page_one.json()["total"] == 3
    assert admin_page_one.json()["pages"] == 2
    assert len(admin_page_one.json()["items"]) == 2
    assert len(admin_page_two.json()["items"]) == 1

    assert buyer_list.status_code == 200
    assert buyer_list.json()["total"] == 2
    assert {item["id"] for item in buyer_list.json()["items"]} == {
        active_one["id"],
        active_two["id"],
    }
    assert buyer_forced_active.json()["total"] == 2
    assert sales_list.json()["total"] == 2

    draft_detail = client.get(f"/api/v1/projects/{draft['id']}", headers=buyer_headers)
    active_detail = client.get(
        f"/api/v1/projects/{active_one['id']}",
        headers=buyer_headers,
    )
    admin_draft_detail = client.get(
        f"/api/v1/projects/{draft['id']}",
        headers=admin_headers,
    )
    assert draft_detail.status_code == 404
    assert active_detail.status_code == 200
    assert admin_draft_detail.status_code == 200


def test_project_writes_and_reads_enforce_authentication_and_roles(
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

    anonymous = client.get("/api/v1/projects")
    buyer_create = client.post(
        "/api/v1/projects",
        json={"name": "Forbidden", "location": "Pune"},
        headers=buyer_headers,
    )
    sales_create = client.post(
        "/api/v1/projects",
        json={"name": "Forbidden", "location": "Pune"},
        headers=sales_headers,
    )
    buyer_update = client.patch(
        f"/api/v1/projects/{project['id']}",
        json={"name": "Forbidden Update"},
        headers=buyer_headers,
    )
    sales_read = client.get(
        f"/api/v1/projects/{project['id']}",
        headers=sales_headers,
    )

    assert anonymous.status_code == 401
    assert buyer_create.status_code == 403
    assert sales_create.status_code == 403
    assert buyer_update.status_code == 403
    assert sales_read.status_code == 200


def test_project_payload_validation_and_missing_records(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    headers = auth_headers(admin.email)
    project = create_project(client, headers)

    invalid_slug = client.post(
        "/api/v1/projects",
        json={"name": "Bad Slug", "slug": "Not Valid", "location": "Pune"},
        headers=headers,
    )
    empty_update = client.patch(
        f"/api/v1/projects/{project['id']}",
        json={},
        headers=headers,
    )
    null_required = client.patch(
        f"/api/v1/projects/{project['id']}",
        json={"name": None},
        headers=headers,
    )
    forbidden_field = client.post(
        "/api/v1/projects",
        json={
            "name": "Forged",
            "location": "Pune",
            "created_by": str(admin.id),
        },
        headers=headers,
    )
    invalid_status = client.post(
        "/api/v1/projects",
        json={"name": "Bad Status", "location": "Pune", "status": "LIVE"},
        headers=headers,
    )
    missing = client.get(
        "/api/v1/projects/00000000-0000-0000-0000-000000000000",
        headers=headers,
    )

    assert invalid_slug.status_code == 422
    assert empty_update.status_code == 422
    assert null_required.status_code == 422
    assert forbidden_field.status_code == 422
    assert invalid_status.status_code == 422
    assert missing.status_code == 404


def test_admin_get_project_metrics(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    headers = auth_headers(admin.email)

    create_project(client, headers, name="Metrics Project 1", status="DRAFT")
    create_project(client, headers, name="Metrics Project 2", status="ACTIVE")

    metrics_resp = client.get("/api/v1/projects/metrics", headers=headers)
    assert metrics_resp.status_code == 200
    data = metrics_resp.json()
    assert data["total_projects"] >= 2
    assert data["draft_projects"] >= 1
    assert data["active_projects"] >= 1


def test_admin_can_search_projects(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    headers = auth_headers(admin.email)

    create_project(client, headers, name="Unique Pearl Heights", location="Bangalore, Karnataka")
    create_project(client, headers, name="Emerald Villa Park", location="Hyderabad, Telangana")

    resp = client.get("/api/v1/projects?search=Pearl", headers=headers)
    assert resp.status_code == 200
    results = resp.json()["items"]
    assert any(p["name"] == "Unique Pearl Heights" for p in results)
    assert not any(p["name"] == "Emerald Villa Park" for p in results)
