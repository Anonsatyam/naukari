"use client";

import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, ChevronDown } from "lucide-react";
import { PAGE_SIZE_OPTIONS, PageSize } from "@/lib/pagination";
import { IconButton } from "@/components/admin/IconButton";

const pageSizeSelectClass =
  "appearance-none rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] py-1.5 pl-2.5 pr-6 text-sm font-medium text-[var(--color-text-secondary)] outline-none focus:border-[var(--color-primary)]";

export function PaginationBar({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: PageSize;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
}) {
  const atFirst = page <= 1;
  const atLast = page >= totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
        <span className="whitespace-nowrap">Rows per page</span>
        <div className="relative">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSize)}
            className={pageSizeSelectClass}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <ChevronDown
            size={13}
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-[var(--color-text-secondary)]">
        <span>
          Page {page} of {totalPages} · {total.toLocaleString("en-IN")} total
        </span>
        <div className="flex items-center gap-1">
          <IconButton
            icon={<ChevronsLeft size={14} />}
            label="First page"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={atFirst}
          />
          <IconButton
            icon={<ChevronLeft size={14} />}
            label="Previous page"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={atFirst}
          />
          <IconButton
            icon={<ChevronRight size={14} />}
            label="Next page"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={atLast}
          />
          <IconButton
            icon={<ChevronsRight size={14} />}
            label="Last page"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={atLast}
          />
        </div>
      </div>
    </div>
  );
}
