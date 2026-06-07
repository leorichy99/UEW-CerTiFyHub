"""
Confirmation token service.

Tokens are random URL-safe strings generated server-side. Only the SHA-256
digest is persisted (on `StudentRecord.confirmation_token_hash`); the raw
token is sent once by email and never stored.
"""

import hashlib
import secrets
from datetime import timedelta

from django.utils import timezone


TOKEN_BYTES = 32  # 256-bit


def generate_token() -> str:
    return secrets.token_urlsafe(TOKEN_BYTES)


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def default_expiry(deadline=None):
    """Tokens expire at the session's confirmation deadline (or 30 days)."""
    if deadline:
        return deadline
    return timezone.now() + timedelta(days=30)
