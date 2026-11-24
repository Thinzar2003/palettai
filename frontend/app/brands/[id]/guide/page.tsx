"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import BrandIcon, { selectedIconSvg } from "@/components/BrandIcon";
import PostCard from "@/components/PostCard";
import RequireAuth from "@/components/RequireAuth";
import Spinner from "@/components/Spinner";
import { api } from "@/lib/api";
import { colorOf, type BrandDetail, type BrandKit } from "@/lib/types";
import { useGoogleFonts } from "@/lib/useGoogleFonts";

/**
 * Printable brand guidelines. "Download PDF" opens the browser's print dialog:
 * choose "Save as PDF". Pages are sized to A4 and keep their colours when printed.
 * All colours here are inline hex values, so the guide looks the same in light and dark mode.
 */
function Guide({ id }: { id: number }) {
  const [brand, setBrand] = useState<BrandDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.getBrand(id).then(setBrand).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <p className="py-24 text-center">{error}</p>;
  if (!brand) return <Spinner label="Preparing your guide…" />;
  const kit = brand.versions.find((v) => v.version === brand.current_version)?.kit ?? brand.versions[brand.versions.length - 1].kit;
  return <GuidePages kit={kit} brandId={brand.id} />;
}

function GuidePages({ kit, brandId }: { kit: BrandKit; brandId: number }) {
  useGoogleFonts([kit.fonts.heading, kit.fonts.body, kit.fonts.thai]);
  const primary = colorOf(kit, "primary");
  const bg = colorOf(kit, "background");
  const text = colorOf(kit, "text");
  const H = `'${kit.fonts.heading}', sans-serif`;
  const B = `'${kit.fonts.body}', '${kit.fonts.thai}', sans-serif`;
  const T = `'${kit.fonts.thai}', sans-serif`;
  const icon = selectedIconSvg(kit);
  const date = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const print = async () => {
    await document.fonts.ready; // make sure brand fonts are loaded before printing
    window.print();
  };

  const mark = (size: number, onDark = false) => (
    <BrandIcon svg={icon} monogram={kit.logo.monogram} color={onDark ? kit.on_primary : primary}
      onColor={onDark ? primary : kit.on_primary} font={kit.fonts.heading} size={size} />
  );

  const Page = ({ n, children, background = "#ffffff", color = text, title }: { n: number; children: React.ReactNode; background?: string; color?: string; title?: string }) => {
    return (
      <section className="guide-page" style={{ background, color }}>
        {title && (
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "14mm" }}>
            <h2 style={{ fontFamily: H, fontSize: 30, fontWeight: 800, color: primary }}>{title}</h2>
            <span style={{ fontFamily: B, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", opacity: 0.5 }}>
              {kit.brand_name} · {String(n).padStart(2, "0")}
            </span>
          </header>
        )}
        {children}
      </section>
    );
  };

  return (
    <div>
      <style>{`
        .guide-page { width: 210mm; height: 297mm; padding: 18mm; margin: 0 auto 10mm; box-shadow: 0 20px 60px -30px rgba(0,0,0,.4);
          overflow: hidden; position: relative; break-after: page; page-break-after: always; box-sizing: border-box; }
        .guide-page:last-child { break-after: auto; page-break-after: auto; }
        @media print { .guide-page { margin: 0; box-shadow: none; } }
        @media screen and (max-width: 900px) { .guide-page { transform: scale(.45); transform-origin: top center; margin-bottom: -150mm; } }
      `}</style>

      <div className="no-print mx-auto mb-8 flex max-w-[210mm] flex-wrap items-center justify-between gap-3">
        <Link href={`/brands/${brandId}`} className="text-sm text-black/50 hover:text-black">
          ← Back to brand
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-black/45 sm:inline">In the print window choose “Save as PDF” and turn on “Background graphics”.</span>
          <button onClick={print} className="rounded-full bg-studio-accent px-5 py-2 text-sm font-semibold text-on-accent shadow-md shadow-studio-accent/30">
            ⤓ Download PDF
          </button>
        </div>
      </div>

      {/* 1. Cover */}
      <Page n={1} background={primary} color={kit.on_primary}>
        <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <p style={{ fontFamily: B, fontSize: 11, letterSpacing: 4, textTransform: "uppercase", opacity: 0.8 }}>Brand guidelines · {date}</p>
          <div>
            <div style={{ background: bg, borderRadius: "50%", width: 150, height: 150, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 30 }}>
              {mark(100)}
            </div>
            <h1 style={{ fontFamily: H, fontSize: 64, fontWeight: 800, lineHeight: 1 }}>{kit.brand_name}</h1>
            <p style={{ fontFamily: B, fontSize: 20, marginTop: 14, opacity: 0.9 }}>{kit.tagline}</p>
            {kit.slogans[0]?.th && <p style={{ fontFamily: T, fontSize: 18, marginTop: 6, opacity: 0.8 }}>{kit.slogans[0].th}</p>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {kit.palette.map((c) => (
              <div key={c.role} style={{ flex: 1, height: 18, borderRadius: 9, background: c.hex, border: "1px solid rgba(255,255,255,.4)" }} />
            ))}
          </div>
        </div>
      </Page>

      {/* 2. Story */}
      <Page n={2} title="Our brand">
        <p style={{ fontFamily: H, fontSize: 26, lineHeight: 1.3, fontWeight: 600, maxWidth: "150mm" }}>{kit.story}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 24 }}>
          {kit.personality.map((p) => (
            <span key={p} style={{ fontFamily: B, background: primary, color: kit.on_primary, padding: "6px 14px", borderRadius: 999, fontSize: 13 }}>{p}</span>
          ))}
        </div>
        <h3 style={{ fontFamily: H, fontSize: 18, fontWeight: 700, marginTop: 36 }}>Tone of voice</h3>
        <p style={{ fontFamily: B, fontSize: 14, marginTop: 8, lineHeight: 1.6, maxWidth: "150mm" }}>{kit.tone}</p>
        <h3 style={{ fontFamily: H, fontSize: 18, fontWeight: 700, marginTop: 28 }}>Keywords</h3>
        <p style={{ fontFamily: B, fontSize: 14, marginTop: 8 }}>{kit.keywords.join("  ·  ")}</p>
      </Page>

      {/* 3. Logo */}
      <Page n={3} title="Logo">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            { label: "On background", bgc: bg, dark: false },
            { label: "On white", bgc: "#ffffff", dark: false },
            { label: "On primary", bgc: primary, dark: true },
            { label: "On dark", bgc: text, dark: true },
          ].map((v) => (
            <div key={v.label}>
              <div style={{ background: v.bgc, height: "55mm", borderRadius: 14, border: "1px solid rgba(0,0,0,.08)", display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
                <span style={{ background: v.dark && icon ? bg : "transparent", borderRadius: "50%", padding: v.dark && icon ? 8 : 0, display: "inline-flex" }}>
                  {mark(64, v.dark && !icon)}
                </span>
                <span style={{ fontFamily: H, fontWeight: 800, fontSize: 24, color: v.dark ? kit.on_primary : text }}>{kit.brand_name}</span>
              </div>
              <p style={{ fontFamily: B, fontSize: 11, marginTop: 6, opacity: 0.6 }}>{v.label}</p>
            </div>
          ))}
        </div>
        <h3 style={{ fontFamily: H, fontSize: 18, fontWeight: 700, marginTop: 28 }}>Using the logo</h3>
        <ul style={{ fontFamily: B, fontSize: 13, lineHeight: 1.8, marginTop: 8, paddingLeft: 18, listStyle: "disc" }}>
          <li>Keep clear space around the logo at least the height of the symbol’s inner circle.</li>
          <li>Minimum size: 24 px on screen, 10 mm in print.</li>
          <li>Don’t stretch, rotate, recolour outside the palette, or add effects like shadows.</li>
          {kit.logo.symbol && <li>Concept: {icon ? kit.icons[kit.selected_icon ?? 0]?.concept : kit.logo.symbol}</li>}
        </ul>
      </Page>

      {/* 4. Colours */}
      <Page n={4} title="Colours">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          {kit.palette.map((c) => (
            <div key={c.role}>
              <div style={{ background: c.hex, height: "70mm", borderRadius: 12, border: "1px solid rgba(0,0,0,.08)" }} />
              <p style={{ fontFamily: H, fontWeight: 700, fontSize: 13, marginTop: 8 }}>{c.name}</p>
              <p style={{ fontFamily: B, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, opacity: 0.55 }}>{c.role}</p>
              <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, marginTop: 6 }}>{c.hex}</p>
              <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}>RGB {hexToRgb(c.hex)}</p>
              {c.usage && <p style={{ fontFamily: B, fontSize: 10, marginTop: 6, opacity: 0.7 }}>{c.usage}</p>}
            </div>
          ))}
        </div>
        <h3 style={{ fontFamily: H, fontSize: 18, fontWeight: 700, marginTop: 30 }}>Accessibility (WCAG)</h3>
        <table style={{ fontFamily: B, fontSize: 12, marginTop: 10, borderCollapse: "collapse", width: "100%" }}>
          <tbody>
            {kit.contrast.map((c) => (
              <tr key={c.pair} style={{ borderBottom: "1px solid rgba(0,0,0,.08)" }}>
                <td style={{ padding: "7px 0" }}>{c.pair}</td>
                <td style={{ padding: "7px 0", textAlign: "right" }}>{c.ratio}:1 {c.passes ? "✓ pass" : "✗ fail"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Page>

      {/* 5. Typography */}
      <Page n={5} title="Typography">
        {[
          { role: "Headings", font: kit.fonts.heading, sample: kit.tagline, size: 40, weight: 800 },
          { role: "Body", font: kit.fonts.body, sample: kit.story, size: 15, weight: 400 },
          { role: "Thai", font: kit.fonts.thai, sample: kit.slogans.find((s) => s.th)?.th || "ภาษาไทยอ่านง่าย สวยงาม", size: 28, weight: 600 },
        ].map((f) => (
          <div key={f.role} style={{ borderTop: "1px solid rgba(0,0,0,.1)", padding: "10mm 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: B, fontSize: 11, opacity: 0.6 }}>
              <span style={{ textTransform: "uppercase", letterSpacing: 2 }}>{f.role}</span>
              <span>{f.font} · Google Fonts</span>
            </div>
            <p style={{ fontFamily: `'${f.font}', sans-serif`, fontSize: f.size, fontWeight: f.weight, lineHeight: 1.25, marginTop: 10 }}>{f.sample}</p>
            <p style={{ fontFamily: `'${f.font}', sans-serif`, fontSize: 14, marginTop: 8, opacity: 0.7 }}>
              {f.role === "Thai" ? "กขคง จฉชซ ๑๒๓๔๕ 12345" : "ABCDEFGHIJKLM abcdefghijklm 0123456789"}
            </p>
          </div>
        ))}
        {kit.fonts.reason && <p style={{ fontFamily: B, fontSize: 12, opacity: 0.7 }}>{kit.fonts.reason}</p>}
      </Page>

      {/* 6. Voice & social */}
      <Page n={6} title="Voice & social">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {kit.slogans.map((s, i) => (
            <div key={i} style={{ background: bg, borderRadius: 12, padding: 16, border: "1px solid rgba(0,0,0,.06)" }}>
              <p style={{ fontFamily: H, fontWeight: 700, fontSize: 17, color: primary }}>{s.en}</p>
              {s.th && <p style={{ fontFamily: T, fontSize: 15, marginTop: 4 }}>{s.th}</p>}
            </div>
          ))}
        </div>
        {kit.social_posts.length > 0 ? (
          <>
            <h3 style={{ fontFamily: H, fontSize: 18, fontWeight: 700, marginTop: 24 }}>Social media examples</h3>
            <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
              {kit.social_posts.slice(0, 3).map((p) => (
                <PostCard key={p.day} kit={kit} post={p} size={185} />
              ))}
            </div>
          </>
        ) : (
          <p style={{ fontFamily: B, fontSize: 12, marginTop: 24, opacity: 0.6 }}>Tip: generate a social post pack to add examples here.</p>
        )}
      </Page>
    </div>
  );
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(", ");
}

export default function GuidePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <RequireAuth>
      <Guide id={Number(id)} />
    </RequireAuth>
  );
}
