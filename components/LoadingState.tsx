import { Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Centered animated-hourglass loading indicator, used anywhere a view is
 * waiting on data — admin tables and public listing pages alike.
 * `compact` trims the padding for use inside an already-padded container
 * (e.g. a `<Card padding="p-10">`).
 */
export function LoadingState({ label = "Loading…", compact = false }: { label?: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-[var(--color-text-secondary)]",
        compact ? "py-2" : "py-14"
      )}
    >
      <Hourglass size={compact ? 22 : 28} className="animate-hourglass text-[var(--color-primary)]" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
