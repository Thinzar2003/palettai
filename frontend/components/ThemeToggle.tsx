"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "@/lib/theme";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.85, rotate: 15 }}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-black/10 bg-white"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ y: 20, rotate: -90, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          exit={{ y: -20, rotate: 90, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="text-base"
        >
          {dark ? "🌙" : "☀️"}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
