"use client";

import { motion } from "motion/react";
import { timeAgo, type VersionOut } from "@/lib/types";
import { useT } from "@/lib/i18n";

/** Timeline of versions: newest first; click to preview, restore old ones. */
export default function VersionHistory({
  versions,
  current,
  viewing,
  onView,
  onRestore,
  busy,
}: {
  versions: VersionOut[];
  current: number;
  viewing: number;
  onView: (v: number) => void;
  onRestore: (v: number) => void;
  busy: boolean;
}) {
  const { t } = useT();
  const list = [...versions].reverse();
  return (
    <div className="rounded-3xl border border-black/10 bg-white p-5">
      <p className="mb-4 font-display text-lg font-bold">{t("History")}</p>
      <ol className="relative space-y-1 border-l border-black/10 pl-4">
        {list.map((v, i) => {
          const active = v.version === viewing;
          return (
            <motion.li
              key={v.version}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="relative"
            >
              <span
                className="absolute -left-[22px] top-3 h-3 w-3 rounded-full border-2 border-white"
                style={{ background: v.kit.palette[0]?.hex ?? "#999" }}
              />
              <button
                type="button"
                onClick={() => onView(v.version)}
                className={`w-full rounded-xl px-3 py-2 text-left transition ${active ? "bg-black/5" : "hover:bg-black/[0.03]"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">v{v.version}</span>
                  {v.version === current && (
                    <span className="rounded-full bg-emerald-100 px-2 text-[10px] font-medium text-emerald-700">{t("CURRENT")}</span>
                  )}
                  <span className="ml-auto flex gap-0.5">
                    {v.kit.palette.map((c) => (
                      <span key={c.role} className="h-3 w-3 rounded-sm" style={{ background: c.hex }} />
                    ))}
                  </span>
                </div>
                <p className="text-xs text-black/50">
                  {v.note} · {timeAgo(v.created_at)}
                </p>
              </button>
              {active && v.version !== current && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRestore(v.version)}
                  className="mb-2 ml-3 mt-1 rounded-full border border-black/15 px-3 py-1 text-xs hover:bg-black/5 disabled:opacity-40"
                >
                  {t("↩ Restore this version")}
                </button>
              )}
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
