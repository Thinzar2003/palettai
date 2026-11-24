"use client";

import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef } from "react";
import BrandIcon from "./BrandIcon";

/**
 * A floating 3D "coin" of the brand mark. It spins slowly on its own;
 * drag it sideways to spin it yourself, and it carries on with momentum.
 */
export default function Logo3D({
  svg,
  monogram,
  primary,
  secondary,
  onPrimary,
  font,
  size = 160,
}: {
  svg?: string | null;
  monogram: string;
  primary: string;
  secondary: string;
  onPrimary: string;
  font: string;
  size?: number;
}) {
  const rotateY = useMotionValue(0);
  const dragging = useRef(false);
  const last = useRef(0);
  const shadowScale = useTransform(rotateY, (r) => 0.75 + 0.25 * Math.abs(Math.cos((r * Math.PI) / 180)));

  useEffect(() => {
    let frame = 0;
    let prev = performance.now();
    const loop = (t: number) => {
      const dt = t - prev;
      prev = t;
      if (!dragging.current) rotateY.set(rotateY.get() + dt * 0.03); // ~30°/s idle spin
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [rotateY]);

  const face = (back: boolean) => (
    <div
      className="absolute inset-0 flex items-center justify-center rounded-full shadow-2xl"
      style={{
        background: back ? primary : `radial-gradient(circle at 30% 25%, #ffffff, ${secondary} 60%)`,
        transform: back ? "rotateY(180deg) translateZ(6px)" : "translateZ(6px)",
        backfaceVisibility: "hidden",
        border: `4px solid ${primary}`,
      }}
    >
      {back ? (
        <span className="font-bold" style={{ color: onPrimary, fontFamily: `'${font}', sans-serif`, fontSize: size * 0.32 }}>
          {monogram}
        </span>
      ) : (
        <BrandIcon svg={svg} monogram={monogram} color={primary} onColor={onPrimary} font={font} size={size * 0.62} />
      )}
    </div>
  );

  return (
    <div className="flex flex-col items-center select-none" style={{ perspective: 900 }}>
      <motion.div
        className="relative cursor-grab active:cursor-grabbing"
        style={{ width: size, height: size, rotateY, rotateX: 8, transformStyle: "preserve-3d" }}
        animate={{ y: [0, -12, 0] }}
        transition={{ y: { duration: 4, repeat: Infinity, ease: "easeInOut" } }}
        onPanStart={() => {
          dragging.current = true;
          last.current = 0;
        }}
        onPan={(_, info) => {
          rotateY.set(rotateY.get() + (info.delta.x * 0.8));
          last.current = info.velocity.x;
        }}
        onPanEnd={() => {
          animate(rotateY, rotateY.get() + last.current * 0.25, {
            type: "spring",
            stiffness: 40,
            damping: 14,
            onComplete: () => (dragging.current = false),
          });
        }}
        title="Drag to spin"
      >
        {/* coin edge: a few stacked discs give it thickness */}
        {[-4, -2, 0, 2, 4].map((z) => (
          <div key={z} className="absolute inset-0 rounded-full" style={{ background: primary, transform: `translateZ(${z}px)`, filter: "brightness(0.8)" }} />
        ))}
        {face(false)}
        {face(true)}
      </motion.div>
      <motion.div
        aria-hidden
        className="mt-6 h-4 rounded-[50%] bg-black/15 blur-md"
        style={{ width: size * 0.8, scaleX: shadowScale }}
      />
    </div>
  );
}
