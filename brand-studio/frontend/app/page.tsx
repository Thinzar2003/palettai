"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useGoogleFonts } from "@/lib/useGoogleFonts";

// Sample brands that cycle in the hero preview.
const SAMPLES = [
  { name: "Cha Yen House", th: "ชาเย็นแท้ หวานกำลังดี", tag: "Sip the sunshine", font: "Fraunces",
    colors: ["#C8682C", "#F2D9B8", "#4E7A3A", "#FFF8EF", "#3B2418"] },
  { name: "Lotus & Clay", th: "งานปั้นจากใจ", tag: "Handmade calm for your table", font: "Playfair Display",
    colors: ["#0F4C44", "#D9C29A", "#B8892E", "#F7F3EA", "#141414"] },
  { name: "Pixel Pad Thai", th: "อร่อยทุกคำ", tag: "Street food, upgraded", font: "Bricolage Grotesque",
    colors: ["#FF8A1F", "#FF6FAE", "#18B6C9", "#FFF9F2", "#22223B"] },
];

const FEATURES = [
  { icon: "🎨", title: "Accessible palettes", text: "Five-colour palettes, auto-checked and fixed for WCAG contrast." },
  { icon: "🔤", title: "Thai + English type", text: "Font pairings that include real Thai typefaces like Kanit and Prompt." },
  { icon: "🔒", title: "Lock & regenerate", text: "Keep the parts you love, let the AI redesign the rest to match." },
  { icon: "🕓", title: "Version history", text: "Every generation is saved. Compare and restore any version." },
  { icon: "🌐", title: "Share with clients", text: "One click turns a brand into a public guidelines page." },
  { icon: "⚡", title: "Free AI, resilient", text: "Gemini, Groq and OpenRouter with automatic fallback." },
];

export default function Landing() {
  const { user } = useAuth();
  useGoogleFonts(["Fraunces", "Playfair Display"]);
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % SAMPLES.length), 3200);
    return () => clearInterval(t);
  }, []);
  const s = SAMPLES[i];
  const cta = user ? "/brands/new" : "/register";

  return (
    <div className="mx-auto max-w-6xl">
      {/* Hero */}
      <section className="grid items-center gap-12 py-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mb-4 inline-block rounded-full bg-studio-accent/10 px-3 py-1 text-sm font-medium text-studio-accent">
            AI brand designer · ไทย / English
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl"
          >
            Describe your business.
            <br />
            <span className="text-studio-accent">Get a brand.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="mt-6 max-w-lg text-lg text-black/60">
            Logo, colours, fonts and slogans in Thai &amp; English, with mockups, version history and a shareable
            brand page.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-8 flex flex-wrap gap-3">
            <Link href={cta}
              className="rounded-full bg-studio-accent px-7 py-4 font-display text-lg font-semibold text-white shadow-lg shadow-studio-accent/30 transition hover:brightness-105">
              {user ? "Create a brand ✨" : "Start free ✨"}
            </Link>
            {user ? (
              <Link href="/dashboard" className="rounded-full border border-black/15 px-7 py-4 font-display text-lg">
                My brands
              </Link>
            ) : (
              <Link href="/login" className="rounded-full border border-black/15 px-7 py-4 font-display text-lg">
                Log in
              </Link>
            )}
          </motion.div>
        </div>

        {/* Live preview card */}
        <div className="relative h-[420px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={s.name}
              initial={{ opacity: 0, rotate: -4, y: 30 }}
              animate={{ opacity: 1, rotate: 2, y: 0 }}
              exit={{ opacity: 0, rotate: 6, y: -30 }}
              transition={{ type: "spring", stiffness: 120, damping: 16 }}
              className="absolute inset-0 overflow-hidden rounded-[2rem] shadow-2xl"
              style={{ background: s.colors[3] }}
            >
              <div className="flex h-1/2">
                {s.colors.map((c, k) => (
                  <motion.div key={c} className="flex-1 origin-top" style={{ background: c }}
                    initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.15 + k * 0.08, duration: 0.5 }} />
                ))}
              </div>
              <div className="p-8" style={{ color: s.colors[4] }}>
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                  className="text-4xl font-bold" style={{ fontFamily: `'${s.font}', serif`, color: s.colors[0] }}>
                  {s.name}
                </motion.p>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-2 text-lg">
                  {s.tag}
                </motion.p>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
                  className="mt-1 text-lg opacity-70" style={{ fontFamily: "'Prompt', sans-serif" }}>
                  {s.th}
                </motion.p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <h2 className="mb-8 text-center font-display text-3xl font-bold">How it works</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {["Write a short brief about the business", "Watch the AI design your brand kit", "Lock, refine, save and share"].map(
            (t, k) => (
              <motion.div key={t} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: k * 0.1 }}
                className="rounded-3xl border border-black/10 bg-white p-6">
                <span className="font-display text-5xl font-extrabold text-studio-accent/30">0{k + 1}</span>
                <p className="mt-2 text-lg font-medium">{t}</p>
              </motion.div>
            ),
          )}
        </div>
      </section>

      {/* Features */}
      <section className="pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, k) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: k * 0.06 }} whileHover={{ y: -4 }}
              className="rounded-3xl border border-black/10 bg-white p-6">
              <p className="text-3xl">{f.icon}</p>
              <p className="mt-3 font-display text-lg font-bold">{f.title}</p>
              <p className="mt-1 text-sm text-black/60">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
