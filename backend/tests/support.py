"""Runtime-generated credentials used only by the test suite.

Fixed credential-like values are intentionally not stored in the repository.
Each value is generated for the current Python process and has no value outside
these tests.
"""

from __future__ import annotations

import secrets

TEST_JWT_SECRET = secrets.token_urlsafe(48)
TEST_PASSWORD = f"Aa1!{secrets.token_urlsafe(18)}"
WRONG_PASSWORD = f"Aa1!{secrets.token_urlsafe(18)}"
