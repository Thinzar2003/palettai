from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(80))
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    brands: Mapped[list[Brand]] = relationship(back_populates="owner", cascade="all, delete-orphan")


class Brand(Base):
    __tablename__ = "brands"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    brief: Mapped[dict] = mapped_column(JSON)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    current_version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    owner: Mapped[User] = relationship(back_populates="brands")
    versions: Mapped[list[BrandVersion]] = relationship(
        back_populates="brand", cascade="all, delete-orphan", order_by="BrandVersion.version"
    )

    def version(self, number: int) -> BrandVersion | None:
        return next((v for v in self.versions if v.version == number), None)

    @property
    def current(self) -> BrandVersion:
        return self.version(self.current_version) or self.versions[-1]


class BrandVersion(Base):
    __tablename__ = "brand_versions"
    __table_args__ = (UniqueConstraint("brand_id", "version"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey("brands.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    kit: Mapped[dict] = mapped_column(JSON)
    locked: Mapped[list] = mapped_column(JSON, default=list)   # parts kept from the previous version
    note: Mapped[str] = mapped_column(String(120), default="")  # e.g. "Generated", "Restored v2"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    brand: Mapped[Brand] = relationship(back_populates="versions")
