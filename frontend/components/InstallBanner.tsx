"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
const DISMISS_KEY = "palettai.install.dismissed";
const REMIND_AFTER_DAYS = 14;

/** Registers the service worker, then offers "Add to Home Screen" (Android/desktop prompt, iPhone instructions). */
export default function InstallBanner() {
  const { t } = useT();
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);
  const [howTo, setHowTo] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);

    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dismissedAt = 0;
    try {
      dismissedAt = Number(localStorage.getItem(DISMISS_KEY)) || 0;
    } catch {
      /* storage blocked */
    }
    if (standalone || Date.now() - dismissedAt < REMIND_AFTER_DAYS * 86400_000) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) {
      setIos(true);
      setShow(true);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallEvent);
      setShow(true);
    };
    const onInstalled = () => setShow(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* storage blocked */
    }
  };

  const install = async () => {
    if (ios || !prompt) {
      setHowTo(true);
      return;
    }
    await prompt.prompt();
    const choice = await prompt.userChoice.catch(() => null);
    setPrompt(null);
    if (choice?.outcome === "accepted") setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0, y: -12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12 }}
          className="flex flex-wrap items-center gap-3 rounded-2xl border border-studio-accent/30 bg-studio-accent/[0.06] p-3 pr-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <motion.img src="/icons/icon-192.png" alt="" className="h-11 w-11 rounded-xl"
            animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 3 }} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{t("Add Palettai to your home screen")}</p>
            <p className="text-xs text-black/55">{howTo && ios ? t("On iPhone: tap Share ⎋ then “Add to Home Screen”.") : t("Open it like an app, every morning.")}</p>
          </div>
          <button type="button" onClick={install}
            className="min-h-10 rounded-xl bg-studio-accent px-4 text-sm font-semibold text-on-accent active:scale-95">
            {ios ? t("How?") : t("Install")}
          </button>
          <button type="button" onClick={dismiss} className="text-xs text-black/45 underline">{t("Not now")}</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
