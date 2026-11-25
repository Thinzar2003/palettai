"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { DailyContext, DayEvent } from "@/lib/types";

// [greeting, Thai line, question]: Bangkok time decides which one shows.
const GREETING = {
  morning: ["Good morning", "อรุณสวัสดิ์", "What shall we post today?"],
  afternoon: ["Good afternoon", "สวัสดีตอนบ่าย", "Time for an afternoon post?"],
  evening: ["Good evening", "สวัสดีตอนเย็น", "Anything to share tonight?"],
  night: ["Still up", "ดึกแล้วนะ", "Let's plan tomorrow's post, then rest 😴"],
} as const;
const EVENT_ICON: Record<DayEvent["kind"], string> = { holiday: "🎉", observance: "📌", sale: "🛍️", payday: "💰" };
const WINDOW = 21; // days shown ahead; the countdown ring fills across this window

/* ── Sky icon: sun (morning), sun + cloud (afternoon), moon + stars (evening) ── */
export function SkyIcon({ part, size = 64 }: { part: DailyContext["part_of_day"]; size?: number }) {
  const calm = useReducedMotion();
  const loop = (duration: number, extra: object = {}) =>
    calm ? { duration: 0 } : { duration, repeat: Infinity, ease: "linear" as const, ...extra };

  if (part === "evening") {
    return (
      <motion.svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="overflow-visible"
        initial={{ opacity: 0, y: -16, scale: 0.6 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 12 }} whileHover={{ scale: 1.1 }}>
        <defs>
          <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFB547" /><stop offset="1" stopColor="#FF5A36" /></linearGradient>
          <clipPath id="horizon"><rect x="0" y="0" width="64" height="40" /></clipPath>
        </defs>
        <motion.circle cx="32" cy="40" r="22" fill="#FF7A3D" opacity="0.18" clipPath="url(#horizon)"
          animate={calm ? undefined : { r: [22, 26, 22] }} transition={loop(4, { ease: "easeInOut" })} />
        {/* the sun slowly sinks a little and rises back */}
        <motion.g clipPath="url(#horizon)">
          <motion.circle cx="32" r="15" fill="url(#dusk)" initial={{ cy: 32 }}
            animate={calm ? { cy: 36 } : { cy: [33, 38, 33] }} transition={loop(6, { ease: "easeInOut" })} />
        </motion.g>
        {[[40, 2.5, 52], [46, 2, 40], [52, 1.6, 28]].map(([y, w, len], i) => (
          <motion.rect key={i} x={32 - len / 2} y={y} width={len} height={w} rx={w / 2} fill="#FF8A3D" opacity={0.9 - i * 0.25}
            animate={calm ? undefined : { x: [32 - len / 2 - 2, 32 - len / 2 + 2, 32 - len / 2 - 2] }}
            transition={loop(3 + i, { ease: "easeInOut" })} />
        ))}
      </motion.svg>
    );
  }

  if (part === "night") {
    return (
      <motion.svg width={size} height={size} viewBox="0 0 64 64" aria-hidden
        initial={{ opacity: 0, rotate: -40, scale: 0.6 }} animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 160, damping: 12 }} whileHover={{ rotate: -12, scale: 1.08 }}>
        <defs>
          <radialGradient id="moon" cx="35%" cy="35%"><stop offset="0" stopColor="#FFF7D6" /><stop offset="1" stopColor="#F5C451" /></radialGradient>
        </defs>
        <motion.circle cx="30" cy="34" r="22" fill="#F5C451" opacity="0.18"
          animate={calm ? undefined : { r: [22, 25, 22] }} transition={loop(4, { ease: "easeInOut" })} />
        <path d="M40 12a20 20 0 1 0 12 30 16 16 0 1 1-12-30z" fill="url(#moon)" />
        {[[50, 14, 2.2, 0], [56, 30, 1.6, 0.6], [12, 14, 1.8, 1.2]].map(([x, y, r, d], i) => (
          <motion.circle key={i} cx={x} cy={y} r={r} fill="#FFE9A8"
            animate={calm ? undefined : { opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
            transition={loop(2, { delay: d, ease: "easeInOut" })} style={{ transformOrigin: `${x}px ${y}px` }} />
        ))}
      </motion.svg>
    );
  }

  return (
    <motion.svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="overflow-visible"
      initial={{ opacity: 0, y: 20, scale: 0.5 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 160, damping: 11 }} whileHover={{ scale: 1.12 }}>
      <defs>
        <radialGradient id="sun" cx="40%" cy="38%"><stop offset="0" stopColor="#FFE680" /><stop offset="1" stopColor="#FFB020" /></radialGradient>
      </defs>
      <motion.circle cx="32" cy="32" r="18" fill="#FFB020" opacity="0.25"
        animate={calm ? undefined : { r: [18, 24, 18], opacity: [0.25, 0.08, 0.25] }} transition={loop(3, { ease: "easeInOut" })} />
      <motion.g animate={calm ? undefined : { rotate: 360 }} transition={loop(24)} style={{ transformOrigin: "32px 32px" }}>
        {Array.from({ length: 10 }, (_, i) => (
          <rect key={i} x="30.5" y="2" width="3" height="9" rx="1.5" fill="#FF8A1F" transform={`rotate(${i * 36} 32 32)`} />
        ))}
      </motion.g>
      <circle cx="32" cy="32" r="14" fill="url(#sun)" />
      {part === "afternoon" && (
        <motion.g animate={calm ? undefined : { x: [-4, 6, -4] }} transition={loop(6, { ease: "easeInOut" })}>
          <path d="M30 50a7 7 0 0 1 7-7 9 9 0 0 1 17 2 6 6 0 0 1 0 12H34a6 6 0 0 1-4-7z" fill="#FFFFFF" stroke="#E6E1D8" strokeWidth="1.5" />
        </motion.g>
      )}
    </motion.svg>
  );
}

