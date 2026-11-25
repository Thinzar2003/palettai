import asyncio
import os

import pytest

os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-long-enough-123")
pytest.importorskip("fastapi")
pytest.importorskip("sqlalchemy")

from fastapi import BackgroundTasks, HTTPException, Response  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.db import Base  # noqa: E402
from app.models import User  # noqa: E402
from app.routers import auth  # noqa: E402
from app.schemas import ForgotIn, ResetIn  # noqa: E402
from app.security import create_reset_token, hash_password, verify_password  # noqa: E402


@pytest.fixture()
def db():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    s = sessionmaker(bind=engine, expire_on_commit=False)()
    s.add(User(email="owner@shop.th", name="Thinzar", password_hash=hash_password("old-password")))
    s.commit()
    auth._last_reset.clear()
    yield s
    s.close()


def test_forgot_is_silent_and_throttled(db, caplog):
    sent = []
    bg = BackgroundTasks()
    r1 = asyncio.run(auth.forgot_password(ForgotIn(email="nobody@x.com"), bg, db))
    r2 = asyncio.run(auth.forgot_password(ForgotIn(email=" Owner@Shop.th "), bg, db))
    r3 = asyncio.run(auth.forgot_password(ForgotIn(email="owner@shop.th"), bg, db))  # within cooldown
    assert r1 == r2 == r3                             # same answer whether or not the account exists
    assert len(bg.tasks) == 1                         # one email only, for the real account, once
    assert "reset-password?token=" in caplog.text     # dev mode: link printed when email isn't configured


def test_full_reset_flow_is_one_time(db):
    user = db.query(User).one()
    token = create_reset_token(user.id, user.password_hash)
    resp = Response()
    out = auth.reset_password(ResetIn(token=token, password="new-password-1"), resp, db)
    assert out.email == "owner@shop.th" and "bs_session" in resp.headers.get("set-cookie", "")
    assert verify_password("new-password-1", db.get(User, user.id).password_hash)
    with pytest.raises(HTTPException):                # the same link can't be used twice
        auth.reset_password(ResetIn(token=token, password="another-pass-2"), Response(), db)
