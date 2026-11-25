"use client";

import { forwardRef } from "react";
import BrandIcon, { selectedIconSvg } from "../BrandIcon";
import { colorOf, type BrandKit, type PromoOutput } from "@/lib/types";

/** Square promo poster (Facebook / Instagram feed). 360px → 1080px when saved at 3×. */
export const PromoPoster = forwardRef<HTMLDivElement, { kit: BrandKit; promo: PromoOutput; size?: number }>(
  function PromoPoster({ kit, promo, size = 360 }, ref) {
    const u = size / 360;
    const primary = colorOf(kit, "primary");
    const accent = colorOf(kit, "accent");
    const secondary = colorOf(kit, "secondary");
    const H = `'${kit.fonts.heading}', '${kit.fonts.thai}', sans-serif`;
    const B = `'${kit.fonts.body}', '${kit.fonts.thai}', sans-serif`;
    return (
      <div ref={ref} style={{ width: size, height: size, background: primary, color: kit.on_primary, position: "relative",
        overflow: "hidden", borderRadius: 18 * u, padding: 26 * u, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ position: "absolute", left: -50 * u, bottom: -70 * u, width: 230 * u, height: 230 * u, borderRadius: "50%", background: secondary, opacity: 0.9 }} />
        <Badge text={promo.badge} bg={accent} color={kit.on_primary} font={H} size={112 * u}
          style={{ position: "absolute", right: 18 * u, top: 18 * u, transform: "rotate(10deg)" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 * u }}>
          <BrandIcon svg={selectedIconSvg(kit)} monogram={kit.logo.monogram} color={kit.on_primary} onColor={primary}
            font={kit.fonts.heading} size={28 * u} />
          <span style={{ fontFamily: H, fontWeight: 700, fontSize: 14 * u }}>{kit.brand_name}</span>
        </div>
        <div style={{ position: "relative", maxWidth: "78%" }}>
          <p style={{ fontFamily: H, fontWeight: 800, fontSize: 36 * u, lineHeight: 1.02 }}>{promo.headline}</p>
          <p style={{ fontFamily: B, fontSize: 14 * u, marginTop: 10 * u, opacity: 0.9 }}>{promo.subtext}</p>
          {promo.cta && (
            <span style={{ display: "inline-block", marginTop: 14 * u, padding: `${7 * u}px ${16 * u}px`, borderRadius: 999,
              background: kit.on_primary, color: primary, fontFamily: B, fontWeight: 700, fontSize: 13 * u }}>
              {promo.cta}
            </span>
          )}
        </div>
      </div>
    );
  },
);

/** 9:16 story (Instagram / Facebook / LINE story). 270×480 → 1080×1920 when saved at 4×. */
export const PromoStory = forwardRef<HTMLDivElement, { kit: BrandKit; promo: PromoOutput; width?: number }>(
  function PromoStory({ kit, promo, width = 270 }, ref) {
    const u = width / 270;
    const primary = colorOf(kit, "primary");
    const accent = colorOf(kit, "accent");
    const bg = colorOf(kit, "background");
    const text = colorOf(kit, "text");
    const H = `'${kit.fonts.heading}', '${kit.fonts.thai}', sans-serif`;
    const B = `'${kit.fonts.body}', '${kit.fonts.thai}', sans-serif`;
    return (
      <div ref={ref} style={{ width, height: width * (16 / 9), background: bg, color: text, position: "relative", overflow: "hidden",
        borderRadius: 18 * u, padding: 22 * u, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ position: "absolute", top: -90 * u, left: -40 * u, right: -40 * u, height: 260 * u, background: primary,
          borderRadius: "0 0 50% 50%" }} />
        <div style={{ position: "relative", marginTop: 18 * u, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 * u }}>
          <BrandIcon svg={selectedIconSvg(kit)} monogram={kit.logo.monogram} color={kit.on_primary} onColor={primary}
            font={kit.fonts.heading} size={46 * u} />
          <span style={{ fontFamily: H, fontWeight: 700, fontSize: 14 * u, color: kit.on_primary }}>{kit.brand_name}</span>
        </div>
        <Badge text={promo.badge} bg={accent} color={kit.on_primary} font={H} size={120 * u} style={{ position: "relative", marginTop: 40 * u }} />
        <p style={{ position: "relative", fontFamily: H, fontWeight: 800, fontSize: 30 * u, lineHeight: 1.05, marginTop: 22 * u, color: primary }}>
          {promo.headline}
        </p>
        <p style={{ position: "relative", fontFamily: B, fontSize: 14 * u, marginTop: 10 * u, opacity: 0.8 }}>{promo.subtext}</p>
        {promo.cta && (
          <span style={{ position: "absolute", bottom: 34 * u, padding: `${9 * u}px ${20 * u}px`, borderRadius: 999,
            background: primary, color: kit.on_primary, fontFamily: B, fontWeight: 700, fontSize: 14 * u }}>
            {promo.cta} ↑
          </span>
        )}
      </div>
    );
  },
);

function Badge({ text, bg, color, font, size, style }: { text: string; bg: string; color: string; font: string; size: number;
  style?: React.CSSProperties }) {
  if (!text) return null;
  const fontSize = size * (text.length <= 4 ? 0.3 : text.length <= 7 ? 0.22 : 0.16);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, color, display: "flex", alignItems: "center",
      justifyContent: "center", textAlign: "center", fontFamily: font, fontWeight: 800, fontSize, lineHeight: 1.05, padding: size * 0.1,
      boxShadow: "0 8px 20px -8px rgba(0,0,0,.35)", ...style }}>
      {text}
    </div>
  );
}