/* ── Greeting: words pop in, the name gets a hand-drawn underline ── */
export function Greeting({ ctx, name }: { ctx: DailyContext; name: string }) {
  const [hello, helloTh, question] = GREETING[ctx.part_of_day];
  const words = `${hello},`.split(" ");
  const dateLine = `${ctx.weekday} · ${new Date(ctx.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`;

  return (
    <div>
      <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="text-sm text-black/50">
        {dateLine} · <span style={{ fontFamily: "'Prompt', sans-serif" }}>{ctx.weekday_th}</span>
      </motion.p>
      <h1 className="flex flex-wrap items-center gap-x-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
        {words.map((w, i) => (
          <motion.span key={i} className="inline-block"
            initial={{ opacity: 0, y: 34, rotate: -8 }} animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ delay: 0.1 + i * 0.09, type: "spring", stiffness: 420, damping: 18 }}>
            {w}
          </motion.span>
        ))}
        <motion.span className="relative inline-block text-studio-accent"
          initial={{ opacity: 0, y: 34, scale: 0.7 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.1 + words.length * 0.09, type: "spring", stiffness: 420, damping: 14 }}
          whileHover={{ rotate: [-2, 2, -1, 0], transition: { duration: 0.4 } }}>
          {name}{ctx.part_of_day === "night" ? "?" : ""}
          <svg className="absolute -bottom-2 left-0 h-3 w-full overflow-visible" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden>
            <motion.path d="M2 8 C 20 2, 40 12, 60 6 S 90 4, 98 7" fill="none" stroke="currentColor" strokeWidth="3"
              strokeLinecap="round" vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ delay: 0.45 + words.length * 0.09, duration: 0.7, ease: "easeInOut" }} />
          </svg>
        </motion.span>
        <SkyIcon part={ctx.part_of_day} size={56} />
      </h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
        className="mt-2 text-black/55">
        <span style={{ fontFamily: "'Prompt', sans-serif" }}>{helloTh}</span> · {question}
      </motion.p>
    </div>
  );
}

