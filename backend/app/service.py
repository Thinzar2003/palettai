"""Turns a raw model response into a clean, validated, accessible BrandKit."""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from pydantic import ValidationError

from .colors import fix_palette, normalize_hex
from .fonts import validate_fonts
from .llm import LLMError, NotConfigured, call_provider, provider_chain
from .mock import mock_brand
from .imagegen import ImageGenError, generate_image, image_configured
from .logo_styles import LOGO_STYLES, build_flux_prompt, normalize_styles
from .vectorize import image_to_logo_svg
from .webimport import WebImportError, read_site
from .prompts import (DAILY_POST_SYSTEM, PROMO_SYSTEM, REPLY_SYSTEM, build_daily_post_prompt, build_promo_prompt,
                      build_reply_prompt,
                      IMPORT_SYSTEM, build_import_prompt, LOGO_CONCEPT_SYSTEM, LOGO_SYSTEM, build_logo_concept_prompt, SOCIAL_SYSTEM, SYSTEM_PROMPT, build_logo_prompt, build_refine_prompt,
                      build_social_prompt, build_user_prompt)
from .schemas import ROLES, Brief, BrandKit, ImportFound, ImportOut, PromoOut, ReplyOut, KitEdit, LogoIcon, SocialPost
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


def _parse_icons(styles: list[str]):
    def parse(raw: dict, *_args) -> list[dict]:
        icons = []
        for i, item in enumerate((raw.get("icons") or [])[:4]):
            try:
                style = styles[i] if i < len(styles) else str(item.get("style", ""))
                icons.append(LogoIcon(name=str(item.get("name", ""))[:60], concept=str(item.get("concept", ""))[:200],
                                      style=style, source="svg",
                                      svg=sanitize_svg(str(item.get("svg", "")))).model_dump())
            except (SvgError, AttributeError) as e:
                log.info("Dropped an invalid icon: %s", e)
        if not icons:
            raise ValueError("No valid SVG icons in the response")
        return icons
    return parse


async def _plan_concepts(brief: Brief, kit: dict, styles: list[str]) -> list[dict]:
    """Ask the text model for one distinct idea per style; fall back to the brief's idea."""
    fallback_subject = kit.get("logo", {}).get("symbol") or kit.get("brand_name", "the brand")

    def parse(raw: dict, *_args) -> list[dict]:
        items = [i for i in (raw.get("icons") or []) if isinstance(i, dict)]
        if not items:
            raise ValueError("No concepts")
        return items

    try:
        items, _, _ = await generate_with_chain(LOGO_CONCEPT_SYSTEM, build_logo_concept_prompt(brief, kit, styles), parse)
    except (LLMError, NotConfigured) as e:
        log.warning("Concept planning failed, using the brief's idea: %s", e)
        items = []
    concepts = []
    for i, style in enumerate(styles):
        item = items[i] if i < len(items) else {}
        concepts.append({
            "style": style,
            "name": str(item.get("name") or LOGO_STYLES[style]["label"])[:60],
            "concept": str(item.get("concept") or "")[:200],
            "subject": str(item.get("subject") or fallback_subject)[:200],
        })
    return concepts


async def _draw_and_trace(concept: dict, kit: dict, match_colors: bool, industry: str | None = None) -> dict:
    palette = {c["role"]: c["hex"] for c in kit.get("palette", [])}
    letter = (kit.get("logo", {}).get("monogram") or kit.get("brand_name", "A"))[:1]
    # Image safety filters sometimes block harmless prompts: retry with plainer subjects.
    subjects = list(dict.fromkeys(filter(None, [
        concept["subject"],
        kit.get("logo", {}).get("symbol"),
        f"a simple symbol for a {industry}" if industry else None,
        "a simple abstract symbol",
    ])))
    image, last = None, None
    for subject in subjects:
        try:
            image = await generate_image(build_flux_prompt(concept["style"], subject, letter, palette))
            break
        except ImageGenError as e:
            last = e
            if not e.blocked:
                raise
            log.info("Safety filter blocked a %s prompt; retrying with a plainer subject", concept["style"])
    if image is None:
        raise last or ImageGenError("no image")
    snap = list(palette.values()) if match_colors else None
    svg = await asyncio.to_thread(image_to_logo_svg, image, snap)
    return LogoIcon(name=concept["name"], concept=concept["concept"] or concept["subject"],
                    style=concept["style"], source="flux", svg=svg).model_dump()


