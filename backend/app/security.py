"""Password hashing (scrypt, standard library) and JWT session tokens."""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt

from .config import SECRET_KEY, TOKEN_DAYS

_N, _R, _P = 2**14, 8, 1  # scrypt cost parameters (~16 MB, fast enough for a login)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=_N, r=_R, p=_P, dklen=32)
    enc = lambda b: base64.b64encode(b).decode()
    return f"scrypt${_N}${_R}${_P}${enc(salt)}${enc(digest)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, n, r, p, salt_b64, digest_b64 = stored.split("$")
        if algo != "scrypt":
            return False
        salt, expected = base64.b64decode(salt_b64), base64.b64decode(digest_b64)
        digest = hashlib.scrypt(password.encode(), salt=salt, n=int(n), r=int(r), p=int(p), dklen=len(expected))
        return hmac.compare_digest(digest, expected)
    except (ValueError, TypeError):
        return False


def create_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "typ": "session", "iat": now, "exp": now + timedelta(days=TOKEN_DAYS)}
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def decode_token(token: str) -> int | None:
    """Session tokens only (older sessions have no "typ"; reset tokens are always refused here)."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        if payload.get("typ", "session") != "session":
            return None
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None


# ── Password reset ───────────────────────────────────────────────────────────
RESET_MINUTES = 30


def _password_fingerprint(password_hash: str) -> str:
    """Changes whenever the password changes, so a reset link works only once."""
    return hashlib.sha256((SECRET_KEY + password_hash).encode()).hexdigest()[:16]


def create_reset_token(user_id: int, password_hash: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "typ": "reset", "pw": _password_fingerprint(password_hash),
               "iat": now, "exp": now + timedelta(minutes=RESET_MINUTES)}
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def read_reset_token(token: str) -> tuple[int, str] | None:
    """Returns (user_id, password fingerprint) for a valid, unexpired reset token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        if payload.get("typ") != "reset":
            return None
        return int(payload["sub"]), str(payload["pw"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None


def reset_token_matches(fingerprint: str, password_hash: str) -> bool:
    return hmac.compare_digest(fingerprint, _password_fingerprint(password_hash))
