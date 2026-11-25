import logging
import time

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import APP_URL, COOKIE_NAME, COOKIE_SECURE, DAILY_GENERATIONS, TOKEN_DAYS
from ..mailer import mail_configured, reset_email, send_email
from ..db import get_db
from ..deps import current_user, generations_today
from ..models import User
from ..schemas import ForgotIn, LoginIn, RegisterIn, ResetIn, UserOut
from ..security import (RESET_MINUTES, create_reset_token, create_token, hash_password, read_reset_token,
                        reset_token_matches, verify_password)

log = logging.getLogger("auth")
_last_reset: dict[str, float] = {}   # email -> last request time (simple per-process throttle)
RESET_COOLDOWN = 120                 # seconds between reset emails to the same address

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_out(db: Session, user: User) -> UserOut:
    return UserOut(id=user.id, name=user.name, email=user.email,
                   generations_today=generations_today(db, user), daily_limit=DAILY_GENERATIONS)


def _set_session(response: Response, user: User) -> None:
    response.set_cookie(
        COOKIE_NAME, create_token(user.id),
        max_age=TOKEN_DAYS * 86400, httponly=True, secure=COOKIE_SECURE, samesite="lax", path="/",
    )


@router.post("/register", response_model=UserOut, status_code=201)
def register(body: RegisterIn, response: Response, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = User(email=email, name=body.name.strip(), password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    _set_session(response, user)
    return _user_out(db, user)


@router.post("/login", response_model=UserOut)
def login(body: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.strip().lower()))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Wrong email or password")
    _set_session(response, user)
    return _user_out(db, user)


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user), db: Session = Depends(get_db)):
    return _user_out(db, user)


@router.post("/forgot")
async def forgot_password(body: ForgotIn, background: BackgroundTasks, db: Session = Depends(get_db)):
    """Always answers the same way, so nobody can use it to find out which emails have accounts."""
    email = body.email.strip().lower()
    reply = {"ok": True, "message": "If an account exists for this email, a reset link is on its way."}
    now = time.monotonic()
    if now - _last_reset.get(email, -RESET_COOLDOWN) < RESET_COOLDOWN:
        return reply
    _last_reset[email] = now
    user = db.scalar(select(User).where(User.email == email))
    if user:
        link = f"{APP_URL}/reset-password?token={create_reset_token(user.id, user.password_hash)}"
        subject, html_body, text_body = reset_email(user.name, link, RESET_MINUTES)
        if not mail_configured():
            log.warning("Password reset link for %s (email not configured): %s", email, link)
        background.add_task(send_email, user.email, subject, html_body, text_body)
    return reply


@router.post("/reset", response_model=UserOut)
def reset_password(body: ResetIn, response: Response, db: Session = Depends(get_db)):
    data = read_reset_token(body.token)
    user = db.get(User, data[0]) if data else None
    if not user or not reset_token_matches(data[1], user.password_hash):
        raise HTTPException(status_code=400, detail="This reset link is invalid, expired or already used. Please request a new one.")
    user.password_hash = hash_password(body.password)
    db.commit()
    _set_session(response, user)
    return _user_out(db, user)
