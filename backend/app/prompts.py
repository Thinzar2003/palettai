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
    if getattr(brief, "reference", None):
        lines.append(
            "\nThis is a REFRESH of an existing business. Their current identity: " + brief.reference +
            "\nKeep it recognisable (evolve their existing colours and feel, don't throw them away) "
            "but make it more modern, cohesive and accessible."
        )
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


IMPORT_SYSTEM = """You read information about an existing small business (from its website or Facebook page,
or a description the owner pasted) and fill in a branding brief.

Reply with ONE JSON object and nothing else:
{
  "business_name": string,          // the business's real name
  "description": string,            // 1-3 sentences: what they sell/do, where, what makes them special (max 500 chars)
  "industry": string,               // e.g. "Café", "Beauty salon", "Online fashion shop"
  "audience": string,               // who their customers are (max 150 chars)
  "vibes": [string, ...],           // 1-3 of: Warm, Minimal, Playful, Premium, Natural, Bold, Retro, Techy
  "language": "en" | "th" | "both", // "both" if the business serves Thai customers, "en" if clearly international only
  "tone": string                    // one sentence describing how they currently talk to customers
}
Only use facts found in the input. If something is unknown, make a sensible short guess from context.
Ignore cookie banners, navigation menus, login prompts and legal text."""


def build_import_prompt(info: dict | None, pasted: str | None) -> str:
    parts = []
    if info:
        parts += [
            f"Page URL: {info.get('url')}",
            f"Page title: {info.get('title')}",
            f"Site name: {info.get('site_name')}",
            f"Meta description: {info.get('description')}",
            f"Page language: {info.get('lang')}",
            f"Headings: {' | '.join(info.get('headings', []))}",
            f"Page text (excerpt): {info.get('text', '')[:2500]}",
        ]
    if pasted:
        parts.append(f"Description from the owner: {pasted}")
    return "\n".join(parts)


# ── Daily tools ──────────────────────────────────────────────────────────────
def brand_context(brief, kit: dict) -> str:
    return (
        f"Brand: {kit.get('brand_name')} — {kit.get('tagline')}\n"
        f"What they do: {brief.description}\n"
        f"Customers: {brief.audience or 'general'}\n"
        f"Tone of voice: {kit.get('tone')}\n"
        f"Keywords: {', '.join(kit.get('keywords', []))}\n"
        f"Language: {brief.language}  (en = English only, th = Thai only, both = Thai and English)"
    )


DAILY_POST_SYSTEM = """You are the social media manager of a small business in Thailand. Write ONE post for TODAY.

Reply with ONE JSON object and nothing else:
{"theme": string,                                  // e.g. "Rainy-day special", "Behind the scenes"
 "layout": "quote"|"promo"|"tip"|"announcement",
 "headline": string,                               // max 7 words, shown big on the image
 "subtext": string,                                // max 14 words
 "cta": string,                                    // max 4 words, e.g. "Order on LINE"
 "caption_en": string,                             // 2-3 short sentences + 1-2 emoji ("" if language is "th")
 "caption_th": string,                             // natural Thai caption ("" if language is "en")
 "hashtags": [string, ...]}                        // 4-6, no spaces, mix Thai and English when language allows

Make it timely: use today's weekday, any event today or coming soon, and payday when it fits naturally.
If the owner gives an idea, the post must be about that idea. Never invent prices, discounts or opening hours
the owner didn't give. Match the brand's tone of voice."""


PROMO_SYSTEM = """You write promotions for a small business in Thailand, for several channels at once.

Reply with ONE JSON object and nothing else:
{"badge": string,              // the offer in 1-3 words for a sticker, e.g. "-20%", "1 แถม 1", "FREE"
 "headline": string,           // max 6 words
 "subtext": string,            // max 12 words: the conditions / period
 "cta": string,                // max 4 words
 "facebook_caption": string,   // 2-4 sentences with emoji, in the brand's language(s); Thai first when language is "both"
 "line_message": string,       // a short LINE OA broadcast (max 300 characters), friendly, Thai if language is th/both
 "hashtags": [string, ...]}    // 4-6, no spaces

Use ONLY the offer details the owner gave (amounts, dates, conditions). Don't add terms they didn't mention."""


REPLY_SYSTEM = """You help a small business owner in Thailand reply to customer reviews and chat messages.

Reply with ONE JSON object and nothing else:
{"sentiment": "positive"|"neutral"|"negative"|"question",
 "language": "th"|"en",                // language the customer wrote in
 "reply": string,                      // the reply, in the customer's language, ready to send
 "reply_other": string,                // the same reply in the other language (Thai/English), for reference
 "tip": string}                        // one short tip for the owner (English)

Rules: be warm and genuine, in the brand's tone of voice; thank them by name if given; for complaints apologise
sincerely, don't argue, and invite them to message privately (DM/LINE) to fix it. Never invent facts, prices,
opening hours or refunds: use a placeholder like [opening hours] or [เวลาเปิด] instead. Keep it short
(2-4 sentences). Use Thai politeness particles (ค่ะ/ครับ) naturally if replying in Thai; default to ค่ะ."""


def build_daily_post_prompt(brief, kit: dict, ctx_text: str, idea: str | None, event: str | None) -> str:
    lines = [brand_context(brief, kit), "", ctx_text]
    if event:
        lines.append(f"The owner wants today's post to be about: {event}")
    if idea:
        lines.append(f"Owner's idea for today: {idea}")
    if not idea and not event:
        lines.append("No idea given: pick something fitting for today (avoid inventing promotions).")
    return "\n".join(lines)


def build_promo_prompt(brief, kit: dict, ctx_text: str, offer: str, period: str | None) -> str:
    return "\n".join([brand_context(brief, kit), "", ctx_text, f"Offer: {offer}",
                      f"When: {period or 'not specified (do not invent dates)'}"])


def build_reply_prompt(brief, kit: dict, message: str, platform: str, tweak: str | None) -> str:
    lines = [brand_context(brief, kit), "", f"Platform: {platform}", f"Customer message:\n{message}"]
    if tweak:
        lines.append(f"Make the reply {tweak}.")
    return "\n".join(lines)
