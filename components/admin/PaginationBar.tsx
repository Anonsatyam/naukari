"use client";

import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { PAGE_SIZE_OPTIONS, PageSize } from "@/lib/pagination";
import { IconButton } from "@/components/admin/IconButton";
import { selectFieldCompactClass } from "@/lib/ui";

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
        <span>Rows per page</span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSize)}
          className={`${selectFieldCompactClass} w-auto`}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
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
