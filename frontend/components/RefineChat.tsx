"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { useT } from "@/lib/i18n";

const SUGGESTIONS = ["Make it warmer", "More premium", "More playful", "Shorter slogans", "Greener palette", "More Thai feeling"];

/** Ask the AI to change the brand in plain words. */
export default function RefineChat({ onSend, busy }: { onSend: (instruction: string) => void; busy: boolean }) {
  const { t } = useT();
  const [text, setText] = useState("");
  const send = (value: string) => {
    const v = value.trim();
    if (v.length < 3 || busy) return;
    onSend(v);
    setText("");
  };
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-5">
      <p className="mb-3 font-display text-lg font-bold">{t("Ask the AI to change it 💬")}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        className="flex gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          disabled={busy}
          placeholder={t("e.g. “make the colours warmer and the slogans funnier”")}
          className="min-w-0 flex-1 rounded-full border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:border-studio-accent disabled:opacity-50"
        />
        <motion.button
          type="submit"
          disabled={busy || text.trim().length < 3}
          whileTap={{ scale: 0.95 }}
          className="rounded-full bg-studio-ink px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "…" : t("Send")}
        </motion.button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => send(s)}
            className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/65 transition hover:bg-black/10 disabled:opacity-40"
          >
            {t(s)}
          </button>
        ))}
      </div>
    </div>
  );
}
