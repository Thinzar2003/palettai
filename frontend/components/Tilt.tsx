"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";

/**
 * 3D tilt that follows the cursor, with a moving glare highlight.
 * Wrap any card: <Tilt><div>…</div></Tilt>
 */
export default function Tilt({
  children,
  max = 12,
  glare = true,
  className,
  scale = 1.02,
}: {
  children: React.ReactNode;
  max?: number; // max rotation in degrees
  glare?: boolean;
  className?: string;
  scale?: number;
}) {
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 220, damping: 18 };
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring);
  const s = useSpring(1, spring);
  const gx = useTransform(px, (v) => `${v * 100}%`);
  const gy = useTransform(py, (v) => `${v * 100}%`);
  const glareBg = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.35), transparent 55%)`;
  const glareOpacity = useSpring(0, spring);

  return (
    <motion.div
      className={`relative ${className ?? ""}`}
      style={{ rotateX, rotateY, scale: s, transformPerspective: 900, transformStyle: "preserve-3d" }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        s.set(scale);
        glareOpacity.set(1);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
        s.set(1);
        glareOpacity.set(0);
      }}
    >
      {children}
      {glare && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-soft-light"
          style={{ background: glareBg, opacity: glareOpacity, borderRadius: "inherit" }}
        />
      )}
    </motion.div>
  );
}
