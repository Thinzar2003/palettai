"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

const STEPS = [
  "Reading your brief…",
  "Finding your brand personality…",
  "Mixing the colour palette…",
  "Pairing Thai & English fonts…",
  "Writing slogans…",
  "Sketching the logo…",
];

const SWATCHES = ["#FF5A36", "#FFC93C", "#18B6C9", "#4E7A3A", "#22223B"];

/** Loading state: a little "designer's desk" instead of a spinner. */
export default function DesignerDesk() {
  const { t } = useT();
  const [i, setI] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setI((x) => (x + 1) % STEPS.length), 1600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <div className="relative mb-10 h-40 w-64">
        {/* sketch paper */}
        <motion.div
          className="absolute inset-0 rounded-2xl border border-black/10 bg-white text-studio-ink shadow-xl"
          animate={{ rotate: [-2, 2, -2] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg viewBox="0 0 256 160" className="h-full w-full">
            <motion.circle
              cx="80" cy="80" r="36" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: [0, 1, 1, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.45, 0.8, 1] }}
            />
            <motion.path
              d="M136 64 H216 M136 84 H196 M136 104 H206" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: [0, 1, 1, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, delay: 0.4, times: [0, 0.45, 0.8, 1] }}
            />
          </svg>
        </motion.div>
        {/* bouncing colour drops */}
        <div className="absolute -bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {SWATCHES.map((c, k) => (
            <motion.span
              key={c}
              className="block h-5 w-5 rounded-full shadow"
              style={{ background: c }}
              animate={{ y: [0, -14, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: k * 0.12, ease: "easeInOut" }}
            />
          ))}
        </div>
      </div>

      <div className="h-8">
        <AnimatePresence mode="wait">
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="font-display text-lg"
          >
            {t(STEPS[i])}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
