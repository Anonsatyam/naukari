import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              <li className="inline-flex items-center gap-1.5">
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-hover)]"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={cn(isLast && "font-medium text-[var(--color-text-primary)]")}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast && (
                <li role="presentation" aria-hidden="true">
                  <ChevronRight size={14} className="text-[var(--color-text-muted)]" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
