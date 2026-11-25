"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import PromoTool from "@/components/daily/PromoTool";
import ReplyTool from "@/components/daily/ReplyTool";
import TodayPostTool from "@/components/daily/TodayPostTool";
import RequireAuth from "@/components/RequireAuth";
import Spinner from "@/components/Spinner";
import Tilt from "@/components/Tilt";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { timeAgo, type BrandKit, type BrandSummary, type Creation, type DailyContext, type DayEvent } from "@/lib/types";
import { useGoogleFonts } from "@/lib/useGoogleFonts";

type Tool = "post" | "promo" | "reply";
const TOOLS: { id: Tool; icon: string; title: string; text: string }[] = [
  { id: "post", icon: "📅", title: "Today's post", text: "A ready post with caption, in one tap" },
  { id: "promo", icon: "🏷️", title: "Promo maker", text: "Poster, story, Facebook & LINE message" },
  { id: "reply", icon: "💬", title: "Reply helper", text: "Answer reviews and chats nicely" },
];
const GREETING = { morning: ["Good morning", "อรุณสวัสดิ์"], afternoon: ["Good afternoon", "สวัสดีตอนบ่าย"], evening: ["Good evening", "สวัสดีตอนเย็น"] };
const EVENT_ICON: Record<DayEvent["kind"], string> = { holiday: "🎉", observance: "📌", sale: "🛍️", payday: "💰" };
const STORE_KEY = "palettai.brand";

