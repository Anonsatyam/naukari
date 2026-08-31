"use client";

import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  default: "text-[var(--color-text-secondary)] hover:bg-[var(--color-background)]",
  danger: "text-[var(--color-danger)] hover:bg-[var(--color-danger-tint)]",
  primary: "text-[var(--color-primary)] hover:bg-[var(--color-primary-tint)]",
} as const;

const SIZE_CLASSES = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
} as const;

export function IconButton({
  icon,
  label,
  onClick,
  disabled,
  tone = "default",
  size = "md",
  type = "button",
  className,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: keyof typeof TONE_CLASSES;
  size?: keyof typeof SIZE_CLASSES;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <span className="group/tooltip relative inline-flex">
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        title={label}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-[var(--radius-control)] transition-colors disabled:cursor-not-allowed disabled:opacity-30",
          SIZE_CLASSES[size],
          TONE_CLASSES[tone],
          className
        )}
      >
        {icon}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--color-text-primary)] px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/tooltip:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
