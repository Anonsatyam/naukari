import Link from "next/link";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-[var(--color-text-primary)]">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`}>
            {item.href && !isLast ? (
              <Link href={item.href} className="text-[var(--color-primary)] font-semibold">
                {item.label}
              </Link>
            ) : (
              <span
                className={isLast ? "font-medium" : undefined}
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
            {!isLast && <span className="mx-1.5 text-[var(--color-text-muted)]">/</span>}
          </span>
        );
      })}
    </nav>
  );
}
