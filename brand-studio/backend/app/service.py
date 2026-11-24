"""Turns a raw model response into a clean, validated, accessible BrandKit."""
from __future__ import annotations

import logging
from typing import Any

from pydantic import ValidationError

from .colors import fix_palette, normalize_hex
from .fonts import validate_fonts
from .llm import LLMError, NotConfigured, call_provider, provider_chain
from .mock import mock_brand
from .prompts import SYSTEM_PROMPT, build_user_prompt
from .schemas import ROLES, Brief, BrandKit

log = logging.getLogger("brand")

# Which BrandKit fields each lockable part covers.
LOCK_FIELDS: dict[str, list[str]] = {
    "palette": ["palette"],
    "fonts": ["fonts"],
    "slogans": ["slogans", "tagline"],
    "logo": ["logo"],
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
    )


async def create_brand(brief: Brief, keep: dict[str, Any] | None = None) -> BrandKit:
    """Generate a kit. `keep` = locked fields from a previous version to preserve."""
    keep = keep or {}
    chain = provider_chain()
    if not chain:
        raise NotConfigured(
            "No AI provider configured. Add a free GEMINI_API_KEY (or GROQ_API_KEY / "
            "OPENROUTER_API_KEY) to backend/.env and restart the server."
        )
    if chain == ["mock"]:  # only when explicitly requested with LLM_PROVIDERS=mock (tests)
        return build_kit(merge_locked(mock_brand(brief), keep), brief, "mock", "offline")

    # Each provider already retries busy models and falls back across its own models,
    # so here we simply move on to the next provider.
    attempts = chain
    user = build_user_prompt(brief, keep)
    errors: list[str] = []
    for name in attempts:
        try:
            raw, model = await call_provider(name, SYSTEM_PROMPT, user)
            kit = build_kit(merge_locked(raw, keep), brief, name, model)
            log.info("Brand generated with %s (%s)", name, kit.model)
            return kit
        except (LLMError, ValidationError, KeyError, TypeError, AttributeError) as e:
            log.warning("%s failed: %s", name, e)
            errors.append(str(e))

    if errors and all(("rate limit" in e) or ("busy" in e) for e in errors):
        raise LLMError("The free AI models are busy or at their limit right now — "
                       "please wait a minute and try again.", status=429)
    raise LLMError(" | ".join(errors))
