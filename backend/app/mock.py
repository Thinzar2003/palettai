"""Offline brand generator so the app works with no API key (dev + demos)."""
import hashlib

PRESETS = {
    "warm": [("Thai Tea Amber", "#C8682C"), ("Condensed Cream", "#F2D9B8"),
             ("Pandan Leaf", "#4E7A3A"), ("Rice Paper", "#FFF8EF"), ("Roasted Bean", "#3B2418")],
    "minimal": [("Graphite", "#2B2D33"), ("Fog", "#C9CDD4"),
                ("Signal Blue", "#2F6BFF"), ("Paper", "#FAFAF7"), ("Ink", "#16171A")],
    "playful": [("Mango Pop", "#FF8A1F"), ("Bubblegum", "#FF6FAE"),
                ("Lagoon", "#18B6C9"), ("Cloud", "#FFF9F2"), ("Midnight", "#22223B")],
    "premium": [("Deep Jade", "#0F4C44"), ("Champagne", "#D9C29A"),
                ("Gold Leaf", "#B8892E"), ("Ivory", "#F7F3EA"), ("Onyx", "#141414")],
    "natural": [("Moss", "#5C7A3D"), ("Clay", "#C98B5E"),
                ("Lotus", "#E7A6B3"), ("Linen", "#F6F1E7"), ("Bark", "#2F2A22")],
    "bold": [("Electric Red", "#E63946"), ("Sun", "#FFC93C"),
             ("Cobalt", "#1D4ED8"), ("Snow", "#FFFFFF"), ("Coal", "#111111")],
}
ROLES = ["primary", "secondary", "accent", "background", "text"]
FONT_SETS = [
    {"heading": "Fraunces", "body": "DM Sans", "thai": "Prompt"},
    {"heading": "Space Grotesk", "body": "Inter", "thai": "IBM Plex Sans Thai"},
    {"heading": "Bricolage Grotesque", "body": "Manrope", "thai": "Kanit"},
    {"heading": "Playfair Display", "body": "Lato", "thai": "Noto Serif Thai"},
]


def _pick(seed: str, options: list):
    return options[int(hashlib.sha1(seed.encode()).hexdigest(), 16) % len(options)]


def mock_brand(brief) -> dict:
    vibe = next((v.lower() for v in brief.vibes if v.lower() in PRESETS), None)
    vibe = vibe or _pick(brief.business_name + "palette", list(PRESETS))
    palette = [{"role": r, "name": n, "hex": h, "usage": ""}
               for r, (n, h) in zip(ROLES, PRESETS[vibe])]
    name = brief.business_name.strip()
    th = brief.language != "en"
    return {
        "brand_name": name,
        "tagline": "Made with care, every single day",
        "personality": [vibe.title(), "Friendly", "Honest", "Local"],
        "tone": "Warm and conversational, like a neighbour who knows their craft.",
        "story": f"{name} started with a simple idea: {brief.description.strip().rstrip('.')}. "
                 "Every detail is designed to make customers feel at home.",
        "keywords": ["craft", "community", "quality", "local", "joy"],
        "palette": palette,
        "fonts": {**_pick(name + "fonts", FONT_SETS),
                  "reason": "A characterful heading paired with a clean, readable body face."},
        "slogans": [
            {"en": "Good things, made slowly.", "th": "ของดี ทำอย่างตั้งใจ" if th else ""},
            {"en": "Your daily dose of happy.", "th": "ความสุขประจำวันของคุณ" if th else ""},
            {"en": "Crafted here, loved everywhere.", "th": "ทำที่นี่ รักได้ทุกที่" if th else ""},
            {"en": "Come as you are.", "th": "มาแบบที่เป็นคุณ" if th else ""},
        ],
        "logo": {"monogram": "".join(w[0] for w in name.split()[:2]).upper() or "B",
                 "symbol": "a simple rounded mark inspired by the product",
                 "style": "rounded line icon"},
    }
