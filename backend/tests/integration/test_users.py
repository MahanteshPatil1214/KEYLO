"""User profile and administrator user-management tests."""

from __future__ import annotations

from collections.abc import Callable
from uuid import uuid4

from fastapi.testclient import TestClient

from app.modules.users.models import RoleName, User
from tests.support import TEST_PASSWORD


def test_current_user_can_view_own_profile(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    buyer = user_factory(
        role=RoleName.BUYER,
        email="profile@example.com",
        full_name="Profile Buyer",
        phone="+91 90000 00000",
    )
    headers = auth_headers(buyer.email)

    me_response = client.get("/api/v1/auth/me", headers=headers)
    user_response = client.get(f"/api/v1/users/{buyer.id}", headers=headers)

    assert me_response.status_code == 200
    assert user_response.status_code == 200
    assert me_response.json()["email"] == buyer.email
    assert user_response.json()["full_name"] == "Profile Buyer"
    assert "password" not in user_response.text


def test_user_can_update_permitted_profile_fields(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    buyer = user_factory(email="update-profile@example.com")
    headers = auth_headers(buyer.email)

    response = client.patch(
        f"/api/v1/users/{buyer.id}",
        json={"full_name": "Updated Name", "phone": "+91 98888 77777"},
        headers=headers,
    )
    profile = client.get("/api/v1/auth/me", headers=headers)

    assert response.status_code == 200
    assert response.json()["full_name"] == "Updated Name"
    assert response.json()["phone"] == "+91 98888 77777"
    assert profile.json()["full_name"] == "Updated Name"


def test_empty_profile_update_is_rejected(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    buyer = user_factory(email="empty-update@example.com")
    headers = auth_headers(buyer.email)

    response = client.patch(
        f"/api/v1/users/{buyer.id}",
        json={},
        headers=headers,
    )

    assert response.status_code == 422


def test_admin_can_list_users_with_pagination(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN, email="pagination-admin@example.com")
    for index in range(5):
        user_factory(
            role=RoleName.BUYER,
            email=f"page-{index}@example.com",
        )
    headers = auth_headers(admin.email)

    first_page = client.get(
        "/api/v1/users?page=1&page_size=2",
        headers=headers,
    )
    third_page = client.get(
        "/api/v1/users?page=3&page_size=2",
        headers=headers,
    )

    assert first_page.status_code == 200
    first_body = first_page.json()
    assert first_body["total"] == 6
    assert first_body["page"] == 1
    assert first_body["page_size"] == 2
    assert first_body["pages"] == 3
    assert len(first_body["items"]) == 2
    assert third_page.status_code == 200
    assert len(third_page.json()["items"]) == 2


def test_admin_can_deactivate_and_reactivate_a_user(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN, email="status-admin@example.com")
    buyer = user_factory(role=RoleName.BUYER, email="status-buyer@example.com")
    admin_headers = auth_headers(admin.email)
    buyer_headers = auth_headers(buyer.email)

    deactivated = client.patch(
        f"/api/v1/users/{buyer.id}/status",
        json={"is_active": False},
        headers=admin_headers,
    )
    login_while_inactive = client.post(
        "/api/v1/auth/login",
        json={"email": buyer.email, "password": TEST_PASSWORD},
    )
    existing_token = client.get("/api/v1/auth/me", headers=buyer_headers)
    reactivated = client.patch(
        f"/api/v1/users/{buyer.id}/status",
        json={"is_active": True},
        headers=admin_headers,
    )
    login_after_reactivation = client.post(
        "/api/v1/auth/login",
        json={"email": buyer.email, "password": TEST_PASSWORD},
    )

    assert deactivated.status_code == 200
    assert deactivated.json()["is_active"] is False
    assert login_while_inactive.status_code == 401
    assert existing_token.status_code == 403
    assert existing_token.json()["error"]["message"] == "This account is inactive."
    assert reactivated.status_code == 200
    assert reactivated.json()["is_active"] is True
    assert login_after_reactivation.status_code == 200


def test_admin_cannot_deactivate_their_own_account(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN, email="self-admin@example.com")
    headers = auth_headers(admin.email)

    response = client.patch(
        f"/api/v1/users/{admin.id}/status",
        json={"is_active": False},
        headers=headers,
    )

    assert response.status_code == 400
    assert response.json()["error"]["message"] == (
        "You cannot deactivate your own account."
    )


def test_buyer_cannot_update_another_users_profile(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    buyer = user_factory(email="update-other-buyer@example.com")
    other = user_factory(email="update-other-target@example.com")
    headers = auth_headers(buyer.email)

    response = client.patch(
        f"/api/v1/users/{other.id}",
        json={"full_name": "Not Allowed"},
        headers=headers,
    )

    assert response.status_code == 403


def test_admin_gets_404_for_unknown_user(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN, email="notfound-admin@example.com")
    headers = auth_headers(admin.email)

    response = client.get(f"/api/v1/users/{uuid4()}", headers=headers)

    assert response.status_code == 404
    assert response.json()["error"]["message"] == "User not found."


def test_admin_listing_rejects_invalid_page_size(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN, email="invalid-page-admin@example.com")
    headers = auth_headers(admin.email)

    response = client.get(
        "/api/v1/users?page=1&page_size=101",
        headers=headers,
    )

    assert response.status_code == 422
