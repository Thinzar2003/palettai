from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..deps import check_quota, current_user
from ..llm import LLMError, NotConfigured
from ..models import Brand, BrandVersion, User
from ..schemas import (BrandDetail, BrandSummary, BrandUpdate, Brief, PublicBrand,
                       RegenerateIn, VersionOut)
from ..service import create_brand, locked_parts
from ..utils import slugify

router = APIRouter(prefix="/api", tags=["brands"])


# ── helpers ─────────────────────────────────────────────────────────────────
def _preview(kit: dict) -> dict:
    return {
        "colors": [c["hex"] for c in kit.get("palette", [])],
        "heading_font": kit.get("fonts", {}).get("heading"),
        "monogram": kit.get("logo", {}).get("monogram"),
        "tagline": kit.get("tagline"),
        "on_primary": kit.get("on_primary"),
    }


def _summary(b: Brand) -> dict:
    return dict(id=b.id, name=b.name, slug=b.slug, is_public=b.is_public,
                current_version=b.current_version, version_count=len(b.versions),
                updated_at=b.updated_at.isoformat(), preview=_preview(b.current.kit))


def _detail(b: Brand) -> BrandDetail:
    versions = [VersionOut(version=v.version, kit=v.kit, locked=v.locked or [], note=v.note,
                           created_at=v.created_at.isoformat()) for v in b.versions]
    return BrandDetail(**_summary(b), brief=b.brief, versions=versions)


def _own_brand(db: Session, user: User, brand_id: int) -> Brand:
    brand = db.scalar(
        select(Brand).options(selectinload(Brand.versions))
        .where(Brand.id == brand_id, Brand.user_id == user.id)
    )
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    return brand


async def _generate(brief: Brief, keep: dict | None = None):
    try:
        return await create_brand(brief, keep)
    except NotConfigured as e:
        raise HTTPException(status_code=503, detail=str(e))
    except LLMError as e:
        raise HTTPException(status_code=429 if e.status == 429 else 502, detail=f"AI generation failed: {e}")


def _add_version(db: Session, brand: Brand, kit: dict, locked: list[str], note: str) -> None:
    number = max((v.version for v in brand.versions), default=0) + 1
    brand.versions.append(BrandVersion(version=number, kit=kit, locked=locked, note=note))
    brand.current_version = number


# ── routes ──────────────────────────────────────────────────────────────────
@router.get("/brands", response_model=list[BrandSummary])
def list_brands(user: User = Depends(current_user), db: Session = Depends(get_db)):
    brands = db.scalars(
        select(Brand).options(selectinload(Brand.versions))
        .where(Brand.user_id == user.id).order_by(Brand.updated_at.desc())
    ).all()
    return [_summary(b) for b in brands]


@router.post("/brands", response_model=BrandDetail, status_code=201)
async def create(brief: Brief, user: User = Depends(current_user), db: Session = Depends(get_db)):
    check_quota(db, user)
    kit = await _generate(brief)
    brand = Brand(user_id=user.id, name=kit.brand_name[:80], slug=slugify(kit.brand_name),
                  brief=brief.model_dump())
    db.add(brand)
    _add_version(db, brand, kit.model_dump(), [], "Generated")
    db.commit()
    return _detail(_own_brand(db, user, brand.id))


@router.get("/brands/{brand_id}", response_model=BrandDetail)
def get_brand(brand_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return _detail(_own_brand(db, user, brand_id))


@router.post("/brands/{brand_id}/regenerate", response_model=BrandDetail)
async def regenerate(brand_id: int, body: RegenerateIn,
                     user: User = Depends(current_user), db: Session = Depends(get_db)):
    brand = _own_brand(db, user, brand_id)
    check_quota(db, user)
    brief = body.brief or Brief(**brand.brief)
    keep = locked_parts(brand.current.kit, list(body.locked))
    kit = await _generate(brief, keep)
    if body.brief:
        brand.brief = body.brief.model_dump()
    note = f"Regenerated (kept {', '.join(body.locked)})" if body.locked else "Regenerated"
    _add_version(db, brand, kit.model_dump(), list(body.locked), note)
    db.commit()
    return _detail(_own_brand(db, user, brand_id))


@router.post("/brands/{brand_id}/versions/{number}/restore", response_model=BrandDetail)
def restore(brand_id: int, number: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    brand = _own_brand(db, user, brand_id)
    old = brand.version(number)
    if not old:
        raise HTTPException(status_code=404, detail="Version not found")
    _add_version(db, brand, old.kit, [], f"Restored v{number}")
    db.commit()
    return _detail(_own_brand(db, user, brand_id))


@router.patch("/brands/{brand_id}", response_model=BrandDetail)
def update(brand_id: int, body: BrandUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    brand = _own_brand(db, user, brand_id)
    if body.name is not None:
        brand.name = body.name.strip()
    if body.is_public is not None:
        brand.is_public = body.is_public
    db.commit()
    return _detail(_own_brand(db, user, brand_id))


@router.delete("/brands/{brand_id}", status_code=204)
def delete(brand_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(_own_brand(db, user, brand_id))
    db.commit()


@router.get("/public/{slug}", response_model=PublicBrand)
def public_brand(slug: str, db: Session = Depends(get_db)):
    brand = db.scalar(
        select(Brand).options(selectinload(Brand.versions))
        .where(Brand.slug == slug, Brand.is_public.is_(True))
    )
    if not brand:
        raise HTTPException(status_code=404, detail="This brand is private or doesn't exist")
    return PublicBrand(name=brand.name, slug=brand.slug, kit=brand.current.kit)
