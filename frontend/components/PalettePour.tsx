"use client";

import { motion } from "motion/react";
import { useState } from "react";
import type { PaletteColor } from "@/lib/types";

/** Each colour falls in as a drop, then "pours" up to fill its swatch. */
export default function PalettePour({ palette, delay = 0 }: { palette: PaletteColor[]; delay?: number }) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(hex);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      /* clipboard blocked: ignore */
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {palette.map((c, i) => {
        const d = delay + i * 0.18;
        return (
          <button
            key={c.role}
            type="button"
            onClick={() => copy(c.hex)}
            className="group relative text-left"
            title="Click to copy"
          >
            <div className="relative h-36 overflow-hidden rounded-2xl border border-black/10 bg-white">
              {/* the drop */}
              <motion.span
                className="absolute left-1/2 top-0 block h-6 w-6 -translate-x-1/2 rounded-full"
                style={{ background: c.hex }}
                initial={{ y: -40, scale: 0.6, opacity: 0 }}
                animate={{ y: [-40, 110, 110], scale: [0.6, 1, 2.5], opacity: [0, 1, 0] }}
                transition={{ delay: d, duration: 0.7, times: [0, 0.6, 1], ease: "easeIn" }}
              />
              {/* the fill */}
              <motion.div
                className="absolute inset-0 origin-bottom"
                style={{ background: c.hex }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: d + 0.45, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
              <span className="absolute bottom-2 right-2 rounded-full bg-white/85 px-2 py-0.5 font-mono text-xs opacity-0 transition group-hover:opacity-100">
                {copied === c.hex ? "Copied!" : c.hex}
              </span>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: d + 0.8 }}
              className="mt-2"
            >
              <p className="text-sm font-semibold">{c.name}</p>
              <p className="text-xs uppercase tracking-wide text-black/45">
                {c.role} · {c.hex}
              </p>
            </motion.div>
          </button>
        );
      })}
    </div>
  );
}
