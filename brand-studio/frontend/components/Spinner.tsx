"use client";

import { motion } from "motion/react";

const COLORS = ["#FF5A36", "#FFC93C", "#18B6C9"];

export default function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24">
      <div className="flex gap-2">
        {COLORS.map((c, i) => (
          <motion.span
            key={c}
            className="block h-3 w-3 rounded-full"
            style={{ background: c }}
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }}
          />
        ))}
      </div>
      {label && <p className="text-sm text-black/50">{label}</p>}
    </div>
  );
}
