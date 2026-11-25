"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { BrandDetail, BrandKit, FontLists, KitEdit, PaletteColor } from "@/lib/types";
import { useGoogleFonts } from "@/lib/useGoogleFonts";
import { useT } from "@/lib/i18n";

/** Edit colours, fonts and words by hand. Saving creates a new version (undo via History). */
export default function KitEditor({
  brandId,
  kit,
  onSaved,
  onCancel,
  onError,
}: {
  brandId: number;
  kit: BrandKit;
  onSaved: (b: BrandDetail) => void;
  onCancel: () => void;
  onError: (msg: string) => void;
}) {
  const { t } = useT();
  const [palette, setPalette] = useState<PaletteColor[]>(kit.palette.map((c) => ({ ...c })));
  const [fonts, setFonts] = useState({ heading: kit.fonts.heading, body: kit.fonts.body, thai: kit.fonts.thai });
  const [name, setName] = useState(kit.brand_name);
  const [tagline, setTagline] = useState(kit.tagline);
  const [tone, setTone] = useState(kit.tone);
  const [slogans, setSlogans] = useState(kit.slogans.map((s) => ({ ...s })));
  const [lists, setLists] = useState<FontLists | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.fonts().then(setLists).catch(() => setLists(null));
  }, []);
  useGoogleFonts([fonts.heading, fonts.body, fonts.thai]);

  const setColor = (i: number, patch: Partial<PaletteColor>) =>
    setPalette((p) => p.map((c, k) => (k === i ? { ...c, ...patch } : c)));

  const save = async () => {
    const edit: KitEdit = {};
    if (name.trim() !== kit.brand_name) edit.brand_name = name.trim();
    if (tagline !== kit.tagline) edit.tagline = tagline;
    if (tone !== kit.tone) edit.tone = tone;
    if (JSON.stringify(palette) !== JSON.stringify(kit.palette)) edit.palette = palette;
    if (fonts.heading !== kit.fonts.heading || fonts.body !== kit.fonts.body || fonts.thai !== kit.fonts.thai)
      edit.fonts = { ...fonts, reason: kit.fonts.reason };
    if (JSON.stringify(slogans) !== JSON.stringify(kit.slogans)) edit.slogans = slogans.filter((s) => s.en || s.th);
    if (Object.keys(edit).length === 0) return onCancel();
    setSaving(true);
    try {
      onSaved(await api.editKit(brandId, edit));
    } catch (e) {
      onError(e instanceof Error ? e.message : t("Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-studio-accent";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      className="overflow-hidden rounded-3xl border-2 border-studio-accent/40 bg-white"
    >
      <div className="space-y-8 p-6">
        <div className="flex items-center justify-between">
          <p className="font-display text-xl font-bold">{t("✎ Edit by hand")}</p>
          <p className="text-xs text-black/45">{t("Saving creates a new version. Low-contrast colours get auto-fixed.")}</p>
        </div>

        {/* Colours */}
        <section>
          <p className="mb-3 text-sm font-semibold">{t("Colours")}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {palette.map((c, i) => (
              <div key={c.role} className="rounded-2xl border border-black/10 p-3">
                <label className="relative block h-20 cursor-pointer overflow-hidden rounded-xl" style={{ background: c.hex }}>
                  <input
                    type="color"
                    value={c.hex}
                    onChange={(e) => setColor(i, { hex: e.target.value.toUpperCase() })}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label={`${c.role} colour`}
                  />
                </label>
                <p className="mt-2 text-[10px] uppercase tracking-widest text-black/45">{c.role}</p>
                <input value={c.name} onChange={(e) => setColor(i, { name: e.target.value })} className={`${input} mt-1`} />
                <input
                  value={c.hex}
                  onChange={(e) => setColor(i, { hex: e.target.value })}
                  className={`${input} mt-1 font-mono`}
                  maxLength={7}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Fonts */}
        <section>
          <p className="mb-3 text-sm font-semibold">{t("Fonts")}</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(["heading", "body", "thai"] as const).map((role) => (
              <label key={role} className="block rounded-2xl border border-black/10 p-3">
                <span className="text-[10px] uppercase tracking-widest text-black/45">{role}</span>
                <p className="my-2 truncate text-2xl" style={{ fontFamily: `'${fonts[role]}', sans-serif` }}>
                  {role === "thai" ? "สวัสดีครับ" : "Aa Bb Cc"}
                </p>
                <select
                  value={fonts[role]}
                  onChange={(e) => setFonts((f) => ({ ...f, [role]: e.target.value }))}
                  className={input}
                >
                  {(lists?.[role] ?? [fonts[role]]).map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>

        {/* Words */}
        <section className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">{t("Brand name")}</span>
            <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">{t("Tagline")}</span>
            <input value={tagline} maxLength={160} onChange={(e) => setTagline(e.target.value)} className={input} />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-semibold">{t("Tone of voice")}</span>
            <textarea value={tone} maxLength={400} rows={2} onChange={(e) => setTone(e.target.value)} className={`${input} resize-none`} />
          </label>
        </section>

        <section>
          <p className="mb-3 text-sm font-semibold">{t("Slogans")}</p>
          <div className="space-y-2">
            {slogans.map((s, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  value={s.en}
                  placeholder="English"
                  onChange={(e) => setSlogans((l) => l.map((x, k) => (k === i ? { ...x, en: e.target.value } : x)))}
                  className={input}
                />
                <input
                  value={s.th}
                  placeholder="ภาษาไทย"
                  onChange={(e) => setSlogans((l) => l.map((x, k) => (k === i ? { ...x, th: e.target.value } : x)))}
                  className={input}
                  style={{ fontFamily: `'${fonts.thai}', sans-serif` }}
                />
                <button
                  type="button"
                  onClick={() => setSlogans((l) => l.filter((_, k) => k !== i))}
                  className="rounded-xl px-3 text-black/40 hover:bg-black/5 hover:text-black"
                  aria-label={t("Remove slogan")}
                >
                  ✕
                </button>
              </div>
            ))}
            {slogans.length < 6 && (
              <button
                type="button"
                onClick={() => setSlogans((l) => [...l, { en: "", th: "" }])}
                className="text-sm text-studio-accent hover:underline"
              >
                {t("+ Add slogan")}
              </button>
            )}
          </div>
        </section>

        <div className="flex justify-end gap-2 border-t border-black/10 pt-5">
          <button type="button" onClick={onCancel} className="rounded-full px-5 py-2 text-sm hover:bg-black/5">
            {t("Cancel")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-full bg-studio-accent px-6 py-2 text-sm font-semibold text-on-accent shadow-md shadow-studio-accent/30 disabled:opacity-50"
          >
            {saving ? t("Saving…") : t("Save as new version")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
