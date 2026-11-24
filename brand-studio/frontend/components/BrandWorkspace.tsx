"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ActionButton from "./ActionButton";
import BrandReveal from "./BrandReveal";
import DesignerDesk from "./DesignerDesk";
import LockBar from "./LockBar";
import Spinner from "./Spinner";
import VersionHistory from "./VersionHistory";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { BrandDetail, LockPart } from "@/lib/types";

export default function BrandWorkspace({ id }: { id: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh: refreshUser } = useAuth();

  const [brand, setBrand] = useState<BrandDetail | null>(null);
  const [viewing, setViewing] = useState<number>(0);
  const [locked, setLocked] = useState<LockPart[]>([]);
  const [busy, setBusy] = useState<null | "generating" | "saving">(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [animateVersion, setAnimateVersion] = useState<number | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const show = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const apply = useCallback((b: BrandDetail, animate = false) => {
    setBrand(b);
    setViewing(b.current_version);
    setNameDraft(b.name);
    if (animate) setAnimateVersion(b.current_version);
  }, []);

  useEffect(() => {
    api
      .getBrand(id)
      .then((b) => apply(b, params.get("new") === "1"))
      .catch((e) => setError(e instanceof ApiError && e.status === 404 ? "Brand not found." : e.message));
  }, [id, apply, params]);

  const run = async (kind: "generating" | "saving", fn: () => Promise<BrandDetail | void>, animate = false) => {
    setBusy(kind);
    setError(null);
    try {
      const result = await fn();
      if (result) apply(result, animate);
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  if (error && !brand) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <p className="mb-4 text-lg">{error}</p>
        <Link href="/dashboard" className="text-studio-accent underline">
          Back to my brands
        </Link>
      </div>
    );
  }
  if (!brand) return <Spinner label="Opening your brand…" />;

  const version = brand.versions.find((v) => v.version === viewing) ?? brand.versions[brand.versions.length - 1];
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/b/${brand.slug}` : "";

  const regenerate = async () => {
    await run("generating", () => api.regenerate(brand.id, locked), true);
    refreshUser();
  };

  const toggleShare = async () => {
    const res = await run("saving", () => api.updateBrand(brand.id, { is_public: !brand.is_public }));
    if (res) show(res.is_public ? "Brand is public — anyone with the link can view it" : "Brand is private again");
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      show("Link copied!");
    } catch {
      show(shareUrl);
    }
  };

  const saveName = async () => {
    setEditingName(false);
    if (nameDraft.trim() && nameDraft.trim() !== brand.name) {
      await run("saving", () => api.updateBrand(brand.id, { name: nameDraft.trim() }));
    } else setNameDraft(brand.name);
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${brand.name}" and all its versions? This cannot be undone.`)) return;
    setBusy("saving");
    try {
      await api.deleteBrand(brand.id);
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setBusy(null);
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ name: brand.name, version: version.version, brief: brand.brief, kit: version.kit }, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${brand.slug}-v${version.version}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="mx-auto max-w-6xl">
      {/* Title bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/dashboard" className="text-sm text-black/50 hover:text-black">
          ← My brands
        </Link>
        <span className="text-black/20">/</span>
        {editingName ? (
          <input
            autoFocus
            value={nameDraft}
            maxLength={80}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
            className="rounded-lg border border-studio-accent px-2 py-1 font-display text-xl font-bold outline-none"
          />
        ) : (
          <button onClick={() => setEditingName(true)} title="Rename" className="font-display text-xl font-bold hover:opacity-70">
            {brand.name} <span className="text-sm text-black/30">✎</span>
          </button>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <ActionButton onClick={toggleShare} disabled={!!busy}>
            {brand.is_public ? "🌐 Public" : "🔒 Private"}
          </ActionButton>
          {brand.is_public && <ActionButton onClick={copyLink}>🔗 Copy link</ActionButton>}
          <ActionButton onClick={exportJson}>⤓ Export</ActionButton>
          <ActionButton onClick={remove} variant="danger" disabled={!!busy}>
            Delete
          </ActionButton>
        </div>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-8">
          <LockBar
            locked={locked}
            onToggle={(p) => setLocked((l) => (l.includes(p) ? l.filter((x) => x !== p) : [...l, p]))}
            onRegenerate={regenerate}
            busy={busy === "generating"}
          />

          {viewing !== brand.current_version && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              You're previewing v{viewing}. Restore it from the history panel to make it current.
            </p>
          )}

          <AnimatePresence mode="wait">
            {busy === "generating" ? (
              <motion.div key="desk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DesignerDesk />
              </motion.div>
            ) : (
              <motion.div key={`v${version.version}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <BrandReveal kit={version.kit} pace={animateVersion === version.version ? 1 : 0.15} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <VersionHistory
            versions={brand.versions}
            current={brand.current_version}
            viewing={viewing}
            onView={setViewing}
            onRestore={(v) => run("saving", () => api.restore(brand.id, v))}
            busy={!!busy}
          />
          <div className="rounded-3xl border border-black/10 bg-white p-5 text-sm">
            <p className="mb-2 font-display text-lg font-bold">Brief</p>
            <p className="text-black/70">{brand.brief.description}</p>
            {brand.brief.vibes.length > 0 && <p className="mt-2 text-black/50">Vibe: {brand.brief.vibes.join(", ")}</p>}
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center"
          >
            <span className="rounded-full bg-studio-ink px-5 py-3 text-sm text-white shadow-xl">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
