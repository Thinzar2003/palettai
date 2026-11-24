"use client";

import { motion } from "motion/react";

export default function ActionButton({
  onClick,
  children,
  variant = "default",
  disabled,
  title,
}: {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "default" | "primary" | "danger";
  disabled?: boolean;
  title?: string;
}) {
  const styles = {
    default: "border border-black/15 bg-white hover:border-black/30",
    primary: "bg-studio-accent text-on-accent shadow-md shadow-studio-accent/30",
    danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
  }[variant];
  return (
    <motion.button
      type="button"
      title={title}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${styles}`}
    >
      {children}
    </motion.button>
  );
}
