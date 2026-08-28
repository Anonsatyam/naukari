"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Each word gets its own color, cycling in this fixed order — Jobs,
// Results, Admit Cards being the site's three actual content types
// (unlike the old RotatingStateName, which cycled through all 28
// Indian states even though the site only ever served Bihar; this
// only ever cycles within what the site genuinely covers).
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

    // Stay on the first word instead of cycling, for people who've
    // asked for reduced motion.
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
