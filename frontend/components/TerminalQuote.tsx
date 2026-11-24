"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

export interface Quote {
  text: string;
  thai?: boolean;
}

/** Split into graphemes so Thai vowels/tone marks are typed together with their consonant. */
function graphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

/**
 * Terminal-style rotating quote: a prompt line, then the quote typed out character by character
 * with a blinking block cursor, held for a moment, deleted, and the next one typed.
 */
export default function TerminalQuote({
  quotes,
  typeSpeed = 45,
  deleteSpeed = 18,
  hold = 3200,
  size = "lg",
}: {
  quotes: Quote[];
  typeSpeed?: number;
  deleteSpeed?: number;
  hold?: number;
  size?: "md" | "lg";
}) {
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting">("typing");
  const quote = quotes[index];
  const chars = useMemo(() => graphemes(quote.text), [quote.text]);
  const quoteClass = (q: Quote) =>
    `font-display font-extrabold leading-[1.08] tracking-tight ${size === "lg" ? "text-4xl sm:text-6xl" : "text-3xl sm:text-5xl"}`;
  const quoteStyle = (q: Quote): React.CSSProperties | undefined =>
    q.thai ? { fontFamily: "'Prompt', sans-serif", fontWeight: 600 } : undefined;

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (phase === "typing") {
      if (count < chars.length) t = setTimeout(() => setCount((c) => c + 1), typeSpeed + Math.random() * 40);
      else t = setTimeout(() => setPhase("holding"), 50);
    } else if (phase === "holding") {
      t = setTimeout(() => setPhase("deleting"), hold);
    } else {
      if (count > 0) t = setTimeout(() => setCount((c) => c - 1), deleteSpeed);
      else {
        setIndex((i) => (i + 1) % quotes.length);
        setPhase("typing");
      }
    }
    return () => clearTimeout(t);
  }, [phase, count, chars.length, typeSpeed, deleteSpeed, hold, quotes.length]);

  return (
    <div>
      {/* prompt line */}
      <p className="mb-4 font-mono text-sm text-black/45">
        <span className="text-studio-accent">➜</span> <span className="text-emerald-600">~/palettai</span>{" "}
        <span>quote --random</span>
        <span className="ml-2 rounded bg-black/5 px-1.5 py-0.5 text-[10px]">
          {index + 1}/{quotes.length}
        </span>
      </p>

      {/* The quote, typed. Every quote is also rendered invisibly in the same grid cell,
          so the box is exactly as tall as the longest quote: no empty gap, no jumping. */}
      <div className="grid">
        {quotes.map((q, k) => (
          <blockquote key={k} aria-hidden className={`invisible col-start-1 row-start-1 ${quoteClass(q)}`} style={quoteStyle(q)}>
            “{q.text}
            <span className="ml-1 inline-block w-[0.45em]" />
          </blockquote>
        ))}
        <blockquote
          className={`col-start-1 row-start-1 ${quoteClass(quote)}`}
          style={quoteStyle(quote)}
          aria-live="polite"
          aria-label={quote.text}
        >
          <span aria-hidden className="text-studio-accent">“</span>
          <span aria-hidden>{chars.slice(0, count).join("")}</span>
          <motion.span
            aria-hidden
            className="ml-1 inline-block h-[0.85em] w-[0.45em] translate-y-[0.12em] bg-studio-accent align-baseline"
            animate={{ opacity: phase === "typing" || phase === "deleting" ? 1 : [1, 1, 0, 0] }}
            transition={phase === "holding" ? { duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] } : { duration: 0 }}
          />
        </blockquote>
      </div>

      {/* signature pops in once the quote is complete */}
      <div className="mt-2 h-6">
        <AnimatePresence>
          {phase === "holding" && (
            <motion.p
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
              className="font-mono text-sm text-black/50"
            >
              — Palettai, your AI brand designer
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}