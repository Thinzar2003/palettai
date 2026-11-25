"use client";

import { toPng } from "html-to-image";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import PostCard from "./PostCard";
import Spinner from "./Spinner";
import Tilt from "./Tilt";
import { api } from "@/lib/api";
import { downloadDataUrl, downloadText, slugFile } from "@/lib/download";
import type { BrandDetail, BrandKit, SocialPost } from "@/lib/types";
import { useT } from "@/lib/i18n";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function SocialPack({
  brandId,
  kit,
  readOnly,
  onChange,
  onError,
  onToast,
}: {
  brandId: number;
  kit: BrandKit;
  readOnly: boolean;
  onChange: (b: BrandDetail, aiUsed?: boolean) => void;
  onError: (msg: string) => void;
  onToast: (msg: string) => void;
}) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const posts = kit.social_posts ?? [];

  const generate = async () => {
    setBusy(true);
    try {
      onChange(await api.makeSocial(brandId), true);
    } catch (e) {
      onError(e instanceof Error ? e.message : t("Post generation failed"));
    } finally {
      setBusy(false);
    }
  };

  const exportCaptions = () => {
    const lines = posts.map((p) =>
      [`DAY ${p.day} (${DAYS[p.day - 1] ?? ""}) — ${p.theme}`, p.caption_en, p.caption_th, p.hashtags.map((h) => `#${h}`).join(" "), ""]
        .filter((l) => l !== undefined)
        .join("\n"),
    );
    downloadText(lines.join("\n"), `${slugFile(kit.brand_name)}-captions.txt`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-black/10 bg-white p-6">
        <div>
          <p className="font-display text-xl font-bold">{t("7-day social post pack 📱")}</p>
          <p className="text-sm text-black/55">
            {kit.slogans.some((s) => s.th) ? t("Instagram/Facebook posts in your brand style, with Thai & English captions.") : t("Instagram/Facebook posts in your brand style, with English captions.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {posts.length > 0 && (
            <button type="button" onClick={exportCaptions} className="rounded-full border border-black/15 px-4 py-2 text-sm hover:bg-black/5">
              ⤓ All captions (.txt)
            </button>
          )}
          {!readOnly && (
            <motion.button
              type="button"
              disabled={busy}
              whileHover={busy ? undefined : { scale: 1.03 }}
              whileTap={busy ? undefined : { scale: 0.97 }}
              onClick={generate}
              className="rounded-full bg-studio-accent px-5 py-2 text-sm font-semibold text-on-accent shadow-md shadow-studio-accent/30 disabled:opacity-50"
            >
              {busy ? t("Planning your week…") : posts.length ? t("↻ New week of posts") : t("✨ Generate 7 posts")}
            </motion.button>
          )}
        </div>
      </div>

      {busy && <Spinner label={t("Writing captions and designing posts…")} />}

      {!busy && posts.length === 0 && (
        <p className="py-10 text-center text-black/45">{t("No posts yet. Generate a week of content in one click.")}</p>
      )}

      {!busy && posts.length > 0 && (
        <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
          {posts.map((p, i) => (
            <PostItem key={`${p.day}-${i}`} kit={kit} post={p} index={i} onError={onError} onToast={onToast} />
          ))}
        </div>
      )}
    </div>
  );
}

function PostItem({
  kit,
  post,
  index,
  onError,
  onToast,
}: {
  kit: BrandKit;
  post: SocialPost;
  index: number;
  onError: (m: string) => void;
  onToast: (m: string) => void;
}) {
  const { t } = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const caption = [post.caption_en, post.caption_th, post.hashtags.map((h) => `#${h}`).join(" ")].filter(Boolean).join("\n\n");

  const savePng = async () => {
    if (!ref.current) return;
    setSaving(true);
    try {
      // 360px card × 3 = 1080 × 1080, Instagram's standard size
      const url = await toPng(ref.current, { pixelRatio: 3, cacheBust: true });
      downloadDataUrl(url, `${slugFile(kit.brand_name)}-day${post.day}.png`);
    } catch {
      onError(t("Could not export the image. Try again, or take a screenshot."));
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      onToast(t("Caption copied!"));
    } catch {
      onError(t("Clipboard blocked by the browser"));
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 30, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: index * 0.08, type: "spring" }}>
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-black/45">
        {t("Day {n}", { n: post.day })} · {t(DAYS[post.day - 1] ?? "")} · {post.theme}
      </p>
      <Tilt max={10} className="rounded-[18px]">
        <PostCard ref={ref} kit={kit} post={post} />
      </Tilt>
      <div className="mt-3 rounded-2xl border border-black/10 bg-white p-4 text-sm">
        <p className="line-clamp-3 whitespace-pre-line text-black/75">{post.caption_en}</p>
        {post.caption_th && (
          <p className="mt-2 line-clamp-3 text-black/65" style={{ fontFamily: `'${kit.fonts.thai}', sans-serif` }}>
            {post.caption_th}
          </p>
        )}
        <p className="mt-2 text-xs text-studio-accent">{post.hashtags.map((h) => `#${h}`).join(" ")}</p>
        <div className="mt-3 flex gap-2 text-xs">
          <button type="button" onClick={savePng} disabled={saving} className="rounded-full border border-black/15 px-3 py-1 hover:bg-black/5 disabled:opacity-50">
            {saving ? t("Saving…") : "⤓ PNG 1080px"}
          </button>
          <button type="button" onClick={copy} className="rounded-full border border-black/15 px-3 py-1 hover:bg-black/5">
            {t("⧉ Copy caption")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
