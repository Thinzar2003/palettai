"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import PostCard, { type PhotoStyle } from "../PostCard";
import { ColorPicker, EditableText, LayoutPicker, LineField, PhotoPicker, SaveEdits } from "./Controls";
import ShareBar, { BigButton } from "./ShareBar";
import { api } from "@/lib/api";
import { slugFile } from "@/lib/download";
import { useT } from "@/lib/i18n";
import { kitVariant, type ColorVariant } from "@/lib/kitTheme";
import type { BrandKit, Creation, SocialPost } from "@/lib/types";

const IDEAS = ["New menu item", "Behind the scenes", "Customer favourite", "Rainy-day special", "Thank our customers"];

export default function TodayPostTool({
  brandId,
  kit,
  event,
  initial,
  onCreated,
  onToast,
}: {
  brandId: number;
  kit: BrandKit;
  event?: string | null;
  initial?: Extract<Creation, { kind: "post" }> | null;
  onCreated: (c: Creation) => void;
  onToast: (m: string) => void;
}) {
  const { t } = useT();
  const [idea, setIdea] = useState(initial?.input.idea ?? "");
  const [ev, setEv] = useState<string | null>(initial?.input.event ?? event ?? null);
  const [post, setPost] = useState<SocialPost | null>(initial?.output ?? null);
  const [saved, setSaved] = useState<SocialPost | null>(initial?.output ?? null);
  const [creationId, setCreationId] = useState<number | null>(initial?.id ?? null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoStyle, setPhotoStyle] = useState<PhotoStyle>("full");
  const [price, setPrice] = useState("");
  const [variant, setVariant] = useState<ColorVariant>("brand");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const shown = useMemo(() => kitVariant(kit, variant), [kit, variant]);

  useEffect(() => {
    if (event) setEv(event);
  }, [event]);

  const make = async () => {
    setBusy(true);
    setError(null);
    try {
      const c = await api.dailyPost(brandId, idea.trim() || null, ev);
      if (c.kind === "post") {
        setPost(c.output);
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

  const edit = <K extends keyof SocialPost>(k: K, v: SocialPost[K]) => setPost((p) => (p ? { ...p, [k]: v } : p));
  const dirty = !!post && JSON.stringify(post) !== JSON.stringify(saved);
  const save = async () => {
    if (!post || !creationId) return;
    setSaving(true);
    try {
      const c = await api.updateCreation(creationId, post);
      if (c.kind === "post") setSaved(c.output);
      onToast(t("Changes saved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Something went wrong"));
    } finally {
      setSaving(false);
    }
  };

  const caption = post
    ? [post.caption_th, post.caption_en, post.hashtags.map((h) => `#${h}`).join(" ")].filter(Boolean).join("\n\n")
    : "";
  const thai = `'${kit.fonts.thai}', sans-serif`;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {ev && (
          <div className="flex items-center gap-2 text-sm">
            <span className="rounded-full bg-studio-accent/10 px-3 py-1 font-medium text-studio-accent">🎉 {t("About: {event}", { event: ev })}</span>
            <button type="button" onClick={() => setEv(null)} className="text-xs text-black/45 underline">{t("remove")}</button>
          </div>
        )}
        <input
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && make()}
          maxLength={300}
          placeholder={t("Anything special today? (optional) e.g. new mango smoothie")}
          className="min-h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-base outline-none focus:border-studio-accent focus:ring-4 focus:ring-studio-accent/15"
        />
        <div className="flex flex-wrap gap-2">
          {IDEAS.map((i) => (
            <button key={i} type="button" onClick={() => setIdea(t(i))}
              className="rounded-full bg-black/5 px-3 py-1.5 text-xs text-black/65 hover:bg-black/10">
              {t(i)}
            </button>
          ))}
        </div>
        <PhotoPicker photo={photo} onPhoto={setPhoto} style={photoStyle} onStyle={setPhotoStyle} price={price} onPrice={setPrice}
          onError={setError} />
        <BigButton onClick={make} disabled={busy} primary>
          {busy ? t("Writing today's post…") : post ? t("↻ Make another") : t("✨ Make today's post")}
        </BigButton>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {post && !busy && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="grid items-start gap-5 md:grid-cols-[auto_1fr]">
          <div className="mx-auto space-y-3">
            <motion.div key={`${variant}-${post.layout}-${photoStyle}-${!!photo}`} initial={{ scale: 0.96, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
              <PostCard ref={ref} kit={shown} post={post} size={320} photo={photo} photoStyle={photoStyle} price={price.trim()} />
            </motion.div>
            <ColorPicker kit={kit} value={variant} onChange={setVariant} />
            {!photo && <LayoutPicker value={post.layout} onChange={(l) => edit("layout", l)} />}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-black/45">{post.theme}</p>
              <button type="button" onClick={() => setEditing((e) => !e)}
                className="rounded-full bg-black/5 px-3 py-1.5 text-xs font-medium hover:bg-black/10">
                {editing ? t("Done editing") : t("✏️ Edit text")}
              </button>
            </div>
            <AnimatePresence>
              {editing && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden">
                  <LineField label={t("Headline")} value={post.headline} onChange={(v) => edit("headline", v)} max={60} />
                  <LineField label={t("Small text")} value={post.subtext} onChange={(v) => edit("subtext", v)} max={120} />
                  <LineField label={t("Button text")} value={post.cta} onChange={(v) => edit("cta", v)} max={30} />
                </motion.div>
              )}
            </AnimatePresence>
            {post.caption_th !== "" && (
              <EditableText label={t("Thai caption")} value={post.caption_th} onChange={(v) => edit("caption_th", v)} onToast={onToast} font={thai} />
            )}
            {post.caption_en !== "" && (
              <EditableText label={t("English caption")} value={post.caption_en} onChange={(v) => edit("caption_en", v)} onToast={onToast} />
            )}
            {post.hashtags.length > 0 && <p className="text-sm text-studio-accent">{post.hashtags.map((h) => `#${h}`).join(" ")}</p>}
            <ShareBar target={ref} filename={`${slugFile(kit.brand_name)}-today.png`} caption={caption} pixelRatio={3.375}
              onToast={onToast} />
            <SaveEdits dirty={dirty} saving={saving} onSave={save} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
