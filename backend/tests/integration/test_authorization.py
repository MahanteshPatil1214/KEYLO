"""Authentication and role-authorization tests."""

from __future__ import annotations

from collections.abc import Callable

from fastapi.testclient import TestClient

from app.modules.users.models import RoleName, User


def test_unauthenticated_requests_are_rejected(
    client: TestClient,
    override_db: None,
) -> None:
    users_response = client.get("/api/v1/users")
    me_response = client.get("/api/v1/auth/me")

    assert users_response.status_code == 401
    assert me_response.status_code == 401


def test_buyer_cannot_access_admin_or_other_user_records(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    buyer = user_factory(role=RoleName.BUYER)
    other = user_factory(role=RoleName.BUYER, email="other-buyer@example.com")
    headers = auth_headers(buyer.email)

    listing = client.get("/api/v1/users", headers=headers)
    other_profile = client.get(f"/api/v1/users/{other.id}", headers=headers)
    other_status = client.patch(
        f"/api/v1/users/{other.id}/status",
        json={"is_active": False},
        headers=headers,
    )

    assert listing.status_code == 403
    assert other_profile.status_code == 403
    assert other_status.status_code == 403


def test_sales_executive_cannot_access_admin_endpoints(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    sales = user_factory(role=RoleName.SALES_EXECUTIVE)
    headers = auth_headers(sales.email)

    listing = client.get("/api/v1/users", headers=headers)
    status_update = client.patch(
        f"/api/v1/users/{sales.id}/status",
        json={"is_active": False},
        headers=headers,
    )

    assert listing.status_code == 403
    assert status_update.status_code == 403


def test_admin_can_access_admin_endpoints(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN, email="admin@example.com")
    buyer = user_factory(role=RoleName.BUYER, email="listed@example.com")
    headers = auth_headers(admin.email)

    listing = client.get("/api/v1/users", headers=headers)
    profile = client.get(f"/api/v1/users/{buyer.id}", headers=headers)

    assert listing.status_code == 200
    assert listing.json()["total"] >= 2
    assert profile.status_code == 200
    assert profile.json()["email"] == buyer.email


def test_user_cannot_escalate_their_own_role(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    buyer = user_factory(role=RoleName.BUYER)
    headers = auth_headers(buyer.email)

    response = client.patch(
        f"/api/v1/users/{buyer.id}",
        json={"role": RoleName.ADMIN.value},
        headers=headers,
    )
    profile = client.get("/api/v1/auth/me", headers=headers)

    assert response.status_code == 403
    assert response.json()["error"]["message"] == "You cannot change your own role."
    assert profile.status_code == 200
    assert profile.json()["role"]["name"] == RoleName.BUYER.value


def test_admin_can_change_another_users_role(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN, email="role-admin@example.com")
    buyer = user_factory(role=RoleName.BUYER, email="promoted@example.com")
    headers = auth_headers(admin.email)

    response = client.patch(
        f"/api/v1/users/{buyer.id}",
        json={"role": RoleName.SALES_EXECUTIVE.value},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["role"]["name"] == RoleName.SALES_EXECUTIVE.value


def test_admin_cannot_change_their_own_role(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN, email="self-role-admin@example.com")
    headers = auth_headers(admin.email)

    response = client.patch(
        f"/api/v1/users/{admin.id}",
        json={"role": RoleName.BUYER.value},
        headers=headers,
    )

    assert response.status_code == 403
    assert response.json()["error"]["message"] == "You cannot change your own role."
