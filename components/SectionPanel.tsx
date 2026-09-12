import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function SectionPanel({
  title,
  viewAllHref,
  viewAllLabel,
  children,
}: {
  title: string;
  viewAllHref: string;
  viewAllLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-background)] p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)]">{title}</h2>
        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]"
        >
          {viewAllLabel} <ArrowRight size={14} />
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}
