from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import COOKIE_NAME, COOKIE_SECURE, DAILY_GENERATIONS, TOKEN_DAYS
from ..db import get_db
from ..deps import current_user, generations_today
from ..models import User
from ..schemas import LoginIn, RegisterIn, UserOut
from ..security import create_token, hash_password, verify_password

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
