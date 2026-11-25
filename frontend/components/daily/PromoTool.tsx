"use client";

import { motion } from "motion/react";
import { useRef, useState } from "react";
import { PromoPoster, PromoStory } from "./PromoVisuals";
import ShareBar, { BigButton, CopyBox } from "./ShareBar";
import { api } from "@/lib/api";
import { slugFile } from "@/lib/download";
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
  const [offer, setOffer] = useState(initial?.input.offer ?? "");
  const [period, setPeriod] = useState(initial?.input.period ?? "");
  const [promo, setPromo] = useState<PromoOutput | null>(initial?.output ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const file = slugFile(kit.brand_name);

  const make = async () => {
    if (offer.trim().length < 3) {
      setError("Describe your offer first, e.g. “20% off milk tea”.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const c = await api.dailyPromo(brandId, offer.trim(), period.trim() || null);
      if (c.kind === "promo") setPromo(c.output);
      onCreated(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const tags = promo?.hashtags.map((h) => `#${h}`).join(" ") ?? "";
  const field =
    "min-h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-base outline-none focus:border-studio-accent focus:ring-4 focus:ring-studio-accent/15";

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <input value={offer} onChange={(e) => setOffer(e.target.value)} maxLength={200}
          placeholder="What's the offer? e.g. 20% off all milk tea" className={field} />
        <div className="flex flex-wrap gap-2">
          {OFFERS.map((o) => (
            <button key={o} type="button" onClick={() => setOffer(o)}
              className="rounded-full bg-black/5 px-3 py-1.5 text-xs text-black/65 hover:bg-black/10">{o}</button>
          ))}
        </div>
        <input value={period} onChange={(e) => setPeriod(e.target.value)} maxLength={100}
          placeholder="When? (optional) e.g. this weekend, 1–7 Dec" className={field} />
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button key={p} type="button" onClick={() => setPeriod(p)}
              className="rounded-full bg-black/5 px-3 py-1.5 text-xs text-black/65 hover:bg-black/10">{p}</button>
          ))}
        </div>
        <BigButton onClick={make} disabled={busy} primary>
          {busy ? "Designing your promo…" : promo ? "↻ Make another version" : "🏷️ Make my promo"}
        </BigButton>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {promo && !busy && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="grid items-start gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-black/45">Feed post · 1080×1080</p>
              <PromoPoster ref={posterRef} kit={kit} promo={promo} size={320} />
              <ShareBar target={posterRef} filename={`${file}-promo.png`} caption={[promo.facebook_caption, tags].join("\n\n")}
                pixelRatio={3.375} onToast={onToast} />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-black/45">Story · 1080×1920</p>
              <PromoStory ref={storyRef} kit={kit} promo={promo} width={240} />
              <ShareBar target={storyRef} filename={`${file}-promo-story.png`} pixelRatio={4.5} onToast={onToast} />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <CopyBox label="Facebook / Instagram caption" text={[promo.facebook_caption, tags].filter(Boolean).join("\n\n")}
              onToast={onToast} font={`'${kit.fonts.thai}', sans-serif`} />
            <CopyBox label="LINE message" text={promo.line_message} onToast={onToast} font={`'${kit.fonts.thai}', sans-serif`} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
