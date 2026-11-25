"use client";

import { motion } from "motion/react";
import type { LockPart } from "@/lib/types";
import { useT } from "@/lib/i18n";

export const LOCK_LABELS: Record<LockPart, string> = {
  palette: "Colours",
  fonts: "Fonts",
  slogans: "Slogans",
  logo: "Logo",
  story: "Story & tone",
};

/** Choose which parts to keep, then regenerate the rest. */
export default function LockBar({
  locked,
  onToggle,
  onRegenerate,
  busy,
}: {
  locked: LockPart[];
  onToggle: (p: LockPart) => void;
  onRegenerate: () => void;
  busy: boolean;
}) {
  const { t } = useT();
  const parts = Object.keys(LOCK_LABELS) as LockPart[];
  const allLocked = locked.length === parts.length;
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display text-lg font-bold">{t("Love some parts? Lock them 🔒")}</p>
        <p className="text-xs text-black/45">Locked parts stay; the AI redesigns the rest to match.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {parts.map((p) => {
          const on = locked.includes(p);
          return (
            <motion.button
              key={p}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => onToggle(p)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition ${
                on ? "bg-studio-ink text-white" : "border border-black/15 hover:bg-black/5"
              }`}
            >
              <motion.span key={String(on)} initial={{ rotate: -30, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }}>
                {on ? "🔒" : "🔓"}
              </motion.span>
              {t(LOCK_LABELS[p])}
            </motion.button>
          );
        })}
        <motion.button
          type="button"
          disabled={busy || allLocked}
          whileHover={busy || allLocked ? undefined : { scale: 1.03 }}
          whileTap={busy || allLocked ? undefined : { scale: 0.97 }}
          onClick={onRegenerate}
          className="ml-auto rounded-full bg-studio-accent px-5 py-2 text-sm font-semibold text-on-accent shadow-md shadow-studio-accent/30 disabled:opacity-40"
        >
          {busy ? t("Designing…") : locked.length ? t("↻ Regenerate the rest") : t("↻ Regenerate all")}
        </motion.button>
      </div>
    </div>
  );
}
