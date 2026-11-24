export type Language = "en" | "th" | "both";
export type Role = "primary" | "secondary" | "accent" | "background" | "text";
export type LockPart = "palette" | "fonts" | "slogans" | "logo" | "story";

export interface Brief {
  business_name: string;
  description: string;
  industry?: string | null;
  audience?: string | null;
  vibes: string[];
  language: Language;
}

export interface PaletteColor {
  role: Role;
  name: string;
  hex: string;
  usage: string;
}

export interface BrandKit {
  brand_name: string;
  tagline: string;
  personality: string[];
  tone: string;
  story: string;
  keywords: string[];
  palette: PaletteColor[];
  on_primary: string;
  fonts: { heading: string; body: string; thai: string; reason: string };
  slogans: { en: string; th: string }[];
  logo: { monogram: string; symbol: string; style: string };
  contrast: { pair: string; ratio: number; passes: boolean; fixed: boolean }[];
  source: string; // gemini | groq | openrouter | anthropic | openai
  model: string;
  icons: LogoIcon[];
  selected_icon: number | null;
  social_posts: SocialPost[];
}

export interface LogoIcon {
  name: string;
  concept: string;
  svg: string; // sanitised by the backend
}

export type PostLayout = "quote" | "promo" | "tip" | "announcement";

export interface SocialPost {
  day: number;
  theme: string;
  layout: PostLayout;
  headline: string;
  subtext: string;
  cta: string;
  caption_en: string;
  caption_th: string;
  hashtags: string[];
}

export interface KitEdit {
  brand_name?: string;
  tagline?: string;
  tone?: string;
  story?: string;
  palette?: PaletteColor[];
  fonts?: { heading: string; body: string; thai: string; reason?: string };
  slogans?: { en: string; th: string }[];
}

export interface FontLists {
  heading: string[];
  body: string[];
  thai: string[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  generations_today: number;
  daily_limit: number;
}

export interface BrandSummary {
  id: number;
  name: string;
  slug: string;
  is_public: boolean;
  current_version: number;
  version_count: number;
  updated_at: string;
  preview: {
    colors: string[];
    heading_font: string | null;
    monogram: string | null;
    tagline: string | null;
    on_primary: string | null;
  };
}

export interface VersionOut {
  version: number;
  kit: BrandKit;
  locked: LockPart[];
  note: string;
  created_at: string;
}

export interface BrandDetail extends BrandSummary {
  brief: Brief;
  versions: VersionOut[];
}

export interface PublicBrand {
  name: string;
  slug: string;
  kit: BrandKit;
}

export function colorOf(kit: BrandKit, role: Role): string {
  return kit.palette.find((c) => c.role === role)?.hex ?? "#000000";
}

export function timeAgo(iso: string): string {
  // SQLite returns timestamps without a timezone; they are UTC.
  const t = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + "Z").getTime();
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
