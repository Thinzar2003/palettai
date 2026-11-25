"use client";

import { motion } from "motion/react";
import { useState } from "react";
import Logo3D from "./Logo3D";
import Spinner from "./Spinner";
import Tilt from "./Tilt";
import { api } from "@/lib/api";
import { downloadBlob, downloadText, lockupSvg, slugFile, svgToPng } from "@/lib/download";
import { colorOf, type BrandDetail, type BrandKit, type LogoStyle } from "@/lib/types";

const STYLES: { id: LogoStyle; label: string; icon: string }[] = [
  { id: "minimal", label: "Minimal", icon: "◯" },
  { id: "geometric", label: "Geometric", icon: "◆" },
  { id: "mascot", label: "Mascot", icon: "🐱" },
  { id: "emblem", label: "Emblem", icon: "🏅" },
  { id: "lettermark", label: "Lettermark", icon: "Ⓐ" },
  { id: "line", label: "Line art", icon: "〰" },
  { id: "thai", label: "Thai motif", icon: "🪷" },
];
const styleLabel = (id: string) => STYLES.find((s) => s.id === id)?.label ?? "";

export default function LogoStudio({
  brandId,
  kit,
  readOnly,
  onChange,
  onError,
}: {
  brandId: number;
  kit: BrandKit;
  readOnly: boolean;
  onChange: (b: BrandDetail, aiUsed?: boolean) => void;
  onError: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [styles, setStyles] = useState<LogoStyle[]>([]);
  const [matchColors, setMatchColors] = useState(true);
  const toggleStyle = (id: LogoStyle) =>
    setStyles((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 3 ? [...s, id] : s));
  const primary = colorOf(kit, "primary");
  const secondary = colorOf(kit, "secondary");
  const bg = colorOf(kit, "background");
  const text = colorOf(kit, "text");
  const icons = kit.icons ?? [];
  const selected = kit.selected_icon;
  const current = selected != null ? icons[selected] : null;
  const file = slugFile(kit.brand_name);

  const generate = async () => {
    setBusy(true);
    try {
      onChange(await api.makeLogos(brandId, styles, matchColors), true);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Logo generation failed");
    } finally {
      setBusy(false);
    }
  };

  const select = async (index: number | null) => {
    try {
      onChange(await api.selectLogo(brandId, index));
    } catch (e) {
      onError(e instanceof Error ? e.message : "Could not select logo");
    }
  };

  const png = async (svg: string, name: string, background?: string) => {
    try {
      downloadBlob(await svgToPng(svg, 1024, background), name);
    } catch (e) {
      onError(e instanceof Error ? e.message : "PNG export failed");
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid items-center gap-8 rounded-3xl border border-black/10 p-8 md:grid-cols-[auto_1fr]" style={{ background: bg, color: text }}>
        <Logo3D
          svg={current?.svg}
          monogram={kit.logo.monogram}
          primary={primary}
          secondary={secondary}
          onPrimary={kit.on_primary}
          font={kit.fonts.heading}
          size={170}
        />
        <div>
          <p className="text-xs uppercase tracking-[0.25em] opacity-60">Logo</p>
          <h3 className="mt-1 text-3xl font-bold" style={{ fontFamily: `'${kit.fonts.heading}', sans-serif`, color: primary }}>
            {current ? current.name || "Your logo" : "Monogram badge"}
          </h3>
          <p className="mt-2 max-w-md opacity-75">
            {current ? current.concept : `Brief idea: ${kit.logo.symbol || "a simple mark"}. Generate AI icons to get a real symbol.`}
          </p>
          <p className="mt-2 text-xs opacity-50">Drag the coin to spin it.</p>
          {!readOnly && (
            <motion.button
              type="button"
              disabled={busy}
              whileHover={busy ? undefined : { scale: 1.03 }}
              whileTap={busy ? undefined : { scale: 0.97 }}
              onClick={generate}
              className="mt-5 rounded-full bg-studio-accent px-6 py-3 font-semibold text-on-accent shadow-lg shadow-studio-accent/30 disabled:opacity-50"
            >
              {busy ? "Designing logos…" : icons.length ? "↻ Design 3 new logos" : "✒️ Design 3 logos"}
            </motion.button>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="rounded-3xl border border-black/10 bg-white p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-display text-lg font-bold">Logo styles</p>
            <p className="text-xs text-black/45">
              Pick up to 3 (one logo each). None picked = we choose for you.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {STYLES.map((st) => {
              const on = styles.includes(st.id);
              const n = styles.indexOf(st.id) + 1;
              return (
                <motion.button
                  key={st.id}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => toggleStyle(st.id)}
                  disabled={busy || (!on && styles.length >= 3)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition disabled:opacity-40 ${
                    on ? "bg-studio-ink text-white" : "border border-black/15 hover:bg-black/5"
                  }`}
                >
                  <span>{st.icon}</span>
                  {st.label}
                  {on && (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-studio-accent text-[10px] text-on-accent">
                      {n}
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-black/70">
            <input type="checkbox" checked={matchColors} onChange={(e) => setMatchColors(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-studio-accent)]" />
            Match brand colours <span className="text-xs text-black/40">(recolour logos with your palette)</span>
          </label>
        </div>
      )}

      {busy && <Spinner label="Sketching concepts → drawing with FLUX → tracing to vector…" />}

      {!busy && icons.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {icons.map((icon, i) => {
            const active = i === selected;
            return (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Tilt className="rounded-3xl">
                  <div
                    className={`rounded-3xl border-2 bg-white p-5 transition ${active ? "border-studio-accent" : "border-black/10"}`}
                  >
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => select(i)}
                      className="block w-full rounded-2xl p-6"
                      style={{ background: bg }}
                      title="Use this logo"
                    >
                      <motion.span
                        className="mx-auto block h-32 w-32 [&>svg]:h-full [&>svg]:w-full"
                        initial={{ scale: 0.6, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", delay: 0.1 + i * 0.1 }}
                        dangerouslySetInnerHTML={{ __html: icon.svg }}
                      />
                    </button>
                    <div className="mt-4 flex items-start justify-between gap-2">
                      <div>
                        <div className="mb-1 flex flex-wrap gap-1 text-[10px] font-medium uppercase tracking-wider">
                          {icon.style && <span className="rounded-full bg-black/5 px-2 py-0.5 text-black/55">{styleLabel(icon.style)}</span>}
                          <span className="rounded-full bg-black/5 px-2 py-0.5 text-black/55">
                            {icon.source === "flux" ? "AI image → vector" : "AI-drawn SVG"}
                          </span>
                        </div>
                        <p className="font-semibold">{icon.name || `Icon ${i + 1}`}</p>
                        <p className="text-sm text-black/55">{icon.concept}</p>
                      </div>
                      {active && <span className="shrink-0 rounded-full bg-studio-accent px-2 py-0.5 text-xs text-on-accent">Selected</span>}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <DlButton onClick={() => downloadText(icon.svg, `${file}-icon-${i + 1}.svg`, "image/svg+xml")}>SVG</DlButton>
                      <DlButton onClick={() => png(icon.svg, `${file}-icon-${i + 1}.png`)}>PNG</DlButton>
                      <DlButton onClick={() => png(icon.svg, `${file}-icon-${i + 1}-bg.png`, bg)}>PNG + bg</DlButton>
                      <DlButton
                        onClick={() =>
                          downloadText(lockupSvg(icon.svg, kit.brand_name, kit.fonts.heading, text), `${file}-logo-${i + 1}.svg`, "image/svg+xml")
                        }
                      >
                        Logo + name SVG
                      </DlButton>
                    </div>
                  </div>
                </Tilt>
              </motion.div>
            );
          })}
        </div>
      )}

      {!busy && icons.length > 0 && selected != null && !readOnly && (
        <button type="button" onClick={() => select(null)} className="text-sm text-black/50 underline hover:text-black">
          Use the monogram badge instead
        </button>
      )}
    </div>
  );
}

function DlButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="rounded-full border border-black/15 px-3 py-1 transition hover:bg-black/5">
      ⤓ {children}
    </button>
  );
}
