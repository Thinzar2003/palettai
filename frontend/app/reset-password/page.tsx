"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import AuthCard, { authButton, authInput } from "@/components/AuthCard";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";

function ResetForm() {
  const { t } = useT();
  const { refresh } = useAuth();
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <AuthCard title={t("Link not valid")}>
        <p className="text-sm text-black/60">{t("This reset link is incomplete. Please request a new one.")}</p>
        <Link href="/forgot-password" className="mt-6 inline-block font-medium text-studio-accent hover:underline">{t("Request a new link")}</Link>
      </AuthCard>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError(t("The two passwords don't match."));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.resetPassword(token, password);
      await refresh();
      router.replace("/today");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Something went wrong"));
      setBusy(false);
    }
  };

  return (
    <AuthCard title={t("Set a new password")}>
      <form onSubmit={submit}>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm text-black/70">{t("New password")}</span>
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password" className={authInput} />
          <span className="mt-1 block text-xs text-black/40">{t("At least 8 characters")}</span>
        </label>
        <label className="mb-6 block">
          <span className="mb-1 block text-sm text-black/70">{t("Confirm new password")}</span>
          <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password" className={authInput} />
        </label>
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}{" "}
            <Link href="/forgot-password" className="font-medium underline">{t("Request a new link")}</Link>
          </div>
        )}
        <button type="submit" disabled={busy} className={authButton}>{busy ? t("Please wait…") : t("Save new password")}</button>
      </form>
    </AuthCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
