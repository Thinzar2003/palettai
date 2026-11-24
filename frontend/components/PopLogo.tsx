"use client";

import { motion } from "motion/react";
import { useState } from "react";

const WORD = "Palett";
const AI = "ai";

/**
 * The Palettai wordmark. Letters pop up one by one with a springy overshoot;
 * hover a letter and it jumps, click the logo to replay the pop.
 */
export default function PopLogo({ size = "text-xl" }: { size?: string }) {
  const [run, setRun] = useState(0);
  const letters = [...WORD.split("").map((c) => ({ c, ai: false })), ...AI.split("").map((c) => ({ c, ai: true }))];

  return (
    <span
      key={run}
      onClick={() => setRun((r) => r + 1)}
      className={`inline-flex items-baseline font-display font-extrabold tracking-tight ${size}`}
      aria-label="Palettai"
    >
      {letters.map(({ c, ai }, i) => (
        <motion.span
          key={i}
          aria-hidden
          className={`inline-block ${ai ? "text-studio-accent" : ""}`}
          initial={{ opacity: 0, y: 18, scale: 0.2, rotate: i % 2 ? 25 : -25 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
          transition={{ delay: 0.05 + i * 0.06, type: "spring", stiffness: 500, damping: 14 }}
          whileHover={{ y: -6, scale: 1.25, rotate: i % 2 ? 8 : -8, transition: { type: "spring", stiffness: 600, damping: 10 } }}
        >
          {c}
        </motion.span>
      ))}
      {/* the "ai" gets a little sparkle that pops in last */}
      <motion.span
        aria-hidden
        className="ml-0.5 inline-block text-[0.6em] text-studio-accent"
        initial={{ opacity: 0, scale: 0, rotate: -180 }}
        animate={{ opacity: 1, scale: [0, 1.6, 1], rotate: 0 }}
        transition={{ delay: 0.15 + letters.length * 0.06, duration: 0.5 }}
      >
        ✦
      </motion.span>
    </span>
  );
}
