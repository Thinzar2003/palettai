"use client";

import { motion } from "motion/react";

/** Small centred card used by the forgot / reset password pages. */
export default function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-md rounded-3xl border border-black/10 bg-white p-8 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.35)]">
      <h1 className="mb-6 font-display text-2xl font-bold">{title}</h1>
      {children}
    </motion.div>
  );
}

export const authInput =
  "w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-studio-accent focus:ring-4 focus:ring-studio-accent/15";
export const authButton =
  "w-full rounded-2xl bg-studio-accent py-3.5 font-display text-lg font-semibold text-on-accent shadow-lg shadow-studio-accent/30 transition hover:brightness-105 disabled:opacity-50";
