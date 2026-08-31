"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Trophy, IdCard } from "lucide-react";

const iconMap = { briefcase: Briefcase, trophy: Trophy, idCard: IdCard };

export interface LiveStatItem {
  label: string;
  value: number;
  href: string;
  icon: keyof typeof iconMap;
}

function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return prefersReducedMotion ? target : 0;
  });

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) return;

    let start: number | null = null;
    let raf: number;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

export default function LiveStats({ stats }: { stats: LiveStatItem[] }) {
  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="container-page py-8">
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-success-tint)] px-2.5 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-success)] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-success)]">
                Live
              </span>
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">
              Sarkari job market at a glance
            </span>
          </div>

          <div className="grid grid-cols-3 divide-x divide-[var(--color-border)]">
            {stats.map((stat) => (
              <StatCell key={stat.label} stat={stat} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCell({ stat }: { stat: LiveStatItem }) {
  const Icon = iconMap[stat.icon];
  const count = useCountUp(stat.value);

  return (
    <Link
      href={stat.href}
      className="flex flex-col items-center gap-1 px-2 text-center transition-colors hover:text-[var(--color-primary)]"
    >
      <span className="flex items-center gap-1.5 text-2xl font-extrabold tabular-nums text-[var(--color-text-primary)] md:text-3xl">
        <Icon size={20} className="text-[var(--color-primary)]" />
        {count}
      </span>
      <span className="text-xs font-medium text-[var(--color-text-secondary)] md:text-sm">
        {stat.label}
      </span>
    </Link>
  );
}
