"use client";

import { forwardRef } from "react";
import BrandIcon, { selectedIconSvg } from "./BrandIcon";
import { colorOf, type BrandKit, type SocialPost } from "@/lib/types";

/**
 * One square social post rendered in the brand's style.
 * Four layouts (quote / promo / tip / announcement). Exported to PNG with html-to-image.
 */
export type PhotoStyle = "full" | "frame";

const PostCard = forwardRef<
  HTMLDivElement,
  { kit: BrandKit; post: SocialPost; size?: number; photo?: string | null; photoStyle?: PhotoStyle; price?: string }
>(function PostCard({ kit, post, size = 360, photo, photoStyle = "full", price }, ref) {
  const primary = colorOf(kit, "primary");
  const secondary = colorOf(kit, "secondary");
  const accent = colorOf(kit, "accent");
  const bg = colorOf(kit, "background");
  const text = colorOf(kit, "text");
  const heading = `'${kit.fonts.heading}', '${kit.fonts.thai}', sans-serif`;
  const body = `'${kit.fonts.body}', '${kit.fonts.thai}', sans-serif`;
  const icon = selectedIconSvg(kit);
  const u = size / 360; // scale unit so text scales with the card

  const logo = (onDark: boolean) => (
    <div className="flex items-center" style={{ gap: 8 * u }}>
      <BrandIcon svg={icon} monogram={kit.logo.monogram} color={onDark ? kit.on_primary : primary}
        onColor={onDark ? primary : kit.on_primary} font={kit.fonts.heading} size={26 * u} />
      <span style={{ fontFamily: heading, fontWeight: 700, fontSize: 14 * u, color: onDark ? kit.on_primary : text }}>
        {kit.brand_name}
      </span>
    </div>
  );

  const cta = (dark: boolean) =>
    post.cta ? (
      <span
        style={{
          display: "inline-block", padding: `${6 * u}px ${14 * u}px`, borderRadius: 999, fontSize: 12 * u, fontWeight: 700,
          fontFamily: body, background: dark ? kit.on_primary : primary, color: dark ? primary : kit.on_primary,
        }}
      >
        {post.cta}
      </span>
    ) : null;

  const box: React.CSSProperties = { width: size, height: size, position: "relative", overflow: "hidden", borderRadius: 18 * u };

  const priceTag = price ? (
    <div style={{ position: "absolute", right: 18 * u, top: 18 * u, background: accent, color: kit.on_primary, fontFamily: heading,
      fontWeight: 800, fontSize: 20 * u, padding: `${8 * u}px ${14 * u}px`, borderRadius: 14 * u, transform: "rotate(6deg)",
      boxShadow: "0 8px 18px -8px rgba(0,0,0,.45)" }}>
      {price}
    </div>
  ) : null;

  // ── Owner's own photo ──
  if (photo && photoStyle === "full") {
    return (
      <div ref={ref} style={{ ...box, color: "#fff" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${primary} 0%, ${primary}cc 28%, transparent 62%)` }} />
        <div style={{ position: "absolute", left: 18 * u, top: 18 * u, background: "rgba(255,255,255,.92)", borderRadius: 999,
          padding: `${5 * u}px ${12 * u}px ${5 * u}px ${6 * u}px` }}>{logo(false)}</div>
        {priceTag}
        <div style={{ position: "absolute", left: 24 * u, right: 24 * u, bottom: 22 * u, color: kit.on_primary }}>
          <p style={{ fontFamily: heading, fontWeight: 800, fontSize: 32 * u, lineHeight: 1.04 }}>{post.headline}</p>
          {post.subtext && <p style={{ fontFamily: body, fontSize: 13 * u, marginTop: 6 * u, opacity: 0.92 }}>{post.subtext}</p>}
          {post.cta && <div style={{ marginTop: 12 * u }}>{cta(true)}</div>}
        </div>
      </div>
    );
  }
  if (photo) {
    return (
      <div ref={ref} style={{ ...box, background: bg, color: text, padding: 16 * u, display: "flex", flexDirection: "column" }}>
        <div style={{ position: "relative", flex: 1, borderRadius: 12 * u, overflow: "hidden", border: `${4 * u}px solid ${primary}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        {priceTag}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10 * u, marginTop: 12 * u }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: heading, fontWeight: 800, fontSize: 22 * u, lineHeight: 1.05, color: primary }}>{post.headline}</p>
            {post.subtext && <p style={{ fontFamily: body, fontSize: 11 * u, marginTop: 4 * u, opacity: 0.8 }}>{post.subtext}</p>}
          </div>
          <div style={{ flexShrink: 0 }}>{post.cta ? cta(false) : logo(false)}</div>
        </div>
      </div>
    );
  }

  if (post.layout === "promo") {
    return (
      <div ref={ref} style={{ ...box, background: primary, color: kit.on_primary, padding: 26 * u, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ position: "absolute", right: -60 * u, top: -60 * u, width: 220 * u, height: 220 * u, borderRadius: "50%", background: accent, opacity: 0.9 }} />
        <div style={{ position: "absolute", right: 40 * u, bottom: 70 * u, width: 90 * u, height: 90 * u, borderRadius: "50%", background: secondary, opacity: 0.85 }} />
        <div style={{ position: "relative" }}>{logo(true)}</div>
        <div style={{ position: "relative" }}>
          <p style={{ fontFamily: heading, fontWeight: 800, fontSize: 38 * u, lineHeight: 1.02 }}>{post.headline}</p>
          <p style={{ fontFamily: body, fontSize: 14 * u, marginTop: 10 * u, opacity: 0.85, maxWidth: "80%" }}>{post.subtext}</p>
          <div style={{ marginTop: 16 * u }}>{cta(true)}</div>
        </div>
      </div>
    );
  }

  if (post.layout === "tip") {
    return (
      <div ref={ref} style={{ ...box, background: bg, color: text, padding: 26 * u, display: "flex", flexDirection: "column" }}>
        {logo(false)}
        <div style={{ marginTop: 22 * u, display: "inline-flex", alignSelf: "flex-start", padding: `${4 * u}px ${10 * u}px`, borderRadius: 999, background: secondary, fontSize: 11 * u, fontWeight: 700, letterSpacing: 1.5 * u, textTransform: "uppercase", fontFamily: body }}>
          Tip · Day {post.day}
        </div>
        <p style={{ fontFamily: heading, fontWeight: 800, fontSize: 30 * u, lineHeight: 1.08, marginTop: 14 * u, color: primary }}>{post.headline}</p>
        <div style={{ height: 4 * u, width: 48 * u, background: accent, borderRadius: 4, marginTop: 14 * u }} />
        <p style={{ fontFamily: body, fontSize: 15 * u, marginTop: 14 * u, lineHeight: 1.4 }}>{post.subtext}</p>
        <div style={{ marginTop: "auto" }}>{cta(false)}</div>
      </div>
    );
  }

  if (post.layout === "announcement") {
    return (
      <div ref={ref} style={{ ...box, background: text, color: bg, padding: 26 * u, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 14 * u, border: `${2 * u}px solid ${accent}`, borderRadius: 12 * u }} />
        <p style={{ fontFamily: body, fontSize: 11 * u, letterSpacing: 3 * u, textTransform: "uppercase", color: accent, fontWeight: 700 }}>
          {post.theme || "News"}
        </p>
        <p style={{ fontFamily: heading, fontWeight: 800, fontSize: 34 * u, lineHeight: 1.05, marginTop: 12 * u }}>{post.headline}</p>
        <p style={{ fontFamily: body, fontSize: 14 * u, marginTop: 12 * u, opacity: 0.8, maxWidth: "85%" }}>{post.subtext}</p>
        <div style={{ marginTop: 18 * u }}>
          {post.cta && (
            <span style={{ display: "inline-block", padding: `${6 * u}px ${14 * u}px`, borderRadius: 999, fontSize: 12 * u, fontWeight: 700, fontFamily: body, background: primary, color: kit.on_primary }}>
              {post.cta}
            </span>
          )}
        </div>
        <div style={{ position: "absolute", bottom: 26 * u, fontFamily: heading, fontSize: 12 * u, fontWeight: 700 }}>{kit.brand_name}</div>
      </div>
    );
  }

  // quote (default)
  return (
    <div ref={ref} style={{ ...box, background: secondary, color: text, padding: 30 * u, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <span style={{ position: "absolute", top: 4 * u, left: 18 * u, fontFamily: heading, fontSize: 140 * u, lineHeight: 1, color: primary, opacity: 0.25 }}>“</span>
      <p style={{ position: "relative", fontFamily: heading, fontWeight: 700, fontSize: 30 * u, lineHeight: 1.12 }}>{post.headline}</p>
      <p style={{ position: "relative", fontFamily: body, fontSize: 14 * u, marginTop: 12 * u, opacity: 0.8 }}>{post.subtext}</p>
      <div style={{ position: "absolute", bottom: 24 * u, left: 30 * u, right: 30 * u, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        {logo(false)}
        {cta(false)}
      </div>
    </div>
  );
});

export default PostCard;
