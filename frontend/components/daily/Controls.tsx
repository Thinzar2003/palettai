"use client";

import { motion } from "motion/react";
import { useRef, useState } from "react";
import { copy } from "./ShareBar";
import type { PhotoStyle } from "../PostCard";
import { useT } from "@/lib/i18n";
import { readPhoto } from "@/lib/image";
import { COLOR_VARIANTS, kitVariant, variantReadable, type ColorVariant } from "@/lib/kitTheme";
import { colorOf, type BrandKit, type PostLayout } from "@/lib/types";

const chip = (on: boolean) =>
  `min-h-9 rounded-full px-3.5 py-1.5 text-xs font-medium transition active:scale-95 ${
    on ? "bg-studio-ink text-white" : "bg-black/5 text-black/65 hover:bg-black/10"
  }`;

/** Pick / change / remove the owner's own photo (stays in the browser). */
export function PhotoPicker({
  photo,
  onPhoto,
  style,
  onStyle,
  price,
  onPrice,
  onError,
}: {
  photo: string | null;
  onPhoto: (p: string | null) => void;
  style?: PhotoStyle;
  onStyle?: (s: PhotoStyle) => void;
  price?: string;
  onPrice?: (p: string) => void;
  onError: (m: string) => void;
}) {
  const { t } = useT();
  const input = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setLoading(true);
    try {
      onPhoto(await readPhoto(file));
    } catch (e) {
      onError(e instanceof Error ? e.message : t("Photo too large or unsupported"));
    } finally {
      setLoading(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="space-y-2 rounded-2xl border border-dashed border-black/15 bg-white/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-12 w-12 rounded-xl object-cover" />
        )}
        <button type="button" onClick={() => input.current?.click()} disabled={loading} className={chip(false)}>
          {loading ? "…" : photo ? t("📷 Change photo") : t("📷 Add your photo")}
        </button>
        {photo && (
          <button type="button" onClick={() => onPhoto(null)} className="text-xs text-black/45 underline">{t("Remove photo")}</button>
        )}
        {photo && onStyle && (
          <div className="flex gap-1">
            {(["full", "frame"] as PhotoStyle[]).map((s) => (
              <button key={s} type="button" onClick={() => onStyle(s)} className={chip(style === s)}>
                {s === "full" ? t("Full photo") : t("Framed")}
              </button>
            ))}
          </div>
        )}
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {onPrice && (
        <input value={price ?? ""} onChange={(e) => onPrice(e.target.value)} maxLength={20} placeholder={t("Price (optional) e.g. ฿55")}
          className="min-h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-studio-accent" />
      )}
      <p className="text-[11px] text-black/40">{t("Your photo stays on this device. It's only used to make the image.")}</p>
    </div>
  );
}

/** Four colour arrangements of the same palette, shown as swatches. */
export function ColorPicker({ kit, value, onChange }: { kit: BrandKit; value: ColorVariant; onChange: (v: ColorVariant) => void }) {
  const { t } = useT();
  const label: Record<ColorVariant, string> = { brand: t("Brand"), accent: t("Accent"), soft: t("Soft"), dark: t("Dark") };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-black/45">{t("Colours")}</span>
      {COLOR_VARIANTS.map((v) => {
        const k = kitVariant(kit, v);
        if (v !== "brand" && !variantReadable(k)) return null;
        return (
          <motion.button key={v} type="button" whileTap={{ scale: 0.9 }} onClick={() => onChange(v)} title={label[v]}
            className={`flex items-center gap-1.5 rounded-full border-2 py-1 pl-1 pr-3 text-xs transition ${
              value === v ? "border-studio-accent" : "border-transparent bg-black/5"
            }`}>
            <span className="flex overflow-hidden rounded-full">
              <span className="h-5 w-3" style={{ background: colorOf(k, "primary") }} />
              <span className="h-5 w-3" style={{ background: colorOf(k, "background") }} />
            </span>
            {label[v]}
          </motion.button>
        );
      })}
    </div>
  );
}

export function LayoutPicker({ value, onChange }: { value: PostLayout; onChange: (l: PostLayout) => void }) {
  const { t } = useT();
  const items: [PostLayout, string][] = [["quote", t("Quote")], ["promo", t("Promo")], ["tip", t("Tip")], ["announcement", t("News")]];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-black/45">{t("Layout")}</span>
      {items.map(([id, label]) => (
        <button key={id} type="button" onClick={() => onChange(id)} className={chip(value === id)}>{label}</button>
      ))}
    </div>
  );
}

/** One-line editable field used for headline / small text / button text. */
export function LineField({ label, value, onChange, max = 80 }: { label: string; value: string; onChange: (v: string) => void; max?: number }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-widest text-black/45">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} maxLength={max}
        className="min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus:border-studio-accent focus:ring-4 focus:ring-studio-accent/15" />
    </label>
  );
}

/** Ready-to-send text the owner can edit in place, with a copy button. */
export function EditableText({
  label,
  value,
  onChange,
  onToast,
  font,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onToast: (m: string) => void;
  font?: string;
  rows?: number;
}) {
  const { t } = useT();
  if (value === undefined || value === null) return null;
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-black/45">{label} ✎</span>
        <button type="button" onClick={() => copy(value, onToast, t("Copied!"))}
          className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium hover:bg-black/10 active:scale-95">
          {t("⧉ Copy")}
        </button>
      </div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        className="w-full resize-y rounded-lg bg-transparent px-1 text-sm leading-relaxed text-black/80 outline-none focus:bg-black/[0.03]"
        style={font ? { fontFamily: font } : undefined} />
    </div>
  );
}

/** Shows "Save changes" when the owner edited a result (so history keeps their version). */
export function SaveEdits({ dirty, saving, onSave }: { dirty: boolean; saving: boolean; onSave: () => void }) {
  const { t } = useT();
  if (!dirty) return null;
  return (
    <motion.button type="button" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} onClick={onSave} disabled={saving}
      className="min-h-11 rounded-2xl bg-studio-ink px-5 py-2.5 text-sm font-semibold text-white active:scale-95 disabled:opacity-50">
      {saving ? t("Saving…") : t("💾 Save changes")}
    </motion.button>
  );
}
