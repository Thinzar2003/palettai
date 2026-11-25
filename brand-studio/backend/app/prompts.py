import json

from .fonts import BODY_FONTS, HEADING_FONTS, THAI_FONTS

SYSTEM_PROMPT = f"""You are a senior brand designer at a studio in Bangkok.
You create cohesive, modern brand identities for small businesses, in English and Thai.

Reply with ONE JSON object and nothing else (no markdown fences), exactly this shape:
{{
  "brand_name": string,                  // keep the client's name unless it is empty
  "tagline": string,                     // max 8 words, English
  "personality": [string, ...],          // 3-5 adjectives
  "tone": string,                        // one sentence on the voice
  "story": string,                       // 2 sentences brand story, English
  "keywords": [string, ...],             // 5 keywords
  "palette": [                           // exactly 5 colours, one per role
    {{"role": "primary"|"secondary"|"accent"|"background"|"text",
      "name": string,                    // evocative name, e.g. "Thai Tea Amber"
      "hex": "#RRGGBB",
      "usage": string}}
  ],
  "fonts": {{"heading": string, "body": string, "thai": string, "reason": string}},
  "slogans": [{{"en": string, "th": string}}, ...],   // 4 options
  "logo": {{"monogram": string,           // 1-2 letters
            "symbol": string,            // a simple icon idea, max 12 words
            "style": string}}            // e.g. "rounded line icon"
}}

Rules:
- heading font MUST be one of: {", ".join(HEADING_FONTS)}
- body font MUST be one of: {", ".join(BODY_FONTS)}
- thai font MUST be one of: {", ".join(THAI_FONTS)}
- background is usually a light tint (or a deep tone for dark/luxury brands); text must be readable on it.
- Thai slogans must be natural Thai a native copywriter would write, not literal translations.
- If language is "en", leave every "th" field as "". If language is "th", still fill "en".
"""


def build_user_prompt(brief, keep: dict | None = None) -> str:
    lines = [
        f"Business name: {brief.business_name}",
        f"What they do: {brief.description}",
    ]
    if brief.industry:
        lines.append(f"Industry: {brief.industry}")
    if brief.audience:
        lines.append(f"Target audience: {brief.audience}")
    if brief.vibes:
        lines.append(f"Desired vibe: {', '.join(brief.vibes)}")
    lines.append(f"Language: {brief.language}")
    if keep:
        lines.append(
            "\nThe client LOVES these parts. Return them unchanged and design everything else "
            "to harmonise with them:\n" + json.dumps(keep, ensure_ascii=False)
        )
    else:
        lines.append("\nMake it distinctive: avoid generic choices.")
    return "\n".join(lines)


# Kit fields that are core design data (sent to the model when refining).
CORE_FIELDS = ("brand_name", "tagline", "personality", "tone", "story", "keywords",
               "palette", "fonts", "slogans", "logo")


def core_kit(kit: dict) -> dict:
    return {k: kit[k] for k in CORE_FIELDS if k in kit}


def build_refine_prompt(brief, kit: dict, instruction: str) -> str:
    return (
        f"Business: {brief.business_name} — {brief.description}\n"
        f"Language: {brief.language}\n\n"
        "Here is the CURRENT brand kit:\n"
        f"{json.dumps(core_kit(kit), ensure_ascii=False)}\n\n"
        f'The client asks: "{instruction}"\n\n'
        "Apply the request. Change only what is needed to satisfy it and keep everything else "
        "identical. Return the FULL brand kit JSON in the same shape."
    )


LOGO_CONCEPT_SYSTEM = """You are the art director of a branding studio. For each requested logo style,
invent a DISTINCT visual idea for the brand's logo symbol.

Reply with ONE JSON object and nothing else:
{"icons": [{"style": string,       // copy the requested style id
            "name": string,        // 2-4 word name for the idea
            "concept": string,     // one sentence: why it fits the brand
            "subject": string}]}   // 6-15 words: the concrete things to draw. Objects only, no text or letters.

One entry per requested style, in the same order. Make the subjects clearly different from each other:
combine the product, the place (Thailand when relevant) and the brand's personality in surprising ways."""


