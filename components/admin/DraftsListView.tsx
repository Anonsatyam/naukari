"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  TriangleAlert,
  Eye,
  Trash2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { BotDraft } from "@/lib/types";
import { openPreviewWindow } from "@/lib/adminPreview";
import { Button } from "@/components/Button";
import { IconButton } from "@/components/admin/IconButton";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";

const TYPE_LABELS: Record<BotDraft["draftType"], string> = {
  job: "Job",
  result: "Result",
  admit_card: "Admit Card",
};

const TYPE_TONES: Record<BotDraft["draftType"], "primary" | "success" | "warning"> = {
  job: "primary",
  result: "success",
  admit_card: "warning",
};

const CONFIDENCE_TONES: Record<BotDraft["confidence"], "success" | "warning" | "danger"> = {
  high: "success",
  medium: "warning",
  low: "danger",
};

const STATUS_TONES: Record<BotDraft["status"], "warning" | "success" | "danger"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

function possibleGap(draft: BotDraft): boolean {
  const v = (draft.extractedFields as { verification?: { possibleGap?: boolean } } | undefined)?.verification;
  return v?.possibleGap === true;
}

const CONFIDENCE_RANK: Record<BotDraft["confidence"], number> = { low: 0, medium: 1, high: 2 };
const TYPE_RANK: Record<BotDraft["draftType"], number> = { job: 0, result: 1, admit_card: 2 };
const STATUS_RANK: Record<BotDraft["status"], number> = { pending: 0, approved: 1, rejected: 2 };

type SortColumn = "type" | "confidence" | "status";
type SortDirection = "asc" | "desc";

function SortableHeader({
  label,
  column,
  activeColumn,
  direction,
  onSort,
}: {
  label: string;
  column: SortColumn;
  activeColumn: SortColumn | null;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
}) {
  const isActive = activeColumn === column;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="flex items-center gap-1 text-left hover:text-[var(--color-text-primary)]"
    >
      {label}
      {isActive ? (
        direction === "asc" ? (
          <ArrowUp size={12} />
        ) : (
          <ArrowDown size={12} />
        )
      ) : (
        <ArrowUpDown size={12} className="opacity-40" />
      )}
    </button>
  );
}

