"""Password hashing and JWT security tests."""

from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest
from pydantic import SecretStr

from app.core.config import Settings
from app.modules.auth.security import (
    TokenExpiredError,
    TokenValidationError,
    create_access_token,
    decode_access_token,
    hash_password,
    validate_password_strength,
    verify_password,
)
from tests.support import TEST_PASSWORD as VALID_PASSWORD
from tests.support import WRONG_PASSWORD


def test_password_is_hashed_with_argon2() -> None:
    password_hash = hash_password(VALID_PASSWORD)

    assert password_hash.startswith("$argon2id$")
    assert password_hash != VALID_PASSWORD
    assert verify_password(VALID_PASSWORD, password_hash) is True
    assert verify_password(WRONG_PASSWORD, password_hash) is False
    assert verify_password(VALID_PASSWORD, "not-a-valid-hash") is False


@pytest.mark.parametrize(
    "password",
    [
        "short",
        "alllowercase1!",
        "ALLUPPERCASE1!",
        "NoDigits!!ab",
        "NoSpecial1234",
    ],
)
def test_weak_passwords_are_rejected(password: str) -> None:
    with pytest.raises(ValueError):
        validate_password_strength(password)


def test_strong_password_is_accepted() -> None:
    validate_password_strength(VALID_PASSWORD)


def test_access_token_round_trip(test_settings: Settings) -> None:
    user_id = uuid4()

    token = create_access_token(
        user_id=user_id,
        role_name="ADMIN",
        settings=test_settings,
    )
    claims = decode_access_token(token, settings=test_settings)

    assert claims.subject == user_id
    assert claims.role == "ADMIN"
    assert claims.token_type == "access"
    assert claims.expires_at > claims.issued_at


def test_expired_access_token_is_rejected(test_settings: Settings) -> None:
    token = create_access_token(
        user_id=uuid4(),
        role_name="BUYER",
        settings=test_settings,
        expires_delta=timedelta(seconds=-5),
    )

    with pytest.raises(TokenExpiredError):
        decode_access_token(token, settings=test_settings)


def test_malformed_token_is_rejected(test_settings: Settings) -> None:
    with pytest.raises(TokenValidationError):
        decode_access_token("not-a-jwt", settings=test_settings)


def test_token_signed_with_another_secret_is_rejected(
    test_settings: Settings,
) -> None:
    other_settings = test_settings.model_copy(
        update={
            "jwt_secret_key": SecretStr(secrets.token_urlsafe(48))
        }
    )
    token = create_access_token(
        user_id=uuid4(),
        role_name="ADMIN",
        settings=other_settings,
    )

    with pytest.raises(TokenValidationError):
        decode_access_token(token, settings=test_settings)


def test_non_access_token_type_is_rejected(test_settings: Settings) -> None:
    now = datetime.now(UTC)
    token = jwt.encode(
        {
            "sub": str(uuid4()),
            "role": "ADMIN",
            "type": "refresh",
            "jti": str(uuid4()),
            "iat": now,
            "exp": now + timedelta(minutes=5),
            "iss": test_settings.jwt_issuer,
            "aud": test_settings.jwt_audience,
        },
        test_settings.jwt_secret_key.get_secret_value(),
        algorithm=test_settings.jwt_algorithm,
    )

    with pytest.raises(TokenValidationError):
        decode_access_token(token, settings=test_settings)
