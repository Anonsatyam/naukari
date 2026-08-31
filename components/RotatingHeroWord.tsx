"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const WORDS: { text: string; colorVar: string }[] = [
  { text: "Jobs", colorVar: "--color-primary" },
  { text: "Results", colorVar: "--color-success" },
  { text: "Admit Cards", colorVar: "--color-accent-orange" },
];

export default function RotatingHeroWord({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) return;

    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % WORDS.length);
    }, 2000);

    return () => clearInterval(id);
  }, []);

  const word = WORDS[index];

  return (
    <span
      key={index}
      className={cn("inline-block animate-state-cycle", className)}
      style={{ color: `var(${word.colorVar})` }}
    >
      {word.text}
    </span>
  );
}
