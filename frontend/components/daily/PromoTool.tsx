"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { ColorPicker, EditableText, LineField, PhotoPicker, SaveEdits } from "./Controls";
import { PromoPoster, PromoStory } from "./PromoVisuals";
import ShareBar, { BigButton } from "./ShareBar";
import { api } from "@/lib/api";
import { slugFile } from "@/lib/download";
import { useT } from "@/lib/i18n";
import { kitVariant, type ColorVariant } from "@/lib/kitTheme";
import type { BrandKit, Creation, PromoOutput } from "@/lib/types";

const OFFERS = ["20% off everything", "Buy 1 get 1 free", "Free delivery over ฿300", "ลด 10% สำหรับนักศึกษา"];
const PERIODS = ["Today only", "This weekend", "All this week", "Until end of month"];

export default function PromoTool({
  brandId,
  kit,
  initial,
  onCreated,
  onToast,
}: {
  brandId: number;
  kit: BrandKit;
  initial?: Extract<Creation, { kind: "promo" }> | null;
  onCreated: (c: Creation) => void;
  onToast: (m: string) => void;
}) {
  const { t } = useT();
  const [offer, setOffer] = useState(initial?.input.offer ?? "");
  const [period, setPeriod] = useState(initial?.input.period ?? "");
  const [promo, setPromo] = useState<PromoOutput | null>(initial?.output ?? null);
  const [saved, setSaved] = useState<PromoOutput | null>(initial?.output ?? null);
  const [creationId, setCreationId] = useState<number | null>(initial?.id ?? null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [variant, setVariant] = useState<ColorVariant>("brand");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const shown = useMemo(() => kitVariant(kit, variant), [kit, variant]);
  const file = slugFile(kit.brand_name);

  const make = async () => {
    if (offer.trim().length < 3) {
      setError(t("Describe your offer first, e.g. “20% off milk tea”."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const c = await api.dailyPromo(brandId, offer.trim(), period.trim() || null);
      if (c.kind === "promo") {
        setPromo(c.output);
        setSaved(c.output);
        setCreationId(c.id);
      }
      onCreated(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Something went wrong"));
    } finally {
      setBusy(false);
    }
  };

  const edit = <K extends keyof PromoOutput>(k: K, v: PromoOutput[K]) => setPromo((p) => (p ? { ...p, [k]: v } : p));
  const dirty = !!promo && JSON.stringify(promo) !== JSON.stringify(saved);
  const save = async () => {
    if (!promo || !creationId) return;
    setSaving(true);
    try {
      const c = await api.updateCreation(creationId, promo);
      if (c.kind === "promo") setSaved(c.output);
      onToast(t("Changes saved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Something went wrong"));
    } finally {
      setSaving(false);
    }
  };

  const tags = promo?.hashtags.map((h) => `#${h}`).join(" ") ?? "";
  const thai = `'${kit.fonts.thai}', sans-serif`;
  const field =
    "min-h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-base outline-none focus:border-studio-accent focus:ring-4 focus:ring-studio-accent/15";

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <input value={offer} onChange={(e) => setOffer(e.target.value)} maxLength={200}
          placeholder={t("What's the offer? e.g. 20% off all milk tea")} className={field} />
        <div className="flex flex-wrap gap-2">
          {OFFERS.map((o) => (
            <button key={o} type="button" onClick={() => setOffer(t(o))}
              className="rounded-full bg-black/5 px-3 py-1.5 text-xs text-black/65 hover:bg-black/10">{t(o)}</button>
          ))}
        </div>
        <input value={period} onChange={(e) => setPeriod(e.target.value)} maxLength={100}
          placeholder={t("When? (optional) e.g. this weekend, 1–7 Dec")} className={field} />
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button key={p} type="button" onClick={() => setPeriod(t(p))}
              className="rounded-full bg-black/5 px-3 py-1.5 text-xs text-black/65 hover:bg-black/10">{t(p)}</button>
          ))}
        </div>
        <PhotoPicker photo={photo} onPhoto={setPhoto} onError={setError} />
        <BigButton onClick={make} disabled={busy} primary>
          {busy ? t("Designing your promo…") : promo ? t("↻ Make another version") : t("🏷️ Make my promo")}
        </BigButton>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {promo && !busy && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ColorPicker kit={kit} value={variant} onChange={setVariant} />
            <button type="button" onClick={() => setEditing((e) => !e)}
              className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-medium hover:bg-black/10">
              {editing ? t("Done editing") : t("✏️ Edit text")}
            </button>
          </div>
          <AnimatePresence>
            {editing && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="grid gap-2 overflow-hidden sm:grid-cols-2">
                <LineField label={t("Sticker")} value={promo.badge} onChange={(v) => edit("badge", v)} max={14} />
                <LineField label={t("Headline")} value={promo.headline} onChange={(v) => edit("headline", v)} max={60} />
                <LineField label={t("Small text")} value={promo.subtext} onChange={(v) => edit("subtext", v)} max={120} />
                <LineField label={t("Button text")} value={promo.cta} onChange={(v) => edit("cta", v)} max={30} />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="grid items-start gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-black/45">{t("Feed post · 1080×1080")}</p>
              <PromoPoster ref={posterRef} kit={shown} promo={promo} size={320} photo={photo} />
              <ShareBar target={posterRef} filename={`${file}-promo.png`} caption={[promo.facebook_caption, tags].join("\n\n")}
                pixelRatio={3.375} onToast={onToast} />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-black/45">{t("Story · 1080×1920")}</p>
              <PromoStory ref={storyRef} kit={shown} promo={promo} width={240} photo={photo} />
              <ShareBar target={storyRef} filename={`${file}-promo-story.png`} pixelRatio={4.5} onToast={onToast} />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <EditableText label={t("Facebook / Instagram caption")} value={promo.facebook_caption}
              onChange={(v) => edit("facebook_caption", v)} onToast={onToast} font={thai} rows={6} />
            <EditableText label={t("LINE message")} value={promo.line_message} onChange={(v) => edit("line_message", v)}
              onToast={onToast} font={thai} rows={6} />
          </div>
          {tags && <p className="text-sm text-studio-accent">{tags}</p>}
          <SaveEdits dirty={dirty} saving={saving} onSave={save} />
        </motion.div>
      )}
    </div>
  );
}