/* ── Event strip: payday banner + chips with countdown rings ── */
export function EventStrip({ ctx, onPick }: { ctx: DailyContext; onPick: (eventName: string) => void }) {
  const calm = useReducedMotion();
  const paydayToday = ctx.days_to_payday === 0;
  // The banner already says "payday today", so don't repeat it as a chip.
  const events = [...ctx.today, ...ctx.upcoming].filter((e) => !(paydayToday && e.kind === "payday" && e.days_until === 0));
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = () => {
    const el = scroller.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [events.length]);

  const scroll = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * 260, behavior: "smooth" });

  if (!paydayToday && events.length === 0) return null;
  return (
    <div className="relative">
      <div ref={scroller} onScroll={measure}
        className="no-scrollbar flex gap-3 overflow-x-auto scroll-smooth py-2 pr-10">
        {paydayToday && (
          <motion.button type="button" onClick={() => onPick("Payday")}
            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }} whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }}
            className="relative shrink-0 overflow-hidden rounded-2xl bg-emerald-100 px-4 py-2.5 text-left text-sm font-medium text-emerald-700">
            <motion.span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent"
              animate={calm ? undefined : { x: ["0%", "500%"] }}
              transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.2, ease: "easeInOut" }} />
            <span className="relative flex items-center gap-2">
              <motion.span className="inline-block text-lg"
                animate={calm ? undefined : { y: [0, -6, 0], rotateY: [0, 180, 360] }}
                transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1.2 }}>
                💰
              </motion.span>
              <span>
                Payday today: people are spending!
                <span className="block text-xs font-normal opacity-75">Tap for a payday post</span>
              </span>
            </span>
          </motion.button>
        )}

        {events.map((e, i) => {
          const progress = Math.max(0.06, 1 - e.days_until / WINDOW);
          return (
            <motion.button key={`${e.date}-${e.name_en}`} type="button" onClick={() => onPick(e.name_en)}
              initial={{ opacity: 0, x: 40, scale: 0.92 }} animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.07, type: "spring", stiffness: 260, damping: 20 }}
              whileHover="hover" whileTap={{ scale: 0.96 }}
              variants={{ hover: { y: -4 } }}
              title="Make a post about this"
              className="group flex shrink-0 items-center gap-3 rounded-2xl border border-black/10 bg-white px-3.5 py-2 text-left text-sm shadow-sm transition-colors hover:border-studio-accent">
              {/* countdown ring */}
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden>
                  <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-black/10" />
                  <motion.circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                    className="text-studio-accent" initial={{ pathLength: 0 }} animate={{ pathLength: progress }}
                    transition={{ delay: 0.35 + i * 0.07, duration: 0.9, ease: "easeOut" }} />
                </svg>
                <motion.span className="relative text-base" variants={{ hover: { rotate: [0, -18, 14, -8, 0], scale: 1.15 } }}
                  transition={{ duration: 0.5 }}>
                  {EVENT_ICON[e.kind]}
                </motion.span>
              </span>
              <span>
                <span className="flex items-center gap-1.5 font-medium">
                  {e.name_en}
                  {e.days_until === 0 && (
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-studio-accent opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-studio-accent" />
                    </span>
                  )}
                </span>
                <span className="block text-xs text-black/45">
                  {e.days_until === 0 ? "Today" : e.days_until === 1 ? "Tomorrow" : `In ${e.days_until} days`} · tap for a post
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* faded edges + arrows instead of a scrollbar */}
      {edges.left && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-studio-paper to-transparent" />
          <ScrollArrow dir={-1} onClick={() => scroll(-1)} />
        </>
      )}
      {edges.right && (
        <>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-studio-paper to-transparent" />
          <ScrollArrow dir={1} onClick={() => scroll(1)} />
        </>
      )}
    </div>
  );
}

function ScrollArrow({ dir, onClick }: { dir: 1 | -1; onClick: () => void }) {
  return (
    <motion.button type="button" onClick={onClick} aria-label={dir === 1 ? "More events" : "Previous events"}
      initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
      className={`absolute top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white text-lg shadow-md sm:flex ${
        dir === 1 ? "right-1" : "left-1"
      }`}>
      {dir === 1 ? "›" : "‹"}
    </motion.button>
  );
}
