"use client";

import { motion } from "motion/react";
import { useT } from "@/lib/i18n";

/** ไทย / EN switch for the interface (content language is set per brand). */
export default function LangToggle() {
  const { lang, setLang } = useT();
  return (
    <div className="relative flex rounded-full border border-black/10 bg-white p-0.5 text-xs font-semibold" role="group" aria-label="Language">
      {(["th", "en"] as const).map((l) => (
        <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l}
          className={`relative z-10 rounded-full px-2.5 py-1.5 transition ${lang === l ? "text-white" : "text-black/55"}`}
          style={l === "th" ? { fontFamily: "'Prompt', sans-serif" } : undefined}>
          {lang === l && (
            <motion.span layoutId="lang-pill" className="absolute inset-0 -z-10 rounded-full bg-studio-ink"
              transition={{ type: "spring", stiffness: 400, damping: 30 }} />
          )}
          {l === "th" ? "ไทย" : "EN"}
        </button>
      ))}
    </div>
  );
}
