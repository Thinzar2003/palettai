"use client";

import { motion } from "motion/react";
import LogoMark from "./LogoMark";
import Mockups from "./Mockups";
import PalettePour from "./PalettePour";
import TypeReveal from "./TypeReveal";
import { colorOf, type BrandKit } from "@/lib/types";
import { useGoogleFonts } from "@/lib/useGoogleFonts";

// Timeline (seconds) for the reveal sequence. `pace` scales it: 1 = full show, 0 = instant.
const TIMELINE = { logo: 0.2, palette: 1.6, fonts: 3.2, slogans: 3.9, mockups: 4.8, details: 5.4 };

export default function BrandReveal({
  kit,
  actions,
  pace = 1,
}: {
  kit: BrandKit;
  actions?: React.ReactNode;
  pace?: number;
}) {
  useGoogleFonts([kit.fonts.heading, kit.fonts.body, kit.fonts.thai]);
  const T = Object.fromEntries(Object.entries(TIMELINE).map(([k, v]) => [k, v * pace])) as typeof TIMELINE;
  const primary = colorOf(kit, "primary");
  const text = colorOf(kit, "text");
  const heading = `'${kit.fonts.heading}', sans-serif`;
  const body = `'${kit.fonts.body}', sans-serif`;
  const thai = `'${kit.fonts.thai}', sans-serif`;

  return (
    <div className="mx-auto max-w-5xl space-y-14 pb-24">
      {/* Header + logo */}
      <section className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <LogoMark name={kit.brand_name} monogram={kit.logo.monogram} font={kit.fonts.heading}
            color={primary} onColor={kit.on_primary} textColor={text} delay={T.logo} />
          <p className="mt-4 max-w-xl text-lg text-black/70" style={{ fontFamily: body }}>
            <TypeReveal text={kit.tagline} delay={T.logo + 1.1 * pace} />
          </p>
        </div>
        {actions && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: T.logo }}
            className="flex flex-wrap gap-2">
            {actions}
          </motion.div>
        )}
      </section>

      <Section title="Colour palette" hint="Click a colour to copy it" delay={Math.max(0, T.palette - 0.2)}>
        <PalettePour palette={kit.palette} delay={T.palette} />
      </Section>

      <Section title="Typography" delay={T.fonts}>
        <div className="grid gap-4 md:grid-cols-3">
          <FontCard label="Heading" font={kit.fonts.heading} sample="Aa Bb Cc" big delay={T.fonts} />
          <FontCard label="Body" font={kit.fonts.body} sample="The quick brown fox jumps over the lazy dog." delay={T.fonts + 0.1} />
          <FontCard label="Thai" font={kit.fonts.thai} sample="สวัสดี ยินดีต้อนรับ" big delay={T.fonts + 0.2} />
        </div>
        {kit.fonts.reason && <p className="mt-3 text-sm text-black/55">{kit.fonts.reason}</p>}
      </Section>

      <Section title="Slogans" delay={T.slogans}>
        <div className="grid gap-4 sm:grid-cols-2">
          {kit.slogans.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: T.slogans + i * 0.12 }}
              className="rounded-2xl border border-black/10 bg-white p-5">
              <p className="text-xl font-semibold" style={{ fontFamily: heading, color: primary }}>
                <TypeReveal text={s.en} delay={T.slogans + 0.2 + i * 0.12} speed={0.02} />
              </p>
              {s.th && <p className="mt-1 text-lg text-black/75" style={{ fontFamily: thai }}>{s.th}</p>}
            </motion.div>
          ))}
        </div>
      </Section>

      <Section title="In the real world" hint="Move your mouse over the cards" delay={T.mockups}>
        <Mockups kit={kit} delay={T.mockups} />
      </Section>

      <Section title="Brand personality" delay={T.details}>
        <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3 rounded-2xl border border-black/10 bg-white p-6" style={{ fontFamily: body }}>
            <div className="flex flex-wrap gap-2">
              {kit.personality.map((p) => (
                <span key={p} className="rounded-full px-3 py-1 text-sm font-medium"
                  style={{ background: primary, color: kit.on_primary }}>{p}</span>
              ))}
            </div>
            <p className="text-black/80">{kit.story}</p>
            <p className="text-sm text-black/55"><b>Voice:</b> {kit.tone}</p>
            <p className="text-sm text-black/55"><b>Logo idea:</b> {kit.logo.symbol} ({kit.logo.style})</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <p className="mb-3 text-sm font-semibold">Accessibility check (WCAG)</p>
            <ul className="space-y-2 text-sm">
              {kit.contrast.map((c) => (
                <li key={c.pair} className="flex items-center justify-between gap-2">
                  <span className="text-black/65">{c.pair}</span>
                  <span className={c.passes ? "text-emerald-600" : "text-red-600"}>
                    {c.ratio}:1 {c.passes ? "✓" : "✗"}{c.fixed ? " (auto-fixed)" : ""}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-black/40">Generated with {kit.source}{kit.model ? ` · ${kit.model}` : ""}</p>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, hint, delay, children }: { title: string; hint?: string; delay: number; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay }}>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        {hint && <span className="text-xs text-black/40">{hint}</span>}
      </div>
      {children}
    </motion.section>
  );
}

function FontCard({ label, font, sample, big, delay }: { label: string; font: string; sample: string; big?: boolean; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, rotateY: 90 }} animate={{ opacity: 1, rotateY: 0 }}
      transition={{ delay, duration: 0.6 }} style={{ transformPerspective: 800 }}
      className="rounded-2xl border border-black/10 bg-white p-5">
      <p className="text-xs uppercase tracking-widest text-black/40">{label}</p>
      <p className={big ? "mt-2 text-4xl" : "mt-2 text-base"} style={{ fontFamily: `'${font}', sans-serif` }}>{sample}</p>
      <p className="mt-3 text-sm font-medium">{font}</p>
    </motion.div>
  );
}
