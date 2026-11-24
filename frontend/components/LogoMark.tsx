"use client";

import { motion } from "motion/react";

/**
 * Stage-1 logo: an animated monogram badge + wordmark set in the real brand font.
 * (Stage 3 swaps the badge for an AI-generated icon; the text always stays a real font.)
 */
export default function LogoMark({
  name,
  iconSvg,
  badge,
  monogram,
  font,
  color,
  onColor,
  textColor,
  size = 72,
  animate = true,
  delay = 0,
}: {
  name: string;
  iconSvg?: string | null; // selected AI icon (sanitised SVG)
  badge?: string; // background disc behind the icon, e.g. on coloured cards
  monogram: string;
  font: string;
  color: string;
  onColor: string;
  textColor: string;
  size?: number;
  animate?: boolean;
  delay?: number;
}) {
  const r = size / 2;
  return (
    <div className="flex items-center gap-4">
      {iconSvg ? (
        <motion.span
          aria-hidden
          className="inline-flex items-center justify-center rounded-full [&>svg]:h-full [&>svg]:w-full"
          style={{ width: size, height: size, background: badge ?? "transparent", padding: badge ? size * 0.12 : 0 }}
          initial={animate ? { scale: 0, rotate: -120 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay, type: "spring", stiffness: 200, damping: 14 }}
          // sanitised server-side (backend/app/svg.py)
          dangerouslySetInnerHTML={{ __html: iconSvg }}
        />
      ) : (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <motion.circle
            cx={r} cy={r} r={r - 3} fill="none" stroke={color} strokeWidth={3}
            initial={animate ? { pathLength: 0, rotate: -90 } : false}
            animate={{ pathLength: 1, rotate: -90 }}
            transition={{ delay, duration: 0.9, ease: "easeInOut" }}
            style={{ originX: "50%", originY: "50%" }}
          />
          <motion.circle
            cx={r} cy={r} r={r - 8} fill={color}
            initial={animate ? { scale: 0 } : false}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.6, type: "spring", stiffness: 260, damping: 16 }}
            style={{ originX: "50%", originY: "50%" }}
          />
          <motion.text
            x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
            fill={onColor} fontSize={size * 0.36} fontWeight={700}
            style={{ fontFamily: `'${font}', sans-serif` }}
            initial={animate ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.9 }}
          >
            {monogram}
          </motion.text>
        </svg>
      )}
      {name && (
      <motion.span
        initial={animate ? { opacity: 0, x: -10 } : false}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: delay + 1 }}
        style={{ fontFamily: `'${font}', sans-serif`, color: textColor, fontSize: size * 0.42 }}
        className="font-bold leading-none tracking-tight"
      >
        {name}
      </motion.span>
      )}
    </div>
  );
}
