"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import PopLogo from "./PopLogo";
import ThemeToggle from "./ThemeToggle";

export default function NavBar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm transition ${
        pathname.startsWith(href) ? "bg-black/5 font-medium" : "text-black/60 hover:text-black"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-studio-paper/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href={user ? "/dashboard" : "/"} aria-label="Palettai home">
          <PopLogo />
        </Link>

        {!loading && (
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <>
                {link("/dashboard", "My brands")}
                <span
                  className="hidden rounded-full bg-black/5 px-3 py-1 text-xs text-black/50 sm:inline"
                  title="AI generations used in the last 24 hours"
                >
                  {user.generations_today}/{user.daily_limit} today
                </span>
                <Link
                  href="/brands/new"
                  className="rounded-full bg-studio-ink px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-85"
                >
                  + New brand
                </Link>
                <div className="group relative ml-1">
                  <button className="flex h-9 w-9 items-center justify-center rounded-full bg-studio-accent text-sm font-bold text-on-accent">
                    {user.name.slice(0, 1).toUpperCase()}
                  </button>
                  <div className="invisible absolute right-0 top-11 w-52 rounded-2xl border border-black/10 bg-white p-2 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                    <p className="px-3 pt-2 text-sm font-medium">{user.name}</p>
                    <p className="truncate px-3 pb-2 text-xs text-black/50">{user.email}</p>
                    <button
                      onClick={async () => {
                        await logout();
                        router.push("/");
                      }}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-black/5"
                    >
                      Log out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {link("/login", "Log in")}
                <Link
                  href="/register"
                  className="rounded-full bg-studio-accent px-4 py-1.5 text-sm font-medium text-on-accent"
                >
                  Sign up free
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
