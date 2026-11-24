"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import BrandCard from "@/components/BrandCard";
import RequireAuth from "@/components/RequireAuth";
import Spinner from "@/components/Spinner";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { BrandSummary } from "@/lib/types";
import { useGoogleFonts } from "@/lib/useGoogleFonts";

function Dashboard() {
  const { user } = useAuth();
  const [brands, setBrands] = useState<BrandSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.listBrands().then(setBrands).catch((e) => setError(e.message));
  }, []);

  const fonts = Array.from(new Set((brands ?? []).map((b) => b.preview.heading_font).filter(Boolean))) as string[];
  useGoogleFonts(fonts);

  const visible = (brands ?? []).filter((b) => b.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-black/50">สวัสดี, {user?.name} 👋</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">My brands</h1>
        </div>
        {brands && brands.length > 3 && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search brands…"
            className="w-64 rounded-full border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:border-studio-accent"
          />
        )}
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {!brands && !error && <Spinner label="Loading your brands…" />}

      {brands && brands.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-lg rounded-3xl border-2 border-dashed border-black/15 p-12 text-center"
        >
          <p className="text-5xl">🎨</p>
          <h2 className="mt-4 font-display text-2xl font-bold">No brands yet</h2>
          <p className="mt-2 text-black/55">Describe a business and get a full brand kit in seconds.</p>
          <Link
            href="/brands/new"
            className="mt-6 inline-block rounded-full bg-studio-accent px-6 py-3 font-semibold text-on-accent shadow-lg shadow-studio-accent/30"
          >
            Create your first brand ✨
          </Link>
        </motion.div>
      )}

      {brands && brands.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ y: -6 }}>
            <Link
              href="/brands/new"
              className="flex h-full min-h-60 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-black/15 text-black/50 transition hover:border-studio-accent hover:text-studio-accent"
            >
              <span className="text-4xl">+</span>
              <span className="mt-2 font-medium">New brand</span>
            </Link>
          </motion.div>
          {visible.map((b, i) => (
            <BrandCard key={b.id} brand={b} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}
