import { cn } from "@/lib/utils";

export default function Card({
  children,
  className,
  padding = "p-5",
}: {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white",
        padding,
        className
      )}
    >
      {children}
    </div>
  );
}
