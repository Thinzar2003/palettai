"""Color utilities: WCAG contrast checks and automatic palette fixing.

Pure standard library so it can be unit-tested without any dependencies.
"""
from __future__ import annotations

import colorsys
import re

HEX_RE = re.compile(r"^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$")
WHITE = "#FFFFFF"
INK = "#111111"
AA_NORMAL = 4.5   # body text
AA_LARGE = 3.0    # large text / UI elements


def normalize_hex(value: str) -> str:
    m = HEX_RE.match(value.strip())
    if not m:
        raise ValueError(f"Invalid hex color: {value!r}")
    h = m.group(1)
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return "#" + h.upper()


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    h = normalize_hex(value)[1:]
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def rgb_to_hex(r: float, g: float, b: float) -> str:
    clamp = lambda x: max(0, min(255, round(x)))
    return "#{:02X}{:02X}{:02X}".format(clamp(r), clamp(g), clamp(b))


def relative_luminance(value: str) -> float:
    def channel(c: int) -> float:
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = hex_to_rgb(value)
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)


def contrast_ratio(a: str, b: str) -> float:
    la, lb = relative_luminance(a), relative_luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return round((hi + 0.05) / (lo + 0.05), 2)


def best_text_on(bg: str) -> str:
    """White or near-black, whichever reads better on `bg`."""
    return WHITE if contrast_ratio(WHITE, bg) >= contrast_ratio(INK, bg) else INK


def adjust_for_contrast(fg: str, bg: str, target: float = AA_NORMAL) -> str:
    """Nudge fg's lightness (keeping its hue) until it meets `target` against bg."""
    fg, bg = normalize_hex(fg), normalize_hex(bg)
    if contrast_ratio(fg, bg) >= target:
        return fg
    r, g, b = (c / 255 for c in hex_to_rgb(fg))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    step = -0.02 if relative_luminance(bg) > 0.18 else 0.02  # darken on light bg
    for _ in range(60):
        l = max(0.0, min(1.0, l + step))
        candidate = rgb_to_hex(*(c * 255 for c in colorsys.hls_to_rgb(h, l, s)))
        if contrast_ratio(candidate, bg) >= target:
            return candidate
        if l in (0.0, 1.0):
            break
    return best_text_on(bg)


def fix_palette(colors: dict[str, str]) -> tuple[dict[str, str], str, list[dict]]:
    """Make a role->hex palette accessible.

    Returns (fixed_palette, on_primary_text_color, contrast_report).
    """
    p = {role: normalize_hex(hex_) for role, hex_ in colors.items()}
    report: list[dict] = []

    # 1. Body text on background must pass AA.
    before = contrast_ratio(p["text"], p["background"])
    if before < AA_NORMAL:
        p["text"] = adjust_for_contrast(p["text"], p["background"], AA_NORMAL)
    after = contrast_ratio(p["text"], p["background"])
    report.append({"pair": "text / background", "ratio": after,
                   "passes": after >= AA_NORMAL, "fixed": before < AA_NORMAL})

    # 2. Primary used as a heading/accent colour on the background: AA large.
    before = contrast_ratio(p["primary"], p["background"])
    if before < AA_LARGE:
        p["primary"] = adjust_for_contrast(p["primary"], p["background"], AA_LARGE)
    after = contrast_ratio(p["primary"], p["background"])
    report.append({"pair": "primary / background", "ratio": after,
                   "passes": after >= AA_LARGE, "fixed": before < AA_LARGE})

    # 3. Text placed on primary buttons/cards.
    on_primary = best_text_on(p["primary"])
    ratio = contrast_ratio(on_primary, p["primary"])
    report.append({"pair": "on-primary text / primary", "ratio": ratio,
                   "passes": ratio >= AA_NORMAL, "fixed": False})

    return p, on_primary, report
