"""Turns a raw model response into a clean, validated, accessible BrandKit."""
from __future__ import annotations

import logging
from typing import Any

from pydantic import ValidationError

from .colors import fix_palette, normalize_hex
from .fonts import validate_fonts
from .llm import LLMError, NotConfigured, call_provider, provider_chain
from .mock import mock_brand
from .prompts import (LOGO_SYSTEM, SOCIAL_SYSTEM, SYSTEM_PROMPT, build_logo_prompt, build_refine_prompt,
                      build_social_prompt, build_user_prompt)
from .schemas import ROLES, Brief, BrandKit, KitEdit, LogoIcon, SocialPost
from .svg import SvgError, sanitize_svg

log = logging.getLogger("brand")

# Which BrandKit fields each lockable part covers.
LOCK_FIELDS: dict[str, list[str]] = {
    "palette": ["palette"],
    "fonts": ["fonts"],
    "slogans": ["slogans", "tagline"],
    "logo": ["logo", "icons", "selected_icon"],
    "story": ["personality", "tone", "story", "keywords"],
}


def locked_parts(previous: dict | None, locked: list[str]) -> dict[str, Any]:
    """The fields from a previous kit that the user wants to keep."""
    if not previous:
        return {}
    keep: dict[str, Any] = {}
    for part in locked:
        for field in LOCK_FIELDS.get(part, []):
            if field in previous:
                keep[field] = previous[field]
    return keep


def merge_locked(raw: dict, keep: dict[str, Any]) -> dict:
    """Overwrite freshly generated fields with the locked ones (the model may drift)."""
    return {**raw, **keep}


def build_kit(raw: dict, brief: Brief, source: str, model: str = "") -> BrandKit:
    fallback = mock_brand(brief)

    # Palette: one valid colour per role, falling back to a preset for gaps.
    by_role: dict[str, dict] = {}
    for c in raw.get("palette") or []:
        try:
            role = c.get("role")
            if role in ROLES and role not in by_role:
                by_role[role] = {**c, "hex": normalize_hex(c.get("hex", ""))}
        except (ValueError, AttributeError):
            continue
    for c in fallback["palette"]:
        by_role.setdefault(c["role"], c)

    fixed, on_primary, report = fix_palette({r: by_role[r]["hex"] for r in ROLES})
    palette = [{"role": r, "name": by_role[r].get("name") or r.title(),
                "hex": fixed[r], "usage": by_role[r].get("usage", "")} for r in ROLES]

    logo = raw.get("logo") or fallback["logo"]
    logo["monogram"] = (logo.get("monogram") or fallback["logo"]["monogram"])[:2]

    slogans = raw.get("slogans") or fallback["slogans"]
    if brief.language == "en":
        slogans = [{"en": s.get("en", ""), "th": ""} for s in slogans]

    return BrandKit(
        brand_name=raw.get("brand_name") or brief.business_name,
        tagline=raw.get("tagline") or fallback["tagline"],
        personality=(raw.get("personality") or fallback["personality"])[:5],
        tone=raw.get("tone") or fallback["tone"],
        story=raw.get("story") or fallback["story"],
        keywords=(raw.get("keywords") or fallback["keywords"])[:6],
        palette=palette,
        on_primary=on_primary,
        fonts=validate_fonts(raw.get("fonts")),
        slogans=slogans[:4],
        logo=logo,
        contrast=report,
        source=source,
        model=model,
        icons=(icons := _valid_list(raw.get("icons"), LogoIcon)),
        selected_icon=sel if isinstance(sel := raw.get("selected_icon"), int) and 0 <= sel < len(icons) else None,
        social_posts=_valid_list(raw.get("social_posts"), SocialPost),
    )


def _valid_list(items, model) -> list:
    """Keep only the entries that validate (stored extras should never break a kit)."""
    out = []
    for item in items or []:
        try:
            out.append(model.model_validate(item))
        except (ValidationError, TypeError):
            continue
    return out


def _ensure_configured() -> list[str]:
    chain = provider_chain()
    if not chain:
        raise NotConfigured(
            "No AI provider configured. Add a free GEMINI_API_KEY (or GROQ_API_KEY / "
            "OPENROUTER_API_KEY) to backend/.env and restart the server."
        )
    return chain


