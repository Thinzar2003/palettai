import os
from datetime import datetime, timedelta, timezone

os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-long-enough-123")

import jwt

from app import config
from app.mailer import reset_email
from app.security import create_reset_token, create_token, decode_token, read_reset_token, reset_token_matches


def test_tokens_cannot_be_swapped():
    reset = create_reset_token(1, "hash")
    assert decode_token(reset) is None                # a reset link is never a login session
    assert read_reset_token(create_token(1)) is None  # a session is never a reset link
    assert read_reset_token("garbage") is None
    assert decode_token(create_token(7)) == 7


def test_reset_token_expires():
    old = jwt.encode({"sub": "1", "typ": "reset", "pw": "x", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
                     config.SECRET_KEY, algorithm="HS256")
    assert read_reset_token(old) is None


def test_reset_link_dies_when_password_changes():
    uid, fp = read_reset_token(create_reset_token(3, "hash-before"))
    assert uid == 3 and reset_token_matches(fp, "hash-before") and not reset_token_matches(fp, "hash-after")


def test_old_sessions_without_type_still_work():
    legacy = jwt.encode({"sub": "5", "exp": datetime.now(timezone.utc) + timedelta(days=1)}, config.SECRET_KEY, algorithm="HS256")
    assert decode_token(legacy) == 5


def test_email_content():
    subject, html_body, text = reset_email("Thin<zar>", "https://palettai.vercel.app/reset-password?token=abc", 30)
    assert "Reset" in subject and "รีเซ็ต" in subject
    assert "Thin&lt;zar&gt;" in html_body and "<zar>" not in html_body     # names are escaped
    assert "token=abc" in text and "30" in text
