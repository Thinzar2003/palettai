"""Curated Google Fonts the AI is allowed to pick from.

Keeping a whitelist means every font the model suggests actually exists
and loads, and Thai always has a proper Thai typeface.
"""

HEADING_FONTS = [
    "Playfair Display", "DM Serif Display", "Fraunces", "Cormorant Garamond",
    "Space Grotesk", "Syne", "Bricolage Grotesque", "Montserrat", "Poppins",
    "Archivo Black", "Bebas Neue", "Righteous", "Pacifico", "Caveat",
]

BODY_FONTS = [
    "Inter", "DM Sans", "Manrope", "Work Sans", "Lato", "Source Sans 3",
    "Nunito", "Karla", "IBM Plex Sans",
]

THAI_FONTS = [
    "Kanit", "Prompt", "Sarabun", "IBM Plex Sans Thai", "Noto Sans Thai",
    "Mitr", "Chakra Petch", "Bai Jamjuree", "Noto Serif Thai", "Trirong",
]

DEFAULTS = {"heading": "Space Grotesk", "body": "Inter", "thai": "Prompt"}


def _match(name: str | None, allowed: list[str]) -> str | None:
    if not name:
        return None
    lookup = {f.lower(): f for f in allowed}
    return lookup.get(name.strip().lower())


def validate_fonts(fonts: dict | None) -> dict:
    fonts = fonts or {}
    return {
        "heading": _match(fonts.get("heading"), HEADING_FONTS) or DEFAULTS["heading"],
        "body": _match(fonts.get("body"), BODY_FONTS) or DEFAULTS["body"],
        "thai": _match(fonts.get("thai"), THAI_FONTS) or DEFAULTS["thai"],
        "reason": str(fonts.get("reason", ""))[:300],
    }