async def generate_with_chain(system: str, user: str, validate=None) -> tuple[Any, str, str]:
    """Call providers in order until one returns JSON that `validate` accepts.
    Returns (validated_result, provider, model)."""
    errors: list[str] = []
    for name in _ensure_configured():
        try:
            raw, model = await call_provider(name, system, user)
            result = validate(raw, name, model) if validate else raw
            log.info("AI call ok with %s (%s)", name, model)
            return result, name, model
        except (LLMError, ValidationError, KeyError, TypeError, AttributeError, ValueError) as e:
            log.warning("%s failed: %s", name, e)
            errors.append(str(e))
    if errors and all(("rate limit" in e) or ("busy" in e) for e in errors):
        raise LLMError("The free AI models are busy or at their limit right now — "
                       "please wait a minute and try again.", status=429)
    raise LLMError(" | ".join(errors))


# Extras that live on a kit but are never sent to the model when (re)designing.
EXTRA_FIELDS = ("icons", "selected_icon", "social_posts")


async def create_brand(brief: Brief, keep: dict[str, Any] | None = None) -> BrandKit:
    """Generate a kit. `keep` = locked fields from a previous version to preserve."""
    keep = keep or {}
    if _ensure_configured() == ["mock"]:  # only with LLM_PROVIDERS=mock (tests)
        return build_kit(merge_locked(mock_brand(brief), keep), brief, "mock", "offline")
    prompt_keep = {k: v for k, v in keep.items() if k not in EXTRA_FIELDS}
    kit, _, _ = await generate_with_chain(
        SYSTEM_PROMPT, build_user_prompt(brief, prompt_keep),
        lambda raw, name, model: build_kit(merge_locked(raw, keep), brief, name, model),
    )
    return kit


async def refine_kit(brief: Brief, kit: dict, instruction: str) -> BrandKit:
    """AI edit: 'make it warmer'. Logo icons and social posts carry over."""
    extras = {k: kit[k] for k in EXTRA_FIELDS if k in kit}
    result, _, _ = await generate_with_chain(
        SYSTEM_PROMPT, build_refine_prompt(brief, kit, instruction),
        lambda raw, name, model: build_kit({**raw, **extras}, brief, name, model),
    )
    return result


def apply_edit(brief: Brief, kit: dict, edit: KitEdit) -> BrandKit:
    """Hand edit: merge the changed fields, then re-run validation + contrast fixing."""
    changes = edit.model_dump(exclude_none=True)
    merged = {**kit, **changes}
    return build_kit(merged, brief, kit.get("source", "edit"), kit.get("model", ""))


def _parse_icons(raw: dict, *_args) -> list[dict]:
    icons = []
    for item in (raw.get("icons") or [])[:4]:
        try:
            icons.append(LogoIcon(name=str(item.get("name", ""))[:60], concept=str(item.get("concept", ""))[:200],
                                  svg=sanitize_svg(str(item.get("svg", "")))).model_dump())
        except (SvgError, AttributeError) as e:
            log.info("Dropped an invalid icon: %s", e)
    if not icons:
        raise ValueError("No valid SVG icons in the response")
    return icons


async def generate_icons(brief: Brief, kit: dict) -> list[dict]:
    icons, _, _ = await generate_with_chain(LOGO_SYSTEM, build_logo_prompt(brief, kit), _parse_icons)
    return icons


def _parse_posts(language: str):
    def parse(raw: dict, *_args) -> list[dict]:
        posts = []
        for i, item in enumerate((raw.get("posts") or [])[:7]):
            if not isinstance(item, dict):
                continue
            item = {**item, "day": i + 1}
            if item.get("layout") not in ("quote", "promo", "tip", "announcement"):
                item["layout"] = "quote"
            if language == "en":
                item["caption_th"] = ""
            item["hashtags"] = [str(h).lstrip("#").replace(" ", "") for h in item.get("hashtags") or []][:8]
            posts.append(SocialPost.model_validate(item).model_dump())
        if len(posts) < 3:
            raise ValueError("Too few posts in the response")
        return posts
    return parse


async def generate_social(brief: Brief, kit: dict) -> list[dict]:
    posts, _, _ = await generate_with_chain(SOCIAL_SYSTEM, build_social_prompt(brief, kit), _parse_posts(brief.language))
    return posts
