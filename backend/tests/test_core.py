import os
os.environ.setdefault("SECRET_KEY", "test-secret")

from app.security import create_token, decode_token, hash_password, verify_password
from app.service import locked_parts, merge_locked
from app.utils import slugify


def test_password_roundtrip():
    h = hash_password("hunter22!")
    assert h.startswith("scrypt$") and "hunter22" not in h
    assert verify_password("hunter22!", h)
    assert not verify_password("wrong-pass", h)
    assert not verify_password("x", "garbage")


def test_hashes_are_salted():
    assert hash_password("same") != hash_password("same")


def test_token_roundtrip():
    assert decode_token(create_token(42)) == 42
    assert decode_token("not-a-token") is None
    assert decode_token(create_token(42)[:-3] + "abc") is None  # tampered


def test_slugify():
    s = slugify("Cha Yen House!")
    assert s.startswith("cha-yen-house-") and len(s) == len("cha-yen-house-") + 6
    assert slugify("ชาเย็น").startswith("brand-")  # Thai-only names still get a valid slug


def test_locks():
    prev = {"palette": [1], "fonts": {"heading": "Kanit"}, "slogans": ["a"], "tagline": "t",
            "logo": {"monogram": "C"}, "story": "s", "tone": "x", "personality": [], "keywords": []}
    keep = locked_parts(prev, ["palette", "slogans"])
    assert keep == {"palette": [1], "slogans": ["a"], "tagline": "t"}
    merged = merge_locked({"palette": [9], "fonts": {"heading": "Inter"}, "tagline": "new"}, keep)
    assert merged["palette"] == [1] and merged["tagline"] == "t" and merged["fonts"]["heading"] == "Inter"
    assert locked_parts(None, ["palette"]) == {}
