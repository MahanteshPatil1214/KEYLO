"""Lead management API integration tests.

Verifies Module 3:
- Lead intake (public enquiry flow)
- Validation (projects, contacts, budgets, consent)
- Duplicate detection and duplicate-check endpoint
- Role-based lead listing, search, and pagination
- Lead details, updates, and privileged field restrictions
- Status lifecycle state transitions and consent checks
- Executive assignment and assignment history preservation
- Concurrency and safety rules
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from collections.abc import Callable
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.modules.leads.models import LeadSource, LeadStatus
from app.modules.projects.models import ProjectStatus
from app.modules.users.models import RoleName, User
from tests.lead_support import (
    assign_lead,
    create_lead,
    update_lead,
    update_lead_status,
)
from tests.project_support import create_project


@pytest.fixture()
def active_project(
    client: TestClient,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> dict[str, object]:
    """Provide an active project for lead associations."""

    admin = user_factory(role=RoleName.ADMIN)
    headers = auth_headers(admin.email)
    project = create_project(client, headers, name=f"Active Project {uuid4().hex[:8]}")
    # Activate the project
    activated = client.patch(
        f"/api/v1/projects/{project['id']}",
        json={"status": ProjectStatus.ACTIVE.value},
        headers=headers,
    )
    assert activated.status_code == 200, activated.text
    return activated.json()


def test_successful_public_lead_creation(
    client: TestClient,
    override_db: None,
    active_project: dict[str, object],
) -> None:
    lead = create_lead(
        client,
        project_id=active_project["id"],
        full_name="Rajesh Sharma",
        email="rajesh.sharma@example.com",
        phone="+91 98200 12345",
        source="WEBSITE",
        budget_min=7500000,
        budget_max=12000000,
        preferred_configuration="3 BHK",
        consent_to_contact=True,
    )

    assert lead["full_name"] == "Rajesh Sharma"
    assert lead["email"] == "rajesh.sharma@example.com"
    assert lead["phone"] == "+919820012345"
    assert lead["project_id"] == active_project["id"]
    assert lead["source"] == LeadSource.WEBSITE.value
    assert lead["status"] == LeadStatus.NEW.value
    assert lead["budget_min"] == 7500000
    assert lead["budget_max"] == 12000000
    assert lead["preferred_configuration"] == "3 BHK"
    assert lead["consent_to_contact"] is True
    assert lead["assigned_executive_id"] is None
    assert lead["assigned_at"] is None
    assert lead["created_at"] is not None
    assert lead["updated_at"] is not None


def test_lead_creation_with_only_email_or_only_phone(
    client: TestClient,
    override_db: None,
    active_project: dict[str, object],
) -> None:
    lead_email_only = create_lead(
        client,
        project_id=active_project["id"],
        full_name="Anita Roy",
        email="anita.roy@example.com",
        phone=None,
    )
    assert lead_email_only["email"] == "anita.roy@example.com"
    assert lead_email_only["phone"] is None

    lead_phone_only = create_lead(
        client,
        project_id=active_project["id"],
        full_name="Karan Patel",
        email=None,
        phone="+91 99887 76655",
    )
    assert lead_phone_only["email"] is None
    assert lead_phone_only["phone"] == "+919988776655"


def test_lead_creation_invalid_project(
    client: TestClient,
    override_db: None,
) -> None:
    create_lead(
        client,
        project_id=uuid4(),
        expected_status=404,
    )


def test_lead_creation_inactive_or_draft_project(
    client: TestClient,
    override_db: None,
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    headers = auth_headers(admin.email)

    draft = create_project(client, headers, name="Draft Project")
    create_lead(
        client,
        project_id=draft["id"],
        expected_status=404,
    )

    # Inactivate an active project
    activated = client.patch(
        f"/api/v1/projects/{draft['id']}",
        json={"status": ProjectStatus.ACTIVE.value},
        headers=headers,
    )
    inactivated = client.patch(
        f"/api/v1/projects/{draft['id']}",
        json={"status": ProjectStatus.INACTIVE.value},
        headers=headers,
    )
    assert inactivated.status_code == 200

    create_lead(
        client,
        project_id=draft["id"],
        expected_status=404,
    )


def test_lead_creation_invalid_email_and_phone(
    client: TestClient,
    override_db: None,
    active_project: dict[str, object],
) -> None:
    # Invalid email syntax
    create_lead(
        client,
        project_id=active_project["id"],
        email="not-an-email",
        expected_status=422,
    )

    # Invalid phone characters
    create_lead(
        client,
        project_id=active_project["id"],
        phone="98200abcde",
        expected_status=422,
    )

    # Phone too short
    create_lead(
        client,
        project_id=active_project["id"],
        phone="12345",
        expected_status=422,
    )

    # Phone too long
    create_lead(
        client,
        project_id=active_project["id"],
        phone="12345678901234567890",
        expected_status=422,
    )


def test_lead_creation_missing_contact_details(
    client: TestClient,
    override_db: None,
    active_project: dict[str, object],
) -> None:
    create_lead(
        client,
        project_id=active_project["id"],
        email=None,
        phone=None,
        expected_status=422,
    )


def test_lead_creation_invalid_budget_range(
    client: TestClient,
    override_db: None,
    active_project: dict[str, object],
) -> None:
    # budget_min > budget_max
    create_lead(
        client,
        project_id=active_project["id"],
        budget_min=10000000,
        budget_max=5000000,
        expected_status=422,
    )

    # Negative budget
    create_lead(
        client,
        project_id=active_project["id"],
        budget_min=-100,
        expected_status=422,
    )


def test_duplicate_phone_rejected(
    client: TestClient,
    override_db: None,
    active_project: dict[str, object],
) -> None:
    first = create_lead(
        client,
        project_id=active_project["id"],
        phone="+91 98111 22233",
        email="first@example.com",
    )

    dup_response = client.post(
        "/api/v1/leads",
        json={
            "full_name": "Another Name",
            "project_id": active_project["id"],
            "phone": "+91 98111 22233",
            "email": "different@example.com",
            "source": "PROPERTY_PORTAL",
            "consent_to_contact": True,
        },
    )
    assert dup_response.status_code == 409
    body = dup_response.json()["error"]["details"][0]
    assert body["duplicate"] is True
    assert first["id"] in body["matching_lead_ids"]
    assert "phone" in body["matching_fields"]


def test_duplicate_email_rejected(
    client: TestClient,
    override_db: None,
    active_project: dict[str, object],
) -> None:
    first = create_lead(
        client,
        project_id=active_project["id"],
        phone="+91 98111 11111",
        email="shared@example.com",
    )

    dup_response = client.post(
        "/api/v1/leads",
        json={
            "full_name": "Second Person",
            "project_id": active_project["id"],
            "phone": "+91 98222 22222",
            "email": "shared@example.com",
            "source": "WEBSITE",
            "consent_to_contact": True,
        },
    )
    assert dup_response.status_code == 409
    body = dup_response.json()["error"]["details"][0]
    assert body["duplicate"] is True
    assert first["id"] in body["matching_lead_ids"]
    assert "email" in body["matching_fields"]


def test_duplicate_detection_normalized_values(
    client: TestClient,
    override_db: None,
    active_project: dict[str, object],
) -> None:
    first = create_lead(
        client,
        project_id=active_project["id"],
        phone="+919876543210",
        email="norm@example.com",
    )

    # Different formatting for phone (+91 with spaces and dashes)
    dup_phone = client.post(
        "/api/v1/leads",
        json={
            "full_name": "Lead Two",
            "project_id": active_project["id"],
            "phone": "+91 98765-43210",
            "email": "other@example.com",
            "source": "WEBSITE",
            "consent_to_contact": True,
        },
    )
    assert dup_phone.status_code == 409
    assert first["id"] in dup_phone.json()["error"]["details"][0]["matching_lead_ids"]

    # Different case and whitespace for email
    dup_email = client.post(
        "/api/v1/leads",
        json={
            "full_name": "Lead Three",
            "project_id": active_project["id"],
            "phone": "+91 91234 56789",
            "email": "  NORM@example.COM  ",
            "source": "WEBSITE",
            "consent_to_contact": True,
        },
    )
    assert dup_email.status_code == 409
    assert first["id"] in dup_email.json()["error"]["details"][0]["matching_lead_ids"]


def test_public_creation_cannot_set_privileged_fields(
    client: TestClient,
    override_db: None,
    active_project: dict[str, object],
) -> None:
    response = client.post(
        "/api/v1/leads",
        json={
            "full_name": "Intruder",
            "project_id": active_project["id"],
            "phone": "+91 98765 00000",
            "source": "WEBSITE",
            "consent_to_contact": True,
            "status": "QUALIFIED",
            "assigned_executive_id": str(uuid4()),
        },
    )
    assert response.status_code == 422


def test_duplicate_check_endpoint(
    client: TestClient,
    override_db: None,
    active_project: dict[str, object],
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    sales = user_factory(role=RoleName.SALES_EXECUTIVE)
    buyer = user_factory(role=RoleName.BUYER)

    admin_headers = auth_headers(admin.email)
    sales_headers = auth_headers(sales.email)
    buyer_headers = auth_headers(buyer.email)

    lead = create_lead(
        client,
        project_id=active_project["id"],
        phone="+91 98765 11122",
        email="check@example.com",
    )

    # Admin check - found duplicate
    check_resp = client.get(
        "/api/v1/leads/duplicates/check",
        params={"phone": "+91-98765-11122"},
        headers=admin_headers,
    )
    assert check_resp.status_code == 200
    body = check_resp.json()
    assert body["duplicate"] is True
    assert lead["id"] in body["matching_lead_ids"]
    assert "phone" in body["matching_fields"]

    # Admin check - not found
    check_not_found = client.get(
        "/api/v1/leads/duplicates/check?email=nonexistent@example.com",
        headers=admin_headers,
    )
    assert check_not_found.status_code == 200
    assert check_not_found.json()["duplicate"] is False
    assert check_not_found.json()["matching_lead_ids"] == []

    # Missing both parameters
    check_missing = client.get(
        "/api/v1/leads/duplicates/check",
        headers=admin_headers,
    )
    assert check_missing.status_code == 422

    # Sales executive not allowed
    sales_resp = client.get(
        "/api/v1/leads/duplicates/check?phone=+919876511122",
        headers=sales_headers,
    )
    assert sales_resp.status_code == 403

    # Buyer not allowed
    buyer_resp = client.get(
        "/api/v1/leads/duplicates/check?phone=+919876511122",
        headers=buyer_headers,
    )
    assert buyer_resp.status_code == 403


def test_lead_listing_and_pagination(
    client: TestClient,
    override_db: None,
    active_project: dict[str, object],
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    headers = auth_headers(admin.email)

    for i in range(5):
        create_lead(
            client,
            project_id=active_project["id"],
            full_name=f"Lead {i}",
            phone=f"+91 90000 0000{i}",
            email=f"lead{i}@example.com",
        )

    # First page with page_size=2
    page1 = client.get("/api/v1/leads?page=1&page_size=2", headers=headers)
    assert page1.status_code == 200
    body1 = page1.json()
    assert body1["total"] == 5
    assert len(body1["items"]) == 2
    assert body1["page"] == 1
    assert body1["page_size"] == 2
    assert body1["pages"] == 3

    # Second page
    page2 = client.get("/api/v1/leads?page=2&page_size=2", headers=headers)
    assert page2.status_code == 200
    body2 = page2.json()
    assert len(body2["items"]) == 2
    assert body2["items"][0]["id"] != body1["items"][0]["id"]

    # Order asc
    asc = client.get("/api/v1/leads?order=asc", headers=headers)
    assert asc.status_code == 200
    assert asc.json()["items"][0]["full_name"] == "Lead 0"


def test_lead_search_and_filtering(
    client: TestClient,
    override_db: None,
    active_project: dict[str, object],
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    headers = auth_headers(admin.email)

    l1 = create_lead(
        client,
        project_id=active_project["id"],
        full_name="Vikram Malhotra",
        phone="+91 98333 11111",
        email="vikram@example.com",
        source="PROPERTY_PORTAL",
    )
    l2 = create_lead(
        client,
        project_id=active_project["id"],
        full_name="Sneha Rao",
        phone="+91 98444 55566",
        email="sneha@example.com",
        source="SOCIAL_MEDIA",
    )

    # Search by name
    search_name = client.get("/api/v1/leads?search=Vikram", headers=headers)
    assert search_name.status_code == 200
    assert len(search_name.json()["items"]) == 1
    assert search_name.json()["items"][0]["id"] == l1["id"]

    # Search by email
    search_email = client.get("/api/v1/leads?search=sneha@", headers=headers)
    assert search_email.status_code == 200
    assert len(search_email.json()["items"]) == 1
    assert search_email.json()["items"][0]["id"] == l2["id"]

    # Search by phone digits
    search_phone = client.get("/api/v1/leads?search=33311", headers=headers)
    assert search_phone.status_code == 200
    assert len(search_phone.json()["items"]) == 1
    assert search_phone.json()["items"][0]["id"] == l1["id"]

    # Filter by source
    filter_source = client.get(
        f"/api/v1/leads?source={LeadSource.SOCIAL_MEDIA.value}",
        headers=headers,
    )
    assert filter_source.status_code == 200
    assert all(item["source"] == LeadSource.SOCIAL_MEDIA.value for item in filter_source.json()["items"])

    # Filter by project
    filter_proj = client.get(
        f"/api/v1/leads?project_id={active_project['id']}",
        headers=headers,
    )
    assert filter_proj.status_code == 200
    assert len(filter_proj.json()["items"]) >= 2


def test_sales_executive_listing_restrictions(
    client: TestClient,
    override_db: None,
    active_project: dict[str, object],
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    sales1 = user_factory(role=RoleName.SALES_EXECUTIVE)
    sales2 = user_factory(role=RoleName.SALES_EXECUTIVE)

    admin_headers = auth_headers(admin.email)
    sales1_headers = auth_headers(sales1.email)
    sales2_headers = auth_headers(sales2.email)

    lead1 = create_lead(
        client,
        project_id=active_project["id"],
        full_name="Lead For Sales 1",
        phone="+91 97000 00001",
    )
    lead2 = create_lead(
        client,
        project_id=active_project["id"],
        full_name="Lead For Sales 2",
        phone="+91 97000 00002",
    )

    # Assign lead1 to sales1
    assign_lead(client, admin_headers, lead1["id"], executive_id=sales1.id)
    # Assign lead2 to sales2
    assign_lead(client, admin_headers, lead2["id"], executive_id=sales2.id)

    # sales1 sees only lead1
    resp1 = client.get("/api/v1/leads", headers=sales1_headers)
    assert resp1.status_code == 200
    items1 = resp1.json()["items"]
    assert len(items1) == 1
    assert items1[0]["id"] == lead1["id"]

    # sales2 sees only lead2
    resp2 = client.get("/api/v1/leads", headers=sales2_headers)
    assert resp2.status_code == 200
    items2 = resp2.json()["items"]
    assert len(items2) == 1
    assert items2[0]["id"] == lead2["id"]

    # sales1 attempts to query with assigned_executive_id=sales2.id -> clamped to sales1.id
    resp_clamped = client.get(
        f"/api/v1/leads?assigned_executive_id={sales2.id}",
        headers=sales1_headers,
    )
    assert resp_clamped.status_code == 200
    assert len(resp_clamped.json()["items"]) == 1
    assert resp_clamped.json()["items"][0]["id"] == lead1["id"]


def test_lead_detail_authorization(
    client: TestClient,
    override_db: None,
    active_project: dict[str, object],
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    sales_assigned = user_factory(role=RoleName.SALES_EXECUTIVE)
    sales_other = user_factory(role=RoleName.SALES_EXECUTIVE)
    buyer = user_factory(role=RoleName.BUYER)

    admin_headers = auth_headers(admin.email)
    assigned_headers = auth_headers(sales_assigned.email)
    other_headers = auth_headers(sales_other.email)
    buyer_headers = auth_headers(buyer.email)

    lead = create_lead(
        client,
        project_id=active_project["id"],
        phone="+91 96000 11111",
    )
    assign_lead(client, admin_headers, lead["id"], executive_id=sales_assigned.id)

    # Admin can view
    assert client.get(f"/api/v1/leads/{lead['id']}", headers=admin_headers).status_code == 200

    # Assigned sales can view
    assert client.get(f"/api/v1/leads/{lead['id']}", headers=assigned_headers).status_code == 200

    # Other sales executive gets 404 (does not disclose existence)
    assert client.get(f"/api/v1/leads/{lead['id']}", headers=other_headers).status_code == 404

    # Buyer gets 403
    assert client.get(f"/api/v1/leads/{lead['id']}", headers=buyer_headers).status_code == 403

    # Unauthenticated gets 401
    assert client.get(f"/api/v1/leads/{lead['id']}").status_code == 401


def test_sales_executive_assignment_restrictions(
    client: TestClient,
    override_db: None,
    active_project: dict[str, object],
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    sales = user_factory(role=RoleName.SALES_EXECUTIVE)
    buyer = user_factory(role=RoleName.BUYER)
    inactive_sales = user_factory(role=RoleName.SALES_EXECUTIVE, is_active=False)

    admin_headers = auth_headers(admin.email)
    sales_headers = auth_headers(sales.email)

    lead = create_lead(
        client,
        project_id=active_project["id"],
        phone="+91 95000 22222",
        consent_to_contact=True,
    )

    # Sales executive cannot assign leads
    assign_lead(client, sales_headers, lead["id"], executive_id=sales.id, expected_status=403)

    # Admin cannot assign a BUYER as sales executive
    assign_lead(client, admin_headers, lead["id"], executive_id=buyer.id, expected_status=400)

    # Admin cannot assign an ADMIN as sales executive
    assign_lead(client, admin_headers, lead["id"], executive_id=admin.id, expected_status=400)

    # Admin cannot assign an inactive sales executive
    assign_lead(client, admin_headers, lead["id"], executive_id=inactive_sales.id, expected_status=400)

    # Lead without consent cannot be assigned
    no_consent_lead = create_lead(
        client,
        project_id=active_project["id"],
        phone="+91 95000 33333",
        consent_to_contact=False,
    )
    assign_lead(client, admin_headers, no_consent_lead["id"], executive_id=sales.id, expected_status=400)


def test_admin_assignment_and_history(
    client: TestClient,
    override_db: None,
    active_project: dict[str, object],
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    sales1 = user_factory(role=RoleName.SALES_EXECUTIVE)
    sales2 = user_factory(role=RoleName.SALES_EXECUTIVE)

    admin_headers = auth_headers(admin.email)
    sales1_headers = auth_headers(sales1.email)
    sales2_headers = auth_headers(sales2.email)

    lead = create_lead(
        client,
        project_id=active_project["id"],
        phone="+91 94000 44444",
        consent_to_contact=True,
    )

    # First assignment
    a1 = assign_lead(client, admin_headers, lead["id"], executive_id=sales1.id)
    assert a1["lead_id"] == lead["id"]
    assert a1["executive_id"] == str(sales1.id)
    assert a1["assigned_by"] == str(admin.id)
    assert a1["is_active"] is True
    assert a1["unassigned_at"] is None

    # Lead representation reflects assignment
    detail = client.get(f"/api/v1/leads/{lead['id']}", headers=admin_headers).json()
    assert detail["assigned_executive_id"] == str(sales1.id)
    assert detail["assigned_at"] is not None

    # Idempotent re-assignment to same executive returns active assignment
    a1_retry = assign_lead(client, admin_headers, lead["id"], executive_id=sales1.id)
    assert a1_retry["id"] == a1["id"]

    # Re-assign to sales2
    a2 = assign_lead(client, admin_headers, lead["id"], executive_id=sales2.id)
    assert a2["executive_id"] == str(sales2.id)
    assert a2["id"] != a1["id"]

    # Check assignment history
    history = client.get(
        f"/api/v1/leads/{lead['id']}/assignments",
        headers=admin_headers,
    )
    assert history.status_code == 200
    h_body = history.json()
    assert h_body["total"] == 2
    assert len(h_body["items"]) == 2

    # Newest assignment is active
    assert h_body["items"][0]["executive_id"] == str(sales2.id)
    assert h_body["items"][0]["is_active"] is True
    assert h_body["items"][0]["unassigned_at"] is None

    # Old assignment has unassigned_at set
    assert h_body["items"][1]["executive_id"] == str(sales1.id)
    assert h_body["items"][1]["is_active"] is False
    assert h_body["items"][1]["unassigned_at"] is not None

    # Current sales executive (sales2) can view assignment history
    assert client.get(f"/api/v1/leads/{lead['id']}/assignments", headers=sales2_headers).status_code == 200

    # Old sales executive (sales1) gets 404
    assert client.get(f"/api/v1/leads/{lead['id']}/assignments", headers=sales1_headers).status_code == 404


def test_lead_update_and_privilege_separation(
    client: TestClient,
    override_db: None,
    active_project: dict[str, object],
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    sales = user_factory(role=RoleName.SALES_EXECUTIVE)

    admin_headers = auth_headers(admin.email)
    sales_headers = auth_headers(sales.email)

    lead = create_lead(
        client,
        project_id=active_project["id"],
        full_name="Original Name",
        phone="+91 93000 55555",
        budget_min=5000000,
        budget_max=8000000,
        preferred_configuration="2 BHK",
    )
    assign_lead(client, admin_headers, lead["id"], executive_id=sales.id)

    # Sales executive updates permissible fields
    updated_sales = update_lead(
        client,
        sales_headers,
        lead["id"],
        {
            "full_name": "Updated By Sales",
            "preferred_configuration": "3 BHK",
            "budget_max": 9000000,
        },
    )
    assert updated_sales["full_name"] == "Updated By Sales"
    assert updated_sales["preferred_configuration"] == "3 BHK"
    assert updated_sales["budget_min"] == 5000000  # Preserved
    assert updated_sales["budget_max"] == 9000000

    # Sales executive tries to update admin-only field (source)
    update_lead(
        client,
        sales_headers,
        lead["id"],
        {"source": LeadSource.OTHER.value},
        expected_status=403,
    )

    # Sales executive tries to update admin-only field (project_id)
    update_lead(
        client,
        sales_headers,
        lead["id"],
        {"project_id": str(uuid4())},
        expected_status=403,
    )

    # Admin updates source successfully
    updated_admin = update_lead(
        client,
        admin_headers,
        lead["id"],
        {"source": LeadSource.REFERRAL.value},
    )
    assert updated_admin["source"] == LeadSource.REFERRAL.value


def test_status_transitions_and_consent(
    client: TestClient,
    override_db: None,
    active_project: dict[str, object],
    user_factory: Callable[..., User],
    auth_headers: Callable[..., dict[str, str]],
) -> None:
    admin = user_factory(role=RoleName.ADMIN)
    headers = auth_headers(admin.email)

    # Lead with consent: valid transitions
    lead = create_lead(
        client,
        project_id=active_project["id"],
        phone="+91 92000 66666",
        consent_to_contact=True,
    )

    s1 = update_lead_status(client, headers, lead["id"], status=LeadStatus.CONTACTED.value)
    assert s1["status"] == LeadStatus.CONTACTED.value

    s2 = update_lead_status(client, headers, lead["id"], status=LeadStatus.QUALIFIED.value)
    assert s2["status"] == LeadStatus.QUALIFIED.value

    s3 = update_lead_status(client, headers, lead["id"], status=LeadStatus.VISIT_BOOKED.value)
    assert s3["status"] == LeadStatus.VISIT_BOOKED.value

    s4 = update_lead_status(client, headers, lead["id"], status=LeadStatus.VISITED.value)
    assert s4["status"] == LeadStatus.VISITED.value

    s5 = update_lead_status(client, headers, lead["id"], status=LeadStatus.CONVERTED.value)
    assert s5["status"] == LeadStatus.CONVERTED.value

    # Terminal status cannot transition
    update_lead_status(client, headers, lead["id"], status=LeadStatus.NEW.value, expected_status=400)

    # Invalid jump: NEW to VISITED
    new_lead = create_lead(
        client,
        project_id=active_project["id"],
        phone="+91 92000 77777",
        consent_to_contact=True,
    )
    update_lead_status(client, headers, new_lead["id"], status=LeadStatus.VISITED.value, expected_status=400)

    # Consent required for contact-related statuses
    no_consent_lead = create_lead(
        client,
        project_id=active_project["id"],
        phone="+91 92000 88888",
        consent_to_contact=False,
    )
    # Moving to CONTACTED requires consent -> 400
    update_lead_status(client, headers, no_consent_lead["id"], status=LeadStatus.CONTACTED.value, expected_status=400)

    # Moving to NOT_INTERESTED does NOT require consent -> 200
    lost = update_lead_status(client, headers, no_consent_lead["id"], status=LeadStatus.NOT_INTERESTED.value)
    assert lost["status"] == LeadStatus.NOT_INTERESTED.value


def test_concurrent_duplicate_creation(
    client: TestClient,
    override_db: None,
    active_project: dict[str, object],
) -> None:
    shared_phone = "+91 91000 99999"

    def _create(idx: int) -> int:
        response = client.post(
            "/api/v1/leads",
            json={
                "full_name": f"Buyer {idx}",
                "project_id": active_project["id"],
                "phone": shared_phone,
                "email": f"buyer{idx}@example.com",
                "source": "WEBSITE",
                "consent_to_contact": True,
            },
        )
        return response.status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(_create, 1)
        f2 = executor.submit(_create, 2)
        results = sorted([f1.result(), f2.result()])

    # One request succeeds (201), the other is rejected as duplicate (409)
    assert results == [201, 409]
