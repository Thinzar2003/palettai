import type { BrandKit, Role } from "./types";

export type ColorVariant = "brand" | "accent" | "soft" | "dark";
export const COLOR_VARIANTS: ColorVariant[] = ["brand", "accent", "soft", "dark"];

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** White or near-black, whichever reads better on `bg`. */
export function textOn(bg: string): string {
  return contrast("#FFFFFF", bg) >= contrast("#111111", bg) ? "#FFFFFF" : "#111111";
}

const hexOf = (kit: BrandKit, role: Role) => kit.palette.find((c) => c.role === role)?.hex ?? "#000000";

/**
 * The same brand in a different colour arrangement, without leaving the palette:
 * brand = as designed · accent = the accent colour leads · soft = the light tint becomes the background ·
 * dark = dark background with the most readable brand colour leading.
 */
export function kitVariant(kit: BrandKit, variant: ColorVariant): BrandKit {
  if (variant === "brand") return kit;
  const orig: Record<Role, string> = {
    primary: hexOf(kit, "primary"), secondary: hexOf(kit, "secondary"), accent: hexOf(kit, "accent"),
    background: hexOf(kit, "background"), text: hexOf(kit, "text"),
  };
  let next: Record<Role, string>;
  if (variant === "accent") {
    next = { ...orig, primary: orig.accent, accent: orig.primary };
  } else if (variant === "soft") {
    next = { ...orig, background: orig.secondary, secondary: orig.background };
  } else {
    const bg = orig.text;
    const lead = [orig.primary, orig.accent, orig.secondary].sort((a, b) => contrast(b, bg) - contrast(a, bg))[0];
    next = { ...orig, background: bg, text: orig.background, secondary: orig.text, primary: lead,
      accent: lead === orig.primary ? orig.accent : orig.primary };
  }
  const palette = kit.palette.map((c) => ({ ...c, hex: next[c.role] }));
  return { ...kit, palette, on_primary: textOn(next.primary) };
}

/** A variation is offered only if headings and body text stay readable on its background. */
export function variantReadable(kit: BrandKit): boolean {
  const bg = hexOf(kit, "background");
  return contrast(hexOf(kit, "text"), bg) >= 4.5 && contrast(hexOf(kit, "primary"), bg) >= 2.6
    && contrast(hexOf(kit, "text"), hexOf(kit, "secondary")) >= 3;
}