export function DraftsListView({
  origin,
  title,
  description,
  breadcrumbLabel,
}: {
  origin: BotDraft["origin"];
  title: string;
  description: string;
  breadcrumbLabel: string;
}) {
  const [drafts, setDrafts] = useState<BotDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [bulkPending, setBulkPending] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDrafts = useCallback(() => {
    fetch(`/api/admin/drafts?origin=${origin}`)
      .then((res) => res.json())
      .then((data: { drafts: BotDraft[] }) => setDrafts(data.drafts))
      .finally(() => setLoading(false));
  }, [origin]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortRank = useCallback((draft: BotDraft, column: SortColumn): number => {
    if (column === "type") return TYPE_RANK[draft.draftType];
    if (column === "confidence") return CONFIDENCE_RANK[draft.confidence];
    return STATUS_RANK[draft.status];
  }, []);

  const sortedDrafts = useMemo(() => {
    if (!sortColumn) return drafts;
    return [...drafts].sort((a, b) => {
      const diff = sortRank(a, sortColumn) - sortRank(b, sortColumn);
      return sortDirection === "asc" ? diff : -diff;
    });
  }, [drafts, sortColumn, sortDirection, sortRank]);

  const selectableIds = useMemo(
    () => sortedDrafts.filter((d) => d.status === "pending").map((d) => d.id),
    [sortedDrafts]
  );
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(selectableIds));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBulkAction = async (action: "approve" | "reject") => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkPending(true);
    try {
      await Promise.allSettled(
        ids.map((id) => fetch(`/api/admin/drafts/${id}/${action}`, { method: "POST" }))
      );
      setSelectedIds(new Set());
      loadDrafts();
    } finally {
      setBulkPending(false);
    }
  };

  const handlePreview = async (id: string) => {
    setPreviewingId(id);
    try {
      const res = await fetch(`/api/admin/drafts/${id}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not build a preview.");
      openPreviewWindow(data);
    } catch {
      window.alert("Could not build a preview for this draft.");
    } finally {
      setPreviewingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this draft permanently? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/drafts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      loadDrafts();
    } catch {
      window.alert("Could not delete this draft.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: breadcrumbLabel }]} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-[var(--color-text-primary)]">{title}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>
        </div>

        {someSelected && (
          <div className="flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-white px-3 py-2 shadow-sm">
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              {selectedIds.size} selected
            </span>
            <Button
              type="button"
              size="sm"
              disabled={bulkPending}
              onClick={() => runBulkAction("approve")}
              className="bg-[var(--color-success)] text-white hover:opacity-90"
            >
              <CheckCircle2 size={14} /> Approve
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={bulkPending}
              onClick={() => runBulkAction("reject")}
              className="bg-[var(--color-danger)] text-white hover:opacity-90"
            >
              <XCircle size={14} /> Reject
            </Button>
          </div>
        )}
      </div>

      <Card padding="p-0" className="mt-5 overflow-hidden">
        <div
          className={`hidden items-center gap-4 border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] md:grid ${
            origin === "manual"
              ? "grid-cols-[28px_1fr_90px_120px_120px_100px_90px]"
              : "grid-cols-[28px_1fr_90px_120px_120px_100px]"
          }`}
        >
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            disabled={selectableIds.length === 0}
            aria-label="Select all pending drafts"
            className="h-4 w-4 cursor-pointer accent-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          />
          <span>Title</span>
          <SortableHeader
            label="Type"
            column="type"
            activeColumn={sortColumn}
            direction={sortDirection}
            onSort={handleSort}
          />
          <span>Detected</span>
          <SortableHeader
            label="Confidence"
            column="confidence"
            activeColumn={sortColumn}
            direction={sortDirection}
            onSort={handleSort}
          />
          <SortableHeader
            label="Status"
            column="status"
            activeColumn={sortColumn}
            direction={sortDirection}
            onSort={handleSort}
          />
          {origin === "manual" && <span className="text-right">Actions</span>}
        </div>

        {loading ? (
          <p className="p-4 text-sm text-[var(--color-text-secondary)]">Loading drafts…</p>
        ) : sortedDrafts.length === 0 ? (
          <p className="p-4 text-sm text-[var(--color-text-secondary)]">No drafts yet.</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {sortedDrafts.map((draft) => (
              <div
                key={draft.id}
                className={`grid grid-cols-[28px_1fr] gap-2 px-4 py-4 md:items-center md:gap-4 ${
                  origin === "manual"
                    ? "md:grid-cols-[28px_1fr_90px_120px_120px_100px_90px]"
                    : "md:grid-cols-[28px_1fr_90px_120px_120px_100px]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(draft.id)}
                  onChange={() => toggleOne(draft.id)}
                  disabled={draft.status !== "pending"}
                  aria-label={`Select ${draft.jobTitle}`}
                  className="h-4 w-4 cursor-pointer accent-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40"
                />
                <Link
                  href={origin === "manual" ? `/admin/my-drafts/${draft.id}` : `/admin/drafts/${draft.id}`}
                  className="min-w-0 hover:opacity-80"
                >
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-[var(--color-text-primary)]">
                    {draft.jobTitle}
                    {possibleGap(draft) && (
                      <TriangleAlert
                        size={14}
                        className="shrink-0 text-[var(--color-warning)]"
                        aria-label="Extraction might be missing a section — check before approving"
                      />
                    )}
                    <ArrowUpRight size={13} className="shrink-0 text-[var(--color-text-muted)]" />
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{draft.organization}</p>
                  {possibleGap(draft) && (
                    <p className="mt-0.5 text-xs font-medium text-[var(--color-warning)]">
                      ⚠ Might be missing a section — please check
                    </p>
                  )}
                </Link>
                <span className="col-start-2 md:col-start-auto">
                  <Badge tone={TYPE_TONES[draft.draftType]}>{TYPE_LABELS[draft.draftType]}</Badge>
                </span>
                <span className="col-start-2 text-xs text-[var(--color-text-secondary)] md:col-start-auto md:text-sm">
                  {formatDate(draft.detectedAt)}
                </span>
                <span className="col-start-2 md:col-start-auto">
                  <Badge tone={CONFIDENCE_TONES[draft.confidence]}>{draft.confidence}</Badge>
                </span>
                <span className="col-start-2 md:col-start-auto">
                  <Badge tone={STATUS_TONES[draft.status]}>{draft.status}</Badge>
                </span>
                {origin === "manual" && (
                  <span className="col-start-2 flex items-center gap-1 md:col-start-auto md:justify-end">
                    <IconButton
                      icon={<Eye size={15} />}
                      label="Preview this post"
                      onClick={() => handlePreview(draft.id)}
                      disabled={previewingId === draft.id}
                    />
                    <IconButton
                      icon={<Trash2 size={15} />}
                      label="Delete this draft"
                      tone="danger"
                      onClick={() => handleDelete(draft.id)}
                      disabled={deletingId === draft.id}
                    />
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
