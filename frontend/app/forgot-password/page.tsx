"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import AuthCard, { authButton, authInput } from "@/components/AuthCard";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n";

export default function ForgotPasswordPage() {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Something went wrong"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title={t("Forgot your password?")}>
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div key="sent" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <motion.p className="text-5xl" animate={{ y: [0, -8, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>📬</motion.p>
            <p className="mt-4 font-semibold">{t("Check your email")}</p>
            <p className="mt-2 text-sm text-black/60">
              {t("If an account exists for {email}, we've sent a link to set a new password. It works for 30 minutes.", { email })}
            </p>
            <p className="mt-2 text-xs text-black/45">{t("Can't find it? Check your spam or promotions folder.")}</p>
            <Link href="/login" className="mt-6 inline-block text-sm font-medium text-studio-accent hover:underline">{t("Back to log in")}</Link>
          </motion.div>
        ) : (
          <motion.form key="form" onSubmit={submit} exit={{ opacity: 0 }}>
            <p className="mb-5 text-sm text-black/60">{t("Enter your account email and we'll send you a link to set a new password.")}</p>
            <label className="mb-5 block">
              <span className="mb-1 block text-sm text-black/70">{t("Email")}</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={authInput} />
            </label>
            {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={busy} className={authButton}>{busy ? t("Please wait…") : t("Send reset link")}</button>
            <p className="mt-6 text-center text-sm">
              <Link href="/login" className="text-studio-accent hover:underline">{t("Back to log in")}</Link>
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthCard>
  );
}