function TodayScreen() {
  const { user, refresh } = useAuth();
  const [ctx, setCtx] = useState<DailyContext | null>(null);
  const [brands, setBrands] = useState<BrandSummary[] | null>(null);
  const [brandId, setBrandId] = useState<number | null>(null);
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [tool, setTool] = useState<Tool | null>(null);
  const [event, setEvent] = useState<string | null>(null);
  const [reuse, setReuse] = useState<Creation | null>(null);
  const [history, setHistory] = useState<Creation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  useGoogleFonts(kit ? [kit.fonts.heading, kit.fonts.body, kit.fonts.thai] : []);

  const show = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2400);
  }, []);

  useEffect(() => {
    Promise.all([api.today(), api.listBrands()])
      .then(([c, b]) => {
        setCtx(c);
        setBrands(b);
        let saved: number | null = null;
        try {
          saved = Number(localStorage.getItem(STORE_KEY)) || null;
        } catch {
          /* storage blocked */
        }
        setBrandId(b.find((x) => x.id === saved)?.id ?? b[0]?.id ?? null);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!brandId) return;
    setKit(null);
    try {
      localStorage.setItem(STORE_KEY, String(brandId));
    } catch {
      /* storage blocked */
    }
    api.getBrand(brandId)
      .then((b) => setKit((b.versions.find((v) => v.version === b.current_version) ?? b.versions[b.versions.length - 1]).kit))
      .catch((e) => setError(e.message));
    api.creations(brandId).then(setHistory).catch(() => setHistory([]));
  }, [brandId]);

  const open = (t: Tool, opts: { event?: string | null; reuse?: Creation | null } = {}) => {
    setTool(t);
    setEvent(opts.event ?? null);
    setReuse(opts.reuse ?? null);
    setTimeout(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const onCreated = (c: Creation) => {
    setHistory((h) => [c, ...h].slice(0, 20));
    refresh();
  };

  if (error) return <p className="mx-auto max-w-xl rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>;
  if (!ctx || !brands) return <Spinner label="Getting your day ready…" />;

  if (brands.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border-2 border-dashed border-black/15 p-10 text-center">
        <p className="text-5xl">☀️</p>
        <h1 className="mt-4 font-display text-2xl font-bold">Let&apos;s set up your brand first</h1>
        <p className="mt-2 text-black/55">Your daily posts, promos and replies use your brand&apos;s colours, fonts and voice.</p>
        <Link href="/brands/new" className="mt-6 inline-block rounded-full bg-studio-accent px-6 py-3 font-semibold text-on-accent">
          Create my brand ✨
        </Link>
      </div>
    );
  }

  const [hello, helloTh] = GREETING[ctx.part_of_day];
  const events = [...ctx.today, ...ctx.upcoming];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Greeting */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-black/50">
            {ctx.weekday} · {new Date(ctx.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" })} ·{" "}
            <span style={{ fontFamily: "'Prompt', sans-serif" }}>{ctx.weekday_th}</span>
          </motion.p>
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            {hello}, {user?.name?.split(" ")[0]} {ctx.part_of_day === "evening" ? "🌙" : "☀️"}
          </motion.h1>
          <p className="mt-1 text-black/55" style={{ fontFamily: "'Prompt', sans-serif" }}>{helloTh} · What shall we post today?</p>
        </div>
        {brands.length > 1 ? (
          <select value={brandId ?? ""} onChange={(e) => { setBrandId(Number(e.target.value)); setTool(null); }}
            className="min-h-11 rounded-2xl border border-black/10 bg-white px-4 text-sm font-medium">
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        ) : (
          <Link href={`/brands/${brands[0].id}`} className="rounded-2xl border border-black/10 bg-white px-4 py-2 text-sm font-medium">
            {brands[0].name} →
          </Link>
        )}
      </section>

      {/* Events */}
      {events.length > 0 && (
        <section className="flex gap-2 overflow-x-auto pb-1">
          {ctx.days_to_payday === 0 && (
            <span className="shrink-0 rounded-2xl bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700">💰 Payday today: people are spending!</span>
          )}
          {events.map((e, i) => (
            <motion.button key={`${e.date}-${e.name_en}`} type="button" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }} onClick={() => open("post", { event: e.name_en })}
              title="Make a post about this"
              className="shrink-0 rounded-2xl border border-black/10 bg-white px-4 py-2 text-left text-sm transition hover:border-studio-accent">
              <span className="font-medium">{EVENT_ICON[e.kind]} {e.name_en}</span>
              <span className="block text-xs text-black/45">
                {e.days_until === 0 ? "Today" : e.days_until === 1 ? "Tomorrow" : `In ${e.days_until} days`} · tap for a post
              </span>
            </motion.button>
          ))}
        </section>
      )}

      {/* Tools */}
      <section className="grid gap-4 sm:grid-cols-3">
        {TOOLS.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08 }}>
            <Tilt className="h-full rounded-3xl" max={8}>
              <button type="button" onClick={() => open(t.id)}
                className={`flex h-full w-full flex-col items-start rounded-3xl border-2 p-5 text-left transition active:scale-[0.98] ${
                  tool === t.id ? "border-studio-accent bg-studio-accent/5" : "border-black/10 bg-white hover:border-black/25"
                }`}>
                <span className="text-4xl">{t.icon}</span>
                <span className="mt-3 font-display text-xl font-bold">{t.title}</span>
                <span className="mt-1 text-sm text-black/55">{t.text}</span>
              </button>
            </Tilt>
          </motion.div>
        ))}
      </section>

      {/* Active tool */}
      <div ref={panel} className="scroll-mt-24">
        <AnimatePresence mode="wait">
          {tool && (
            <motion.section key={`${tool}-${reuse?.id ?? "new"}-${brandId}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} className="rounded-3xl border border-black/10 bg-white/70 p-5 sm:p-7">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold">{TOOLS.find((t) => t.id === tool)?.icon} {TOOLS.find((t) => t.id === tool)?.title}</h2>
                <button type="button" onClick={() => setTool(null)} className="rounded-full px-3 py-1 text-sm text-black/45 hover:bg-black/5">✕</button>
              </div>
              {!kit || !brandId ? (
                <Spinner />
              ) : tool === "post" ? (
                <TodayPostTool brandId={brandId} kit={kit} event={event}
                  initial={reuse?.kind === "post" ? reuse : null} onCreated={onCreated} onToast={show} />
              ) : tool === "promo" ? (
                <PromoTool brandId={brandId} kit={kit} initial={reuse?.kind === "promo" ? reuse : null} onCreated={onCreated} onToast={show} />
              ) : (
                <ReplyTool brandId={brandId} kit={kit} initial={reuse?.kind === "reply" ? reuse : null} onCreated={onCreated} onToast={show} />
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* History */}
      {history.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-bold">Recently made</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {history.slice(0, 8).map((c) => (
              <button key={c.id} type="button" onClick={() => open(c.kind, { reuse: c })}
                className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 text-left transition hover:border-black/25">
                <span className="text-2xl">{TOOLS.find((t) => t.id === c.kind)?.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{summary(c)}</span>
                  <span className="text-xs text-black/45">{timeAgo(c.created_at)} · tap to open</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
            <span className="rounded-full bg-studio-ink px-5 py-3 text-center text-sm text-white shadow-xl">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function summary(c: Creation): string {
  if (c.kind === "post") return c.output.headline || c.output.theme || "Post";
  if (c.kind === "promo") return `${c.output.badge ? c.output.badge + " · " : ""}${c.output.headline}`;
  return `Reply: “${c.input.message.slice(0, 60)}”`;
}

export default function TodayPage() {
  return (
    <RequireAuth>
      <TodayScreen />
    </RequireAuth>
  );
}
