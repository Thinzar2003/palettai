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
