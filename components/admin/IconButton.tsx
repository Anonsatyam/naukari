"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  default: "text-[var(--color-text-secondary)] hover:bg-[var(--color-background)]",
  danger: "text-[var(--color-danger)] hover:bg-[var(--color-danger-tint)]",
  primary: "text-[var(--color-primary)] hover:bg-[var(--color-primary-tint)]",
} as const;

const SIZE_CLASSES = {
  sm: "h-7 w-7",
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  const showTooltip = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltipPos({ top: rect.top - 6, left: rect.right });
  };
  const hideTooltip = () => setTooltipPos(null);

  return (
    <>
      <button
        ref={buttonRef}
        type={type}
        onClick={onClick}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
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
      {tooltipPos &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-[100] -translate-x-full -translate-y-full whitespace-nowrap rounded-md bg-[var(--color-text-primary)] px-2 py-1 text-[11px] font-medium text-white shadow-lg"
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
          >
            {label}
          </span>,
          document.body
        )}
    </>
  );
}
