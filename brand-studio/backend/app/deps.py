from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import COOKIE_NAME, DAILY_GENERATIONS
from .db import get_db
from .models import Brand, BrandVersion, User
from .security import decode_token


def _token_from(request: Request) -> str | None:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return auth[7:].strip()
    return request.cookies.get(COOKIE_NAME)


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = _token_from(request)
    user_id = decode_token(token) if token else None
    user = db.get(User, user_id) if user_id else None
    if not user:
        raise HTTPException(status_code=401, detail="Please log in")
    return user


def generations_today(db: Session, user: User) -> int:
    since = datetime.now(timezone.utc) - timedelta(days=1)
    stmt = (
        select(func.count(BrandVersion.id))
        .join(Brand, Brand.id == BrandVersion.brand_id)
        .where(Brand.user_id == user.id, BrandVersion.created_at >= since, BrandVersion.note.not_like("Restored%"))
    )
    return db.scalar(stmt) or 0


def check_quota(db: Session, user: User) -> None:
    if generations_today(db, user) >= DAILY_GENERATIONS:
        raise HTTPException(
            status_code=429,
            detail=f"Daily limit reached ({DAILY_GENERATIONS} generations per 24 hours). Try again tomorrow.",
        )
