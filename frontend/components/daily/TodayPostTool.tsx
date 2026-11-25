"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import PostCard from "../PostCard";
import ShareBar, { BigButton, CopyBox } from "./ShareBar";
import { api } from "@/lib/api";
import { slugFile } from "@/lib/download";
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
  const [idea, setIdea] = useState(initial?.input.idea ?? "");
  const [ev, setEv] = useState<string | null>(initial?.input.event ?? event ?? null);
  const [post, setPost] = useState<SocialPost | null>(initial?.output ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (event) setEv(event);
  }, [event]);

  const make = async () => {
    setBusy(true);
    setError(null);
    try {
      const c = await api.dailyPost(brandId, idea.trim() || null, ev);
      if (c.kind === "post") setPost(c.output);
      onCreated(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const caption = post
    ? [post.caption_th, post.caption_en, post.hashtags.map((h) => `#${h}`).join(" ")].filter(Boolean).join("\n\n")
    : "";

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {ev && (
          <div className="flex items-center gap-2 text-sm">
            <span className="rounded-full bg-studio-accent/10 px-3 py-1 font-medium text-studio-accent">🎉 About: {ev}</span>
            <button type="button" onClick={() => setEv(null)} className="text-xs text-black/45 underline">remove</button>
          </div>
        )}
        <input
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && make()}
          maxLength={300}
          placeholder="Anything special today? (optional) e.g. new mango smoothie"
          className="min-h-12 w-full rounded-2xl border border-black/10 bg-white px-4 text-base outline-none focus:border-studio-accent focus:ring-4 focus:ring-studio-accent/15"
        />
        <div className="flex flex-wrap gap-2">
          {IDEAS.map((i) => (
            <button key={i} type="button" onClick={() => setIdea(i)}
              className="rounded-full bg-black/5 px-3 py-1.5 text-xs text-black/65 hover:bg-black/10">
              {i}
            </button>
          ))}
        </div>
        <BigButton onClick={make} disabled={busy} primary>
          {busy ? "Writing today's post…" : post ? "↻ Make another" : "✨ Make today's post"}
        </BigButton>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {post && !busy && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="grid items-start gap-5 md:grid-cols-[auto_1fr]">
          <div className="mx-auto">
            <PostCard ref={ref} kit={kit} post={post} size={320} />
          </div>
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-black/45">{post.theme}</p>
            <CopyBox label="Thai caption" text={post.caption_th} onToast={onToast} font={`'${kit.fonts.thai}', sans-serif`} />
            <CopyBox label="English caption" text={post.caption_en} onToast={onToast} />
            {post.hashtags.length > 0 && <p className="text-sm text-studio-accent">{post.hashtags.map((h) => `#${h}`).join(" ")}</p>}
            <ShareBar target={ref} filename={`${slugFile(kit.brand_name)}-today.png`} caption={caption} pixelRatio={3.375}
              onToast={onToast} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
