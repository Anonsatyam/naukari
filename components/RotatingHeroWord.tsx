"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const WORD_KEYS: { key: "jobs" | "results" | "admitCards"; colorVar: string }[] = [
  { key: "jobs", colorVar: "--color-primary" },
  { key: "results", colorVar: "--color-success" },
  { key: "admitCards", colorVar: "--color-accent-orange" },
];

export default function RotatingHeroWord({ className }: { className?: string }) {
  const t = useTranslations("heroWords");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) return;

    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % WORD_KEYS.length);
    }, 2000);

    return () => clearInterval(id);
  }, []);

  const word = WORD_KEYS[index];

  return (
    <span
      key={index}
      className={cn("inline-block animate-state-cycle", className)}
      style={{ color: `var(${word.colorVar})` }}
    >
      {t(word.key)}
    </span>
  );
}
