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
        "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm",
        padding,
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-col gap-1.5", className)}>{children}</div>;
}

export function CardTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={cn("text-base font-semibold leading-none", className)}>{children}</h3>;
}

export function CardDescription({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={cn("text-sm text-[var(--color-text-secondary)]", className)}>{children}</p>;
}

export function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn(className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex items-center", className)}>{children}</div>;
}