def build_logo_concept_prompt(brief, kit: dict, styles: list[str]) -> str:
    from .logo_styles import LOGO_STYLES

    return (
        f"Brand: {kit.get('brand_name')} — {kit.get('tagline')}\n"
        f"What they do: {brief.description}\n"
        f"Audience: {brief.audience or 'general'}\n"
        f"Personality: {', '.join(kit.get('personality', []))}\n"
        f"Keywords: {', '.join(kit.get('keywords', []))}\n"
        f"First idea from the brief: {kit.get('logo', {}).get('symbol', '')}\n"
        "Requested styles, in order: "
        + "; ".join(f"{i + 1}. {s} ({LOGO_STYLES[s]['label']})" for i, s in enumerate(styles))
    )


LOGO_SYSTEM = """You are a senior logo designer. You draw iconic, modern logo SYMBOLS as SVG code.

Reply with ONE JSON object and nothing else:
{"icons": [{"style": string, "name": string, "concept": string, "svg": string}, ...]}

Draw exactly one icon per requested style, in the same order, and make them look clearly different.
Each "svg" must:
- be <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"> … </svg>
- use ONLY: path, circle, ellipse, rect, line, polyline, polygon, g (linearGradient/radialGradient allowed, sparingly)
- contain NO text elements, images, scripts or styles
- be rich enough to look designed (8-25 elements, curves via path "C"/"Q" commands, overlaps and negative space),
  yet readable at 32px, centred with ~8 units of padding
- use ONLY the colours given by the client
"concept" is one sentence explaining the idea."""


def build_logo_prompt(brief, kit: dict, styles: list[str] | None = None) -> str:
    from .logo_styles import LOGO_STYLES

    colours = ", ".join(f'{c["hex"]} ({c["role"]})' for c in kit.get("palette", []))
    logo = kit.get("logo", {})
    letter = (logo.get("monogram") or kit.get("brand_name", "A"))[:1]
    lines = [
        f"Brand: {kit.get('brand_name')} — {kit.get('tagline')}",
        f"What they do: {brief.description}",
        f"Personality: {', '.join(kit.get('personality', []))}",
        f"Icon idea from the brand brief: {logo.get('symbol', '')}",
        f"Colours you may use: {colours}. Prefer the primary colour; use the background colour only as negative space.",
    ]
    if styles:
        lines.append("Requested styles, in order: " + "; ".join(
            f"{i + 1}. {s} — {LOGO_STYLES[s]['svg'].format(letter=letter)}" for i, s in enumerate(styles)))
    return "\n".join(lines)


SOCIAL_SYSTEM = """You are a social media manager for small businesses in Thailand.
Plan one week (7 days) of Instagram/Facebook posts for the brand.

Reply with ONE JSON object and nothing else:
{"posts": [{
  "day": 1-7,
  "theme": string,                       // e.g. "Behind the scenes", "Product spotlight"
  "layout": "quote"|"promo"|"tip"|"announcement",
  "headline": string,                    // max 7 words, shown big on the image
  "subtext": string,                     // max 14 words, shown under the headline
  "cta": string,                         // max 4 words, e.g. "Order on LINE"
  "caption_en": string,                  // 2-3 sentences + emoji, English
  "caption_th": string,                  // natural Thai caption (or "" if language is "en")
  "hashtags": [string, ...]              // 4-6 hashtags without spaces, include Thai ones if relevant
}, ...]}

Mix the layouts across the week, match the brand's tone of voice, and make each day different."""


def build_social_prompt(brief, kit: dict) -> str:
    return (
        f"Brand: {kit.get('brand_name')} — {kit.get('tagline')}\n"
        f"What they do: {brief.description}\n"
        f"Audience: {brief.audience or 'general'}\n"
        f"Tone of voice: {kit.get('tone')}\n"
        f"Keywords: {', '.join(kit.get('keywords', []))}\n"
        f"Language: {brief.language}"
    )
