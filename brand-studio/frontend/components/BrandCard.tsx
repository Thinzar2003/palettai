"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { timeAgo, type BrandSummary } from "@/lib/types";

/** Dashboard card: palette stripes, monogram, name in the brand's own heading font. */
export default function BrandCard({ brand, index }: { brand: BrandSummary; index: number }) {
  const { colors, heading_font, monogram, tagline, on_primary } = brand.preview;
  const primary = colors[0] ?? "#17151f";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ y: -6 }}
    >
      <Link
        href={`/brands/${brand.id}`}
        className="block overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm transition hover:shadow-xl"
      >
        <div className="relative flex h-32">
          {colors.map((c, i) => (
            <motion.div
              key={i}
              className="h-full flex-1 origin-bottom"
              style={{ background: c }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: index * 0.06 + i * 0.05, duration: 0.4 }}
            />
          ))}
          <div
            className="absolute -bottom-6 left-5 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white text-lg font-bold"
            style={{ background: primary, color: on_primary ?? "#fff", fontFamily: `'${heading_font}', sans-serif` }}
          >
            {monogram}
          </div>
          {brand.is_public && (
            <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium">
              🌐 Public
            </span>
          )}
        </div>
        <div className="p-5 pt-8">
          <p className="truncate text-xl font-bold" style={{ fontFamily: `'${heading_font}', sans-serif` }}>
            {brand.name}
          </p>
          <p className="mt-1 line-clamp-1 text-sm text-black/55">{tagline}</p>
          <p className="mt-3 text-xs text-black/40">
            v{brand.current_version} · {brand.version_count} version{brand.version_count === 1 ? "" : "s"} · updated{" "}
            {timeAgo(brand.updated_at)}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
