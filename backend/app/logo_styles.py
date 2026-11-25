"""Logo styles: each one is a different visual direction for the image model and the SVG fallback."""
from __future__ import annotations

import colorsys

from .colors import hex_to_rgb

LOGO_STYLES: dict[str, dict[str, str]] = {
    "minimal": {
        "label": "Minimal",
        "flux": "minimalist logo icon of {subject}, made of 2 to 4 bold solid shapes, thick strokes, generous negative space",
        "svg": "minimal: 3-6 bold flat shapes, lots of negative space",
    },
    "geometric": {
        "label": "Geometric",
        "flux": "geometric abstract logo mark inspired by {subject}, built from circles, triangles and arcs, symmetrical, modern",
        "svg": "geometric: abstract mark built from circles, triangles and arcs, symmetrical",
    },
    "mascot": {
        "label": "Mascot",
        "flux": "friendly cute mascot character logo, {subject}, simple cartoon with thick outlines, big friendly eyes",
        "svg": "mascot: a simple friendly character with a face, thick outlines",
    },
    "emblem": {
        "label": "Emblem",
        "flux": "circular badge emblem logo featuring {subject} inside a bold ring border, vintage stamp style, symmetrical",
        "svg": "emblem: the symbol inside a bold circular ring, badge style",
    },
    "lettermark": {
        "label": "Lettermark",
        "flux": 'bold monogram logo of the single capital letter "{letter}" as a custom glyph, cleverly combined with {subject}',
        "svg": 'lettermark: the letter "{letter}" built from geometric shapes (paths only, no <text>), combined with the symbol',
    },
    "line": {
        "label": "Line art",
        "flux": "line art logo icon of {subject}, one continuous thick outline of even weight, rounded stroke ends, elegant",
        "svg": "line art: unfilled strokes of one consistent width, rounded caps",
    },
    "thai": {
        "label": "Thai motif",
        "flux": "Thai-inspired logo icon of {subject} decorated with traditional Thai ornament (lai Thai) flame-like curls, elegant, symmetrical",
        "svg": "Thai motif: symbol framed with Thai ornamental flame curls (kanok), symmetrical",
    },
}

_COMMON = ("professional logo design, bold thick shapes, chunky lines, simple and iconic, readable at small sizes, "
           "flat vector, centered, isolated on a plain pure white background, high contrast, solid flat colours, "
           "no thin lines, no fine detail, no gradients, no watermark, no mockup, no shadow, no frame")
_NO_TEXT = "no text, no words, no letters"


def normalize_styles(styles: list[str] | None, personality: list[str] | None = None) -> list[str]:
    """Always return 3 styles. Empty = pick automatically from the brand personality."""
    chosen = [s for s in (styles or []) if s in LOGO_STYLES][:3]
    if not chosen:
        mood = " ".join(personality or []).lower()
        third = "mascot" if any(w in mood for w in ("playful", "fun", "friendly", "cheerful", "cute")) else "emblem"
        return ["minimal", "geometric", third]
    while len(chosen) < 3:
        chosen.append(chosen[len(chosen) % len(chosen)])
    return chosen


def color_word(hex_: str) -> str:
    """'#C8682C' -> 'burnt orange'-ish plain words an image model understands."""
    r, g, b = (c / 255 for c in hex_to_rgb(hex_))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    if l < 0.13:
        return "near-black"
    if l > 0.92:
        return "white"
    if s < 0.12:
        return "dark grey" if l < 0.4 else "light grey" if l > 0.7 else "grey"
    names = ["red", "orange", "yellow", "lime green", "green", "teal", "cyan", "sky blue",
             "blue", "indigo", "purple", "magenta", "pink"]
    bounds = [15, 40, 65, 90, 150, 175, 195, 215, 245, 265, 290, 320, 345]
    deg = h * 360
    hue = next((n for n, b_ in zip(names, bounds) if deg < b_), "red")
    if hue == "orange" and l < 0.35:
        hue = "brown"
    prefix = "dark " if l < 0.3 else "light " if l > 0.75 else "pastel " if l > 0.65 else ""
    return prefix + hue


def build_flux_prompt(style: str, subject: str, letter: str, palette: dict[str, str]) -> str:
    st = LOGO_STYLES[style]
    main = st["flux"].format(subject=subject.strip().rstrip("."), letter=letter or "A")
    colours = ", ".join(dict.fromkeys(color_word(palette[r]) for r in ("primary", "accent", "text") if r in palette))
    no_text = "no other text" if style == "lettermark" else _NO_TEXT
    return f"{main}, colour palette limited to {colours}, {_COMMON}, {no_text}"
