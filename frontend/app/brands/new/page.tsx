"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BriefForm from "@/components/BriefForm";
import DesignerDesk from "@/components/DesignerDesk";
import RequireAuth from "@/components/RequireAuth";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Brief } from "@/lib/types";

function NewBrand() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [brief, setBrief] = useState<Brief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (b: Brief) => {
    setBrief(b);
    setError(null);
    setLoading(true);
    try {
      const brand = await api.createBrand(b);
      refresh(); // update "x/20 today" in the nav
      router.push(`/brands/${brand.id}?new=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <DesignerDesk />
        </motion.div>
      ) : (
        <motion.div key="form" exit={{ opacity: 0, y: -20 }}>
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
              Tell us about the business.
            </h1>
            <p className="mt-3 text-lg text-black/60">The more specific you are, the better the brand.</p>
          </div>
          {error && <p className="mx-auto mb-4 max-w-2xl rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <BriefForm onSubmit={generate} initial={brief} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function NewBrandPage() {
  return (
    <RequireAuth>
      <NewBrand />
    </RequireAuth>
  );
}
