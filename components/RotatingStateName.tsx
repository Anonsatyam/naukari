"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Alphabetical (A → Z) list of Indian states.
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export default function RotatingStateName({ className }: { className?: string }) {
  const [index, setIndex] = useState(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return prefersReducedMotion ? INDIAN_STATES.indexOf("Bihar") : 0;
  });

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Stay on Bihar — the state the platform actually serves today —
    // instead of cycling, for people who've asked for reduced motion.
    if (prefersReducedMotion) return;

    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % INDIAN_STATES.length);
    }, 2000);

    return () => clearInterval(id);
  }, []);

  return (
    <span
      key={index}
      className={cn("inline-block animate-state-cycle", className)}
    >
      {INDIAN_STATES[index]}
    </span>
  );
}
