"use client";

import { motion } from "motion/react";
import LogoMark from "./LogoMark";
import Tilt from "./Tilt";
import { selectedIconSvg } from "./BrandIcon";
import { colorOf, type BrandKit } from "@/lib/types";
import { useT } from "@/lib/i18n";

/** Template mockups filled with the brand's real colours, fonts and logo. */
export default function Mockups({ kit, delay = 0 }: { kit: BrandKit; delay?: number }) {
  const primary = colorOf(kit, "primary");
  const secondary = colorOf(kit, "secondary");
  const accent = colorOf(kit, "accent");
  const bg = colorOf(kit, "background");
  const text = colorOf(kit, "text");
  const slogan = kit.slogans[0] ?? { en: kit.tagline, th: "" };
  const heading = `'${kit.fonts.heading}', sans-serif`;
  const icon = selectedIconSvg(kit);
  const thai = `'${kit.fonts.thai}', sans-serif`;

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Business card */}
      <TiltCard delay={delay}>
        <div className="flex aspect-[1.75] flex-col justify-between rounded-2xl p-6 shadow-xl" style={{ background: primary }}>
          <LogoMark name="" iconSvg={icon} badge={bg} monogram={kit.logo.monogram} font={kit.fonts.heading} color={kit.on_primary}
            onColor={primary} textColor={kit.on_primary} size={44} animate={false} />
          <div style={{ color: kit.on_primary }}>
            <p className="text-xl font-bold" style={{ fontFamily: heading }}>{kit.brand_name}</p>
            <p className="text-xs opacity-80">{kit.tagline}</p>
          </div>
        </div>
        <Caption>{"Business card"}</Caption>
      </TiltCard>

      {/* Instagram post */}
      <TiltCard delay={delay + 0.15}>
        <div className="relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-2xl p-6 text-center shadow-xl"
          style={{ background: bg, color: text }}>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-90" style={{ background: secondary }} />
          <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full opacity-90" style={{ background: accent }} />
          <p className="relative text-2xl font-bold leading-tight" style={{ fontFamily: heading, color: primary }}>
            {slogan.en}
          </p>
          {slogan.th && (
            <p className="relative mt-2 text-lg" style={{ fontFamily: thai }}>{slogan.th}</p>
          )}
          <p className="relative mt-4 text-xs uppercase tracking-[0.2em] opacity-70">@{kit.brand_name.toLowerCase().replace(/\s+/g, "")}</p>
        </div>
        <Caption>{"Instagram post"}</Caption>
      </TiltCard>

      {/* Cup */}
      <TiltCard delay={delay + 0.3}>
        <div className="flex aspect-square items-end justify-center rounded-2xl p-6 shadow-xl" style={{ background: secondary }}>
          <div className="relative h-[80%] w-[55%]">
            <div className="absolute inset-x-[-6%] top-0 h-[8%] rounded-md" style={{ background: text }} />
            <div className="absolute inset-x-0 bottom-0 top-[8%] flex flex-col items-center justify-center gap-2 rounded-b-[28%] [clip-path:polygon(0_0,100%_0,88%_100%,12%_100%)]"
              style={{ background: bg }}>
              <div className="h-1/3 w-full" style={{ background: primary, opacity: 0.12 }} />
              <LogoMark name="" iconSvg={icon} monogram={kit.logo.monogram} font={kit.fonts.heading} color={primary}
                onColor={kit.on_primary} textColor={primary} size={48} animate={false} />
              <p className="text-sm font-bold" style={{ fontFamily: heading, color: primary }}>{kit.brand_name}</p>
            </div>
          </div>
        </div>
        <Caption>{"Packaging"}</Caption>
      </TiltCard>
    </div>
  );
}

function TiltCard({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: "spring" }}>
      <Tilt max={14} className="rounded-2xl">{children}</Tilt>
    </motion.div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  return <p className="mt-3 text-center text-xs uppercase tracking-widest text-black/45">{typeof children === "string" ? t(children) : children}</p>;
}
