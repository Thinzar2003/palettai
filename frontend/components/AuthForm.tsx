"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { QUOTES } from "@/lib/quotes";
import TerminalQuote from "./TerminalQuote";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { user, login, register } = useAuth();
  const { t } = useT();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/today";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace(target);
  }, [user, router, target]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "register") await register(name, email, password);
      else await login(email, password);
      router.replace(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const isRegister = mode === "register";
  const input =
    "w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-studio-accent focus:ring-4 focus:ring-studio-accent/15";

  return (
    <div className="mx-auto grid max-w-5xl items-center gap-10 py-6 md:grid-cols-2">
      {/* Decorative side */}
      <div className="hidden md:block">
        <TerminalQuote quotes={QUOTES} size="md" />
        <p className="mt-4 text-lg text-black/60">
          {isRegister
            ? t("Create a free account to save brands, track versions and share them with clients.")
            : t("Welcome back. Your brands are waiting for you.")}
        </p>
        <div className="mt-10 flex gap-3">
          {["#FF5A36", "#FFC93C", "#18B6C9", "#4E7A3A", "#22223B"].map((c, i) => (
            <motion.div
              key={c}
              className="h-24 w-14 rounded-2xl shadow-lg"
              style={{ background: c }}
              initial={{ y: 40, opacity: 0, rotate: -8 }}
              animate={{ y: [0, -8, 0], opacity: 1, rotate: (i - 2) * 4 }}
              transition={{ y: { duration: 3, repeat: Infinity, delay: i * 0.2 }, opacity: { delay: i * 0.08 } }}
            />
          ))}
        </div>
      </div>

      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-black/10 bg-white p-8 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.35)]"
      >
        <h2 className="mb-6 font-display text-2xl font-bold">{isRegister ? t("Create your account") : t("Log in")}</h2>
        {isRegister && (
          <label className="mb-4 block">
            <span className="mb-1 block text-sm text-black/70">{t("Your name")}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} className={input} />
          </label>
        )}
        <label className="mb-4 block">
          <span className="mb-1 block text-sm text-black/70">{t("Email")}</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className={input} />
        </label>
        <label className="mb-6 block">
          <span className="mb-1 block text-sm text-black/70">{t("Password")}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={isRegister ? 8 : 1}
            autoComplete={isRegister ? "new-password" : "current-password"}
            className={input}
          />
          {isRegister && <span className="mt-1 block text-xs text-black/40">{t("At least 8 characters")}</span>}
          {!isRegister && (
            <Link href="/forgot-password" className="mt-2 inline-block text-xs text-studio-accent hover:underline">
              {t("Forgot password?")}
            </Link>
          )}
        </label>

        {error && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-2xl bg-studio-accent py-3.5 font-display text-lg font-semibold text-on-accent shadow-lg shadow-studio-accent/30 transition hover:brightness-105 disabled:opacity-50"
        >
          {busy ? t("Please wait…") : isRegister ? t("Create account") : t("Log in")}
        </button>

        <p className="mt-6 text-center text-sm text-black/55">
          {isRegister ? t("Already have an account? ") : t("New here? ")}
          <Link
            href={`${isRegister ? "/login" : "/register"}${next ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-medium text-studio-accent hover:underline"
          >
            {isRegister ? t("Log in") : t("Create an account")}
          </Link>
        </p>
      </motion.form>
    </div>
  );
}
