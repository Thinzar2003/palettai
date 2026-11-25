"use client";

import { toPng } from "html-to-image";
import { useEffect, useState } from "react";
import { downloadDataUrl } from "@/lib/download";
import { useT } from "@/lib/i18n";

/** Big, phone-friendly actions for a finished design: save, share, copy caption. */
export default function ShareBar({
  target,
  filename,
  caption,
  pixelRatio = 3,
  onToast,
}: {
  target: React.RefObject<HTMLDivElement | null>;
  filename: string;
  caption?: string;
  pixelRatio?: number;
  onToast: (msg: string) => void;
}) {
  const { t } = useT();
  const [canShare, setCanShare] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && "share" in navigator), []);

  const render = async () => {
    if (!target.current) throw new Error("Nothing to save");
    return toPng(target.current, { pixelRatio, cacheBust: true });
  };

  const save = async () => {
    setBusy(true);
    try {
      downloadDataUrl(await render(), filename);
      onToast(t("Image saved"));
    } catch {
      onToast(t("Couldn't save the image. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    setBusy(true);
    try {
      const blob = await (await fetch(await render())).blob();
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: caption });
      } else {
        downloadDataUrl(URL.createObjectURL(blob), filename);
        if (caption) await navigator.clipboard.writeText(caption).catch(() => undefined);
        onToast(t("Image saved and caption copied: paste it in your app"));
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") onToast(t("Sharing didn't work. Use Save image instead."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <BigButton onClick={save} disabled={busy} primary>{t("⤓ Save image")}</BigButton>
      {canShare && <BigButton onClick={share} disabled={busy}>{t("↗ Share")}</BigButton>}
      {caption && (
        <BigButton onClick={() => copy(caption, onToast, t("Copied!"), t("Your browser blocked copying. Select the text and copy it manually."))} disabled={busy}>
          {t("⧉ Copy caption")}
        </BigButton>
      )}
    </div>
  );
}

export async function copy(text: string, onToast: (m: string) => void, label = "Copied!",
  blocked = "Your browser blocked copying. Select the text and copy it manually.") {
  try {
    await navigator.clipboard.writeText(text);
    onToast(label);
  } catch {
    onToast(blocked);
  }
}

export function BigButton({
  onClick,
  children,
  disabled,
  primary,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-11 rounded-2xl px-5 py-2.5 text-sm font-semibold transition active:scale-95 disabled:opacity-50 ${
        primary
          ? "bg-studio-accent text-on-accent shadow-md shadow-studio-accent/30"
          : "border border-black/15 bg-white hover:border-black/30"
      }`}
    >
      {children}
    </button>
  );
}

/** A block of ready-to-send text with a copy button. */
export function CopyBox({
  label,
  text,
  onToast,
  font,
}: {
  label: string;
  text: string;
  onToast: (m: string) => void;
  font?: string;
}) {
  if (!text) return null;
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-black/45">{label}</span>
        <button
          type="button"
          onClick={() => copy(text, onToast)}
          className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium hover:bg-black/10 active:scale-95"
        >
          ⧉ Copy
        </button>
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-black/80" style={font ? { fontFamily: font } : undefined}>
        {text}
      </p>
    </div>
  );
}
