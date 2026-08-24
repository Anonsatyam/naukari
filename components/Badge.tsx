import { cn } from "@/lib/utils";

type BadgeTone = "primary" | "success" | "warning" | "danger" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  primary: "bg-[var(--color-primary-tint)] text-[var(--color-primary)]",
  success: "bg-[var(--color-success-tint)] text-[var(--color-success)]",
  warning: "bg-[var(--color-warning-tint)] text-[var(--color-warning)]",
  danger: "bg-[var(--color-danger-tint)] text-[var(--color-danger)]",
  neutral: "bg-[var(--color-border)] text-[var(--color-text-secondary)]",
};

export default function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
