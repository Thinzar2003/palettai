"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Brief, ImportOut } from "@/lib/types";
import { useT } from "@/lib/i18n";

/**
 * "Already have a business online?" Paste a website or Facebook page link (or a description)
 * and the brief fills itself in, with the shop's current colours and fonts as a starting point.
 * Lives inside the brief <form>, so it never submits it: buttons are type="button" and Enter is handled here.
 */
export default function ImportPanel({
  onImported,
  onReferenceChange,
}: {
  onImported: (brief: Brief) => void;
  onReferenceChange: (reference: string | null) => void;
}) {
  const { t } = useT();
  const { refresh } = useAuth();
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportOut | null>(null);
  const [keepIdentity, setKeepIdentity] = useState(true);

  const run = async () => {
    if (busy) return;
    if (!url.trim() && text.trim().length < 20) {
      setError(t("Paste a link, or a short description (20+ characters)."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const out = await api.importBrief(url.trim() || null, text.trim() || null);
      setResult(out);
      setKeepIdentity(true);
      onImported(out.brief);
      refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("Couldn't read that page");
      setError(msg);
      if (/paste|description|login|JavaScript/i.test(msg)) setShowPaste(true);
    } finally {
      setBusy(false);
    }
  };

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault(); // don't submit the brief form
      run();
    }
  };

  const input =
    "w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-studio-accent focus:ring-4 focus:ring-studio-accent/15";

  return (
    <div className="mb-8 rounded-2xl border border-dashed border-studio-accent/40 bg-studio-accent/[0.04] p-5">
      <p className="font-display text-lg font-bold">{t("Already have a business online? 🌐")}</p>
      <p className="mb-3 text-sm text-black/55">
        Paste your website or Facebook page. We&apos;ll fill in the brief and refresh your current look.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={onEnter}
          placeholder={t("https://your-shop.com  or  facebook.com/yourpage")}
          maxLength={500}
          disabled={busy}
          className={input}
        />
        <motion.button
          type="button"
          onClick={run}
          disabled={busy}
          whileTap={{ scale: 0.96 }}
          className="shrink-0 rounded-xl bg-studio-ink px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? t("Reading…") : t("Read my page")}
        </motion.button>
      </div>

      <button
        type="button"
        onClick={() => setShowPaste((s) => !s)}
        className="mt-2 text-xs text-black/50 underline hover:text-black"
      >
        {showPaste ? t("Hide") : t("No website? Paste a description instead")}
      </button>

      <AnimatePresence>
        {showPaste && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={3000}
              disabled={busy}
              placeholder={t("e.g. Our Facebook 'About' text, or: Family-run Burmese teahouse near Rangsit University since 2019…")}
              className={`${input} mt-2 resize-none text-sm`}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {busy && (
        <div className="mt-3 flex items-center gap-2 text-sm text-black/55">
          {["#FF5A36", "#FFC93C", "#18B6C9"].map((c, i) => (
            <motion.span key={c} className="h-2 w-2 rounded-full" style={{ background: c }}
              animate={{ y: [0, -6, 0] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.12 }} />
          ))}
          {t("Reading the page and filling in your brief…")}
        </div>
      )}

      {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      <AnimatePresence>
        {result && !busy && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-4 rounded-xl border border-black/10 bg-white p-4 text-sm">
            <p className="font-semibold">
              {result.found.title ? t("✓ Brief filled in from “{title}”. Check it below.", { title: result.found.title }) : t("✓ Brief filled in. Check it below.")}
            </p>
            {(result.found.colors.length > 0 || result.found.fonts.length > 0) && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {result.found.colors.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="mr-1 text-xs text-black/50">{t("Current colours")}</span>
                    {result.found.colors.map((c) => (
                      <motion.span key={c} title={c} initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="h-5 w-5 rounded-md border border-black/10" style={{ background: c }} />
                    ))}
                  </div>
                )}
                {result.found.fonts.length > 0 && (
                  <span className="text-xs text-black/50">{t("Fonts:")} {result.found.fonts.join(", ")}</span>
                )}
              </div>
            )}
            {result.brief.reference && (
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-black/70">
                <input
                  type="checkbox"
                  checked={keepIdentity}
                  onChange={(e) => {
                    setKeepIdentity(e.target.checked);
                    onReferenceChange(e.target.checked ? result.brief.reference ?? null : null);
                  }}
                  className="h-4 w-4 accent-[var(--color-studio-accent)]"
                />
                {t("Refresh my current look")} <span className="text-xs text-black/40">(untick for a completely new brand)</span>
              </label>
            )}
            {result.found.from_facebook && (
              <p className="mt-2 text-xs text-black/45">
                {t("Facebook only shares a little without logging in. Add details to the description below if needed.")}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
