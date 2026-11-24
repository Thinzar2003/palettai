"use client";

import { motion } from "motion/react";
import { useState } from "react";
import type { Brief, Language } from "@/lib/types";

const VIBES = ["Warm", "Minimal", "Playful", "Premium", "Natural", "Bold", "Retro", "Techy"];

const EXAMPLES: Brief[] = [
  {
    business_name: "Cha Yen House",
    description: "A cozy Thai milk tea shop near a university in Pathum Thani, with homemade toppings",
    industry: "Food & beverage",
    audience: "University students and young office workers",
    vibes: ["Warm", "Playful"],
    language: "both",
  },
  {
    business_name: "Lotus & Clay",
    description: "Handmade ceramic tableware inspired by Thai lotus ponds, sold online",
    industry: "Home & craft",
    audience: "Design lovers aged 25-45",
    vibes: ["Natural", "Premium"],
    language: "both",
  },
];

const empty: Brief = { business_name: "", description: "", industry: "", audience: "", vibes: [], language: "both" };

export default function BriefForm({
  onSubmit,
  initial,
}: {
  onSubmit: (b: Brief) => void;
  initial?: Brief | null;
}) {
  const [brief, setBrief] = useState<Brief>(initial ?? empty);
  const set = <K extends keyof Brief>(k: K, v: Brief[K]) => setBrief((b) => ({ ...b, [k]: v }));
  const toggleVibe = (v: string) =>
    set("vibes", brief.vibes.includes(v) ? brief.vibes.filter((x) => x !== v) : [...brief.vibes, v].slice(0, 3));

  const valid = brief.business_name.trim().length > 0 && brief.description.trim().length >= 5;

  return (
    <motion.form
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(brief);
      }}
      className="mx-auto w-full max-w-2xl rounded-3xl border border-black/10 bg-white/80 p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.35)] backdrop-blur sm:p-8"
    >
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-black/50">Try an example:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.business_name}
            type="button"
            onClick={() => setBrief(ex)}
            className="rounded-full border border-black/10 px-3 py-1 transition hover:border-black/30 hover:bg-black/5"
          >
            {ex.business_name}
          </button>
        ))}
      </div>

      <Field label="Business name">
        <input
          value={brief.business_name}
          onChange={(e) => set("business_name", e.target.value)}
          placeholder="e.g. Cha Yen House"
          maxLength={60}
          className={inputCls}
        />
      </Field>

      <Field label="What does your business do?">
        <textarea
          value={brief.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="A cozy Thai milk tea shop near a university…"
          rows={3}
          maxLength={600}
          className={`${inputCls} resize-none`}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Industry (optional)">
          <input value={brief.industry ?? ""} onChange={(e) => set("industry", e.target.value)} className={inputCls} />
        </Field>
        <Field label="Who are your customers? (optional)">
          <input value={brief.audience ?? ""} onChange={(e) => set("audience", e.target.value)} className={inputCls} />
        </Field>
      </div>

      <Field label="Vibe (pick up to 3)">
        <div className="flex flex-wrap gap-2">
          {VIBES.map((v) => {
            const on = brief.vibes.includes(v);
            return (
              <motion.button
                key={v}
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={() => toggleVibe(v)}
                className={`rounded-full px-4 py-1.5 text-sm transition ${
                  on ? "bg-studio-ink text-white" : "border border-black/15 hover:bg-black/5"
                }`}
              >
                {v}
              </motion.button>
            );
          })}
        </div>
      </Field>

      <Field label="Language">
        <div className="inline-flex rounded-full bg-black/5 p-1 text-sm">
          {(
            [
              ["both", "ไทย + English"],
              ["en", "English"],
              ["th", "ไทย"],
            ] as [Language, string][]
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => set("language", val)}
              className={`rounded-full px-4 py-1.5 transition ${brief.language === val ? "bg-white shadow" : "text-black/60"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </Field>

      <motion.button
        type="submit"
        disabled={!valid}
        whileHover={valid ? { scale: 1.02 } : undefined}
        whileTap={valid ? { scale: 0.98 } : undefined}
        className="mt-2 w-full rounded-2xl bg-studio-accent py-4 font-display text-lg font-semibold text-on-accent shadow-lg shadow-studio-accent/30 transition disabled:cursor-not-allowed disabled:opacity-40"
      >
        Create my brand ✨
      </motion.button>
    </motion.form>
  );
}

const inputCls =
  "w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-studio-accent focus:ring-4 focus:ring-studio-accent/15";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-5 block">
      <span className="mb-2 block text-sm font-medium text-black/70">{label}</span>
      {children}
    </label>
  );
}
