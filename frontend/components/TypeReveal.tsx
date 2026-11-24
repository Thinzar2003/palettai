"use client";

import { motion } from "motion/react";
import { useMemo } from "react";

/**
 * Reveals text one grapheme at a time.
 * Uses Intl.Segmenter so Thai vowels and tone marks stay attached to their consonant
 * (splitting a Thai string by code unit would break characters like "ที่").
 */
export default function TypeReveal({
  text,
  delay = 0,
  speed = 0.035,
  className,
  style,
}: {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const parts = useMemo(() => {
    if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
      const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
      return Array.from(seg.segment(text), (s) => s.segment);
    }
    return Array.from(text);
  }, [text]);

  return (
    <span className={className} style={style} aria-label={text}>
      {parts.map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          initial={{ opacity: 0, y: "0.4em", filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: delay + i * speed, duration: 0.3 }}
          style={{ display: "inline-block", whiteSpace: "pre" }}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  );
}
