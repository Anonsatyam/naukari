"use client";

import { useTranslations } from "next-intl";
import { ArrowUp, ArrowDown, RotateCw, X } from "lucide-react";
import { IconButton } from "@/components/admin/IconButton";
import { cn } from "@/lib/utils";
import { PageEntry } from "./types";

export default function PageThumbnailRail({
  pages,
  open,
  onMove,
  onRotate,
  onDelete,
  onJumpTo,
  className,
}: {
  pages: PageEntry[];
  open: boolean;
  onMove: (index: number, dir: -1 | 1) => void;
  onRotate: (index: number) => void;
  onDelete: (index: number) => void;
  onJumpTo: (index: number) => void;
  className?: string;
}) {
  const t = useTranslations("editPdfPage");

  return (
    <div
      className={cn(
        "space-y-2 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2",
        open ? "block" : "hidden lg:block",
        className
      )}
    >
      <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {t("pagesLabel")}
      </p>
      {pages.map((page, i) => (
        <div key={`${page.originalIndex}-${i}`} className="space-y-1 rounded-lg border border-[var(--color-border)] p-1.5">
          <button type="button" onClick={() => onJumpTo(i)} className="block w-full overflow-hidden rounded">
            <img
              src={page.previewUrl}
              alt={`Page ${i + 1}`}
              className="w-full rounded"
              style={{ transform: `rotate(${page.rotation}deg)` }}
            />
          </button>
          <p className="text-center text-[11px] text-[var(--color-text-secondary)]">{i + 1}</p>
          <div className="flex items-center justify-center gap-0.5">
            <IconButton icon={<ArrowUp size={12} />} label="Move up" size="sm" onClick={() => onMove(i, -1)} disabled={i === 0} />
            <IconButton icon={<ArrowDown size={12} />} label="Move down" size="sm" onClick={() => onMove(i, 1)} disabled={i === pages.length - 1} />
            <IconButton icon={<RotateCw size={12} />} label="Rotate" size="sm" onClick={() => onRotate(i)} />
            <IconButton icon={<X size={12} />} label="Delete page" tone="danger" size="sm" onClick={() => onDelete(i)} disabled={pages.length <= 1} />
          </div>
        </div>
      ))}
    </div>
  );
}
