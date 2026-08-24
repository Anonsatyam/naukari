import Link from "next/link";
import { ArrowUpRight, Calendar } from "lucide-react";
import Badge from "./Badge";
import WhatsAppShareButton from "./WhatsAppShareButton";

export default function ListItemCard({
  href,
  eyebrow,
  title,
  description,
  category,
  meta,
  isNew = false,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description?: string;
  category: string;
  meta: string;
  isNew?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 transition-all hover:border-[var(--color-primary)] hover:shadow-[0_4px_20px_rgba(60,68,194,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-[var(--color-text-secondary)]">{eyebrow}</p>
          <h2 className="mt-1 text-[15px] font-semibold leading-snug text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)]">
            {title}
          </h2>
        </div>
        <ArrowUpRight
          size={18}
          className="mt-1 shrink-0 text-[var(--color-text-muted)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--color-primary)]"
        />
      </div>

      {description && (
        <p className="mt-3 line-clamp-2 text-sm text-[var(--color-text-secondary)]">{description}</p>
      )}

      <div className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-primary)]">
        <Calendar size={15} className="shrink-0 text-[var(--color-primary)]" />
        {meta}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {isNew && <Badge tone="success">New</Badge>}
          <Badge tone="primary">{category}</Badge>
        </div>
        <WhatsAppShareButton path={href} text={title} />
      </div>
    </Link>
  );
}