from typing import Literal

from pydantic import BaseModel, Field

Role = Literal["primary", "secondary", "accent", "background", "text"]
ROLES: tuple[str, ...] = ("primary", "secondary", "accent", "background", "text")


class Brief(BaseModel):
    business_name: str = Field(min_length=1, max_length=60)
    description: str = Field(min_length=5, max_length=600)
    industry: str | None = Field(default=None, max_length=80)
    audience: str | None = Field(default=None, max_length=160)
    vibes: list[str] = Field(default_factory=list, max_length=6)
    language: Literal["en", "th", "both"] = "both"
    # Existing identity when refreshing a brand imported from a website/Facebook page.
    reference: str | None = Field(default=None, max_length=1000)


class PaletteColor(BaseModel):
    role: Role
    name: str
    hex: str
    usage: str = ""


class Fonts(BaseModel):
    heading: str
    body: str
    thai: str
    reason: str = ""


class Slogan(BaseModel):
    en: str = ""
    th: str = ""


class LogoConcept(BaseModel):
    monogram: str = Field(max_length=3)
    symbol: str = ""   # short description of an icon idea (used by the image stage later)
    style: str = ""


class ContrastCheck(BaseModel):
    pair: str
    ratio: float
    passes: bool
    fixed: bool = False


class LogoIcon(BaseModel):
    name: str = ""
    concept: str = ""
    style: str = ""          # minimal | geometric | mascot | emblem | lettermark | line | thai
    source: str = "svg"      # flux = drawn by the image model and traced; svg = drawn as SVG code by the LLM
    svg: str


class SocialPost(BaseModel):
    day: int
    theme: str = ""
    layout: Literal["quote", "promo", "tip", "announcement"] = "quote"
    headline: str = ""
    subtext: str = ""
    cta: str = ""
    caption_en: str = ""
    caption_th: str = ""
    hashtags: list[str] = Field(default_factory=list)


class BrandKit(BaseModel):
    brand_name: str
    tagline: str
    personality: list[str]
    tone: str
    story: str
    keywords: list[str]
    palette: list[PaletteColor]
    on_primary: str
    fonts: Fonts
    slogans: list[Slogan]
    logo: LogoConcept
    contrast: list[ContrastCheck]
    source: str   # provider that produced it: gemini | groq | openrouter | anthropic | openai | mock
    model: str = ""
    icons: list[LogoIcon] = Field(default_factory=list)       # AI logo symbols (sanitised SVG)
    selected_icon: int | None = None
    social_posts: list[SocialPost] = Field(default_factory=list)


# ── Accounts ────────────────────────────────────────────────────────────────
class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: str = Field(min_length=3, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: str = Field(max_length=255)
    password: str = Field(max_length=128)


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    generations_today: int
    daily_limit: int


# ── Brands ──────────────────────────────────────────────────────────────────
LockPart = Literal["palette", "fonts", "slogans", "logo", "story"]


class RegenerateIn(BaseModel):
    locked: list[LockPart] = Field(default_factory=list)
    brief: Brief | None = None   # optionally tweak the brief before regenerating


class BrandUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    is_public: bool | None = None


class VersionOut(BaseModel):
    version: int
    kit: BrandKit
    locked: list[str]
    note: str
    created_at: str


class BrandSummary(BaseModel):
    id: int
    name: str
    slug: str
    is_public: bool
    current_version: int
    version_count: int
    updated_at: str
    preview: dict   # palette hexes + fonts + monogram for dashboard cards


class BrandDetail(BrandSummary):
    brief: Brief
    versions: list[VersionOut]


class PublicBrand(BaseModel):
    name: str
    slug: str
    kit: BrandKit


# ── Editing ─────────────────────────────────────────────────────────────────
class KitEdit(BaseModel):
    """Hand edits. Any field left out stays as it is."""
    brand_name: str | None = Field(default=None, min_length=1, max_length=80)
    tagline: str | None = Field(default=None, max_length=160)
    tone: str | None = Field(default=None, max_length=400)
    story: str | None = Field(default=None, max_length=800)
    palette: list[PaletteColor] | None = Field(default=None, min_length=5, max_length=5)
    fonts: Fonts | None = None
    slogans: list[Slogan] | None = Field(default=None, max_length=6)


class RefineIn(BaseModel):
    instruction: str = Field(min_length=3, max_length=300)


LogoStyle = Literal["minimal", "geometric", "mascot", "emblem", "lettermark", "line", "thai"]


class LogosIn(BaseModel):
    styles: list[LogoStyle] = Field(default_factory=list, max_length=3)   # empty = choose automatically
    match_colors: bool = True                                             # snap traced colours to the palette


class SelectIcon(BaseModel):
    index: int | None = Field(default=None, ge=0, le=9)   # None = use the monogram badge


# ── Import from website / Facebook ──────────────────────────────────────────
class ImportIn(BaseModel):
    url: str | None = Field(default=None, max_length=500)
    text: str | None = Field(default=None, max_length=3000)   # pasted description (fallback)


class ImportFound(BaseModel):
    source_url: str = ""
    title: str = ""
    colors: list[str] = Field(default_factory=list)
    fonts: list[str] = Field(default_factory=list)
    image: str = ""
    from_facebook: bool = False
    tone: str = ""


class ImportOut(BaseModel):
    brief: Brief
    found: ImportFound


# ── Daily tools ─────────────────────────────────────────────────────────────
class DailyPostIn(BaseModel):
    idea: str | None = Field(default=None, max_length=300)
    event: str | None = Field(default=None, max_length=80)


class PromoIn(BaseModel):
    offer: str = Field(min_length=3, max_length=200)
    period: str | None = Field(default=None, max_length=100)


class ReplyIn(BaseModel):
    message: str = Field(min_length=2, max_length=2000)
    platform: Literal["google", "facebook", "line", "instagram", "other"] = "other"
    tweak: Literal["friendlier", "more formal", "shorter"] | None = None


class PromoOut(BaseModel):
    badge: str = ""
    headline: str = ""
    subtext: str = ""
    cta: str = ""
    facebook_caption: str = ""
    line_message: str = ""
    hashtags: list[str] = Field(default_factory=list)


class ReplyOut(BaseModel):
    sentiment: Literal["positive", "neutral", "negative", "question"] = "neutral"
    language: Literal["th", "en"] = "th"
    reply: str
    reply_other: str = ""
    tip: str = ""


class CreationOut(BaseModel):
    id: int
    brand_id: int
    kind: Literal["post", "promo", "reply"]
    input: dict
    output: dict
    created_at: str
