"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { EditableText, SaveEdits } from "./Controls";
import { BigButton } from "./ShareBar";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n";
import type { BrandKit, Creation, ReplyOutput, ReplyPlatform, ReplyTweak } from "@/lib/types";

const PLATFORMS: { id: ReplyPlatform; label: string }[] = [
  { id: "google", label: "Google review" },
  { id: "facebook", label: "Facebook" },
  { id: "line", label: "LINE" },
  { id: "instagram", label: "Instagram" },
  { id: "other", label: "Other" },
];
const MOOD: Record<ReplyOutput["sentiment"], string> = {
  positive: "😊 Happy customer",
  neutral: "😐 Neutral",
  negative: "😟 Unhappy customer",
  question: "❓ Question",
};

export default function ReplyTool({
  brandId,
  kit,
  initial,
  onCreated,
  onToast,
}: {
  brandId: number;
  kit: BrandKit;
  initial?: Extract<Creation, { kind: "reply" }> | null;
  onCreated: (c: Creation) => void;
  onToast: (m: string) => void;
}) {
  const { t } = useT();
  const [message, setMessage] = useState(initial?.input.message ?? "");
  const [platform, setPlatform] = useState<ReplyPlatform>(initial?.input.platform ?? "google");
  const [result, setResult] = useState<ReplyOutput | null>(initial?.output ?? null);
  const [saved, setSaved] = useState<ReplyOutput | null>(initial?.output ?? null);
  const [creationId, setCreationId] = useState<number | null>(initial?.id ?? null);
  const [showOther, setShowOther] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const make = async (tweak: ReplyTweak | null = null) => {
    if (message.trim().length < 2) {
      setError(t("Paste the customer's message or review first."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const c = await api.dailyReply(brandId, message.trim(), platform, tweak);
      if (c.kind === "reply") {
        setResult(c.output);
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

  const dirty = !!result && JSON.stringify(result) !== JSON.stringify(saved);
  const save = async () => {
    if (!result || !creationId) return;
    setSaving(true);
    try {
      const c = await api.updateCreation(creationId, result);
      if (c.kind === "reply") setSaved(c.output);
      onToast(t("Changes saved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Something went wrong"));
    } finally {
      setSaving(false);
    }
  };

  const thaiFont = `'${kit.fonts.thai}', sans-serif`;
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={2000}
          placeholder={t("Paste a customer review or chat message here…")}
          className="w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-base outline-none focus:border-studio-accent focus:ring-4 focus:ring-studio-accent/15"
          style={{ fontFamily: `'Inter', ${thaiFont}` }} />
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button key={p.id} type="button" onClick={() => setPlatform(p.id)}
              className={`min-h-9 rounded-full px-3 py-1.5 text-xs transition ${
                platform === p.id ? "bg-studio-ink text-white" : "bg-black/5 text-black/65 hover:bg-black/10"
              }`}>
              {t(p.label)}
            </button>
          ))}
        </div>
        <BigButton onClick={() => make()} disabled={busy} primary>
          {busy ? t("Writing a reply…") : t("💬 Write my reply")}
        </BigButton>
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {result && !busy && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <span className="inline-block rounded-full bg-black/5 px-3 py-1 text-xs font-medium">{t(MOOD[result.sentiment])}</span>
          <EditableText label={`${t("Reply")} (${result.language === "th" ? "ไทย" : "English"})`} value={result.reply}
            onChange={(v) => setResult((r) => (r ? { ...r, reply: v } : r))} onToast={onToast}
            font={result.language === "th" ? thaiFont : undefined} />
          <div className="flex flex-wrap gap-2">
            {(["friendlier", "more formal", "shorter"] as ReplyTweak[]).map((tw) => (
              <button key={tw} type="button" onClick={() => make(tw)} disabled={busy}
                className="min-h-9 rounded-full border border-black/15 px-3 py-1.5 text-xs hover:bg-black/5 disabled:opacity-40">
                ↻ {t(tw)}
              </button>
            ))}
            {result.reply_other && (
              <button type="button" onClick={() => setShowOther((s) => !s)} className="text-xs text-black/50 underline">
                {showOther ? t("Hide other language") : t("Show other language")}
              </button>
            )}
          </div>
          {showOther && (
            <EditableText label={result.language === "th" ? "English" : "ไทย"} value={result.reply_other}
              onChange={(v) => setResult((r) => (r ? { ...r, reply_other: v } : r))} onToast={onToast}
              font={result.language === "th" ? undefined : thaiFont} />
          )}
          {result.tip && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">💡 {result.tip}</p>}
          <SaveEdits dirty={dirty} saving={saving} onSave={save} />
        </motion.div>
      )}
    </div>
  );
}
