"use client";

import { motion } from "motion/react";

/**
 * Page transition: each route rises in from depth.
 * It ends at transform: none (no filter/perspective left behind),
 * so fixed and sticky elements inside pages keep working.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 150, damping: 22 }}
    >
      {children}
    </motion.div>
  );
}
