from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..daily import context, context_text
from ..db import get_db
from ..deps import check_quota, current_user, record_usage
from ..models import Creation, User
from ..schemas import Brief, CreationOut, DailyPostIn, PromoIn, ReplyIn
from ..service import daily_post, promo, reply
from .brands import _ai, _own_brand

router = APIRouter(prefix="/api", tags=["daily"])


def _out(c: Creation) -> CreationOut:
    return CreationOut(id=c.id, brand_id=c.brand_id, kind=c.kind, input=c.input, output=c.output,
                       created_at=c.created_at.isoformat())


def _save(db: Session, user: User, brand_id: int, kind: str, data_in: dict, data_out: dict) -> CreationOut:
    record_usage(db, user, kind)
    c = Creation(user_id=user.id, brand_id=brand_id, kind=kind, input=data_in, output=data_out)
    db.add(c)
    db.commit()
    db.refresh(c)
    return _out(c)


@router.get("/today")
def today():
    """Date, weekday, payday and upcoming Thai events (Bangkok time). No AI involved."""
    return context()


@router.post("/brands/{brand_id}/daily/post", response_model=CreationOut)
async def make_daily_post(brand_id: int, body: DailyPostIn, user: User = Depends(current_user),
                          db: Session = Depends(get_db)):
    brand = _own_brand(db, user, brand_id)
    check_quota(db, user)
    post = await _ai(daily_post(Brief(**brand.brief), brand.current.kit, context_text(context()),
                                (body.idea or "").strip() or None, (body.event or "").strip() or None))
    return _save(db, user, brand.id, "post", body.model_dump(), post)


@router.post("/brands/{brand_id}/daily/promo", response_model=CreationOut)
async def make_promo(brand_id: int, body: PromoIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    brand = _own_brand(db, user, brand_id)
    check_quota(db, user)
    out = await _ai(promo(Brief(**brand.brief), brand.current.kit, context_text(context()),
                          body.offer.strip(), (body.period or "").strip() or None))
    return _save(db, user, brand.id, "promo", body.model_dump(), out)


@router.post("/brands/{brand_id}/daily/reply", response_model=CreationOut)
async def make_reply(brand_id: int, body: ReplyIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    brand = _own_brand(db, user, brand_id)
    check_quota(db, user)
    out = await _ai(reply(Brief(**brand.brief), brand.current.kit, body.message.strip(), body.platform, body.tweak))
    return _save(db, user, brand.id, "reply", body.model_dump(), out)


@router.get("/brands/{brand_id}/creations", response_model=list[CreationOut])
def list_creations(brand_id: int, limit: int = Query(20, ge=1, le=50),
                   user: User = Depends(current_user), db: Session = Depends(get_db)):
    brand = _own_brand(db, user, brand_id)
    rows = db.scalars(select(Creation).where(Creation.brand_id == brand.id)
                      .order_by(Creation.created_at.desc()).limit(limit)).all()
    return [_out(c) for c in rows]
