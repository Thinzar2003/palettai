"use client";

import { motion } from "motion/react";

const PORTFOLIO = "https://thinzar2003.github.io/Thinzar-_-portfolio/";
const GITHUB = "https://github.com/Thinzar2003";
const REPO = "https://github.com/Thinzar2003/palettai";

/** Site footer with credit to the creator. */
export default function Footer() {
  return (
    <footer className="no-print relative z-10 mt-16 border-t border-black/5">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm sm:flex-row sm:px-8">
        <p className="text-black/55">
          <span className="font-display font-extrabold text-black">
            Palett<span className="text-studio-accent">ai</span>
          </span>{" "}
          · Designed &amp; built by{" "}
          <motion.a
            href={PORTFOLIO}
            target="_blank"
            rel="noopener"
            whileHover={{ y: -2 }}
            className="inline-block font-semibold text-black underline decoration-studio-accent decoration-2 underline-offset-4 hover:text-studio-accent"
          >
            Thinzar Su Hlaing
          </motion.a>
        </p>
        <nav className="flex flex-wrap items-center gap-2">
          <FooterLink href={PORTFOLIO}>🌐 Portfolio</FooterLink>
          <FooterLink href={GITHUB}>GitHub</FooterLink>
          <FooterLink href={REPO}>Source code</FooterLink>
        </nav>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-black/65 transition hover:border-studio-accent hover:text-studio-accent"
    >
      {children}
    </motion.a>
  );
}