async def generate_icons(brief: Brief, kit: dict, styles: list[str] | None = None,
                         match_colors: bool = True) -> list[dict]:
    """3 logo symbols. With Cloudflare: FLUX image → traced SVG. Otherwise: the LLM draws SVG code."""
    styles = normalize_styles(styles, kit.get("personality"))
    if image_configured():
        concepts = await _plan_concepts(brief, kit, styles)
        results = await asyncio.gather(*(_draw_and_trace(c, kit, match_colors, brief.industry) for c in concepts),
                                       return_exceptions=True)
        icons = [r for r in results if isinstance(r, dict)]
        for r in results:
            if isinstance(r, Exception):
                log.warning("Image logo failed: %s", r)
        if icons:
            return icons
        log.warning("All image logos failed; falling back to SVG drawing")
    icons, _, _ = await generate_with_chain(LOGO_SYSTEM, build_logo_prompt(brief, kit, styles), _parse_icons(styles))
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


VIBES = {"Warm", "Minimal", "Playful", "Premium", "Natural", "Bold", "Retro", "Techy"}


async def import_brief(url: str | None, pasted: str | None) -> ImportOut:
    """Website / Facebook page (and/or pasted text) → a pre-filled brief + their current identity."""
    url, pasted = (url or "").strip(), (pasted or "").strip()
    if not url and len(pasted) < 20:
        raise WebImportError("Enter a link, or paste a short description (at least 20 characters).")
    info = await read_site(url) if url else None

    def parse(raw: dict, *_args) -> dict:
        if not raw.get("business_name") or not raw.get("description"):
            raise ValueError("Incomplete brief")
        return raw

    raw, _, _ = await generate_with_chain(IMPORT_SYSTEM, build_import_prompt(info, pasted), parse)
    found = ImportFound(
        source_url=(info or {}).get("url", ""), title=(info or {}).get("title", ""),
        colors=(info or {}).get("colors", []), fonts=(info or {}).get("fonts", []),
        image=(info or {}).get("image", ""), from_facebook=bool((info or {}).get("from_facebook")),
        tone=str(raw.get("tone", ""))[:300],
    )
    ref = []
    if found.colors:
        ref.append("colours " + ", ".join(found.colors))
    if found.fonts:
        ref.append("fonts " + ", ".join(found.fonts))
    if found.tone:
        ref.append("voice: " + found.tone)
    language = raw.get("language") if raw.get("language") in ("en", "th", "both") else "both"
    brief = Brief(
        business_name=str(raw["business_name"]).strip()[:60],
        description=str(raw["description"]).strip()[:600],
        industry=(str(raw.get("industry") or "").strip()[:80] or None),
        audience=(str(raw.get("audience") or "").strip()[:160] or None),
        vibes=[v for v in (raw.get("vibes") or []) if v in VIBES][:3],
        language=language,
        reference=("; ".join(ref)[:1000] or None),
    )
    return ImportOut(brief=brief, found=found)


# ── Daily tools ──────────────────────────────────────────────────────────────
def _clean_tags(tags) -> list[str]:
    return [str(t).lstrip("#").replace(" ", "")[:40] for t in (tags or []) if str(t).strip()][:8]


async def daily_post(brief: Brief, kit: dict, ctx_text: str, idea: str | None, event: str | None) -> dict:
    def parse(raw: dict, *_args) -> dict:
        posts = _parse_posts(brief.language)({"posts": [raw, raw, raw]})  # reuse validation (needs 3)
        return posts[0]
    post, _, _ = await generate_with_chain(DAILY_POST_SYSTEM, build_daily_post_prompt(brief, kit, ctx_text, idea, event), parse)
    return post


async def promo(brief: Brief, kit: dict, ctx_text: str, offer: str, period: str | None) -> dict:
    def parse(raw: dict, *_args) -> dict:
        out = PromoOut.model_validate({**raw, "hashtags": _clean_tags(raw.get("hashtags"))})
        if not out.headline or not (out.facebook_caption or out.line_message):
            raise ValueError("Incomplete promo")
        return out.model_dump()
    result, _, _ = await generate_with_chain(PROMO_SYSTEM, build_promo_prompt(brief, kit, ctx_text, offer, period), parse)
    return result


async def reply(brief: Brief, kit: dict, message: str, platform: str, tweak: str | None) -> dict:
    def parse(raw: dict, *_args) -> dict:
        data = {**raw}
        if data.get("sentiment") not in ("positive", "neutral", "negative", "question"):
            data["sentiment"] = "neutral"
        if data.get("language") not in ("th", "en"):
            data["language"] = "th"
        out = ReplyOut.model_validate(data)
        if not out.reply.strip():
            raise ValueError("Empty reply")
        return out.model_dump()
    result, _, _ = await generate_with_chain(REPLY_SYSTEM, build_reply_prompt(brief, kit, message, platform, tweak), parse)
    return result
