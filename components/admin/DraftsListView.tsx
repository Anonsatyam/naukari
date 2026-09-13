"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createColumnHelper, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { ArrowUpRight, CheckCircle2, XCircle, Eye, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Draft } from "@/lib/types";
import { openPreviewTab, fillPreviewTab } from "@/lib/adminPreview";
import { useServerTableData } from "@/lib/useServerTableData";
import { Button } from "@/components/Button";
import { IconButton } from "@/components/admin/IconButton";
import { DataTable } from "@/components/admin/DataTable";
import { PaginationBar } from "@/components/admin/PaginationBar";
import { toast } from "sonner";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import SearchInput from "@/components/SearchInput";

const TYPE_LABELS: Record<Draft["draftType"], string> = {
  job: "Job",
  result: "Result",
  admit_card: "Admit Card",
};

const TYPE_TONES: Record<Draft["draftType"], "primary" | "success" | "warning"> = {
  job: "primary",
  result: "success",
  admit_card: "warning",
};

const CONFIDENCE_TONES: Record<Draft["confidence"], "success" | "warning" | "danger"> = {
  high: "success",
  medium: "warning",
  low: "danger",
};

const STATUS_TONES: Record<Draft["status"], "warning" | "success" | "danger"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

const columnHelper = createColumnHelper<Draft>();

export function DraftsListView() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    rows: drafts,
    total,
    loading,
    page,
    pageSize,
    setPage,
    setPageSize,
    search,
    setSearch,
    sorting,
    setSorting,
    totalPages,
    reload,
  } = useServerTableData<Draft>("/api/admin/drafts", "drafts", [{ id: "detectedAt", desc: true }]);

  const selectableIds = useMemo(() => drafts.filter((d) => d.status === "pending").map((d) => d.id), [drafts]);
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
      await Promise.allSettled(ids.map((id) => fetch(`/api/admin/drafts/${id}/${action}`, { method: "POST" })));
      setSelectedIds(new Set());
      reload();
    } finally {
      setBulkPending(false);
    }
  };

  const handlePreview = async (id: string) => {
    const tab = openPreviewTab();
    setPreviewingId(id);
    try {
      const res = await fetch(`/api/admin/drafts/${id}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not build a preview.");
      fillPreviewTab(tab, data);
    } catch (err) {
      tab?.close();
      toast.error(err instanceof Error ? err.message : "Could not build a preview for this draft.");
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
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      reload();
    } catch {
      toast.error("Could not delete this draft.");
    } finally {
      setDeletingId(null);
    }
  };

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: () => (
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            disabled={selectableIds.length === 0}
            aria-label="Select all pending drafts on this page"
            className="h-4 w-4 cursor-pointer accent-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={() => toggleOne(row.original.id)}
            disabled={row.original.status !== "pending"}
            aria-label={`Select ${row.original.jobTitle}`}
            className="h-4 w-4 cursor-pointer accent-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          />
        ),
        enableSorting: false,
      }),
      columnHelper.accessor("jobTitle", {
        id: "jobTitle",
        header: "Title",
        cell: ({ row }) => (
          <Link href={`/admin/my-drafts/${row.original.id}`} className="block min-w-0 hover:opacity-80">
            <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-[var(--color-text-primary)]">
              {row.original.jobTitle}
              <ArrowUpRight size={13} className="shrink-0 text-[var(--color-text-muted)]" />
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">{row.original.organization}</p>
          </Link>
        ),
      }),
      columnHelper.accessor("draftType", {
        id: "draftType",
        header: "Type",
        cell: ({ getValue }) => <Badge tone={TYPE_TONES[getValue()]}>{TYPE_LABELS[getValue()]}</Badge>,
      }),
      columnHelper.accessor("detectedAt", {
        id: "detectedAt",
        header: "Created",
        cell: ({ getValue }) => <span className="text-sm text-[var(--color-text-secondary)]">{formatDate(getValue())}</span>,
      }),
      columnHelper.accessor("confidence", {
        id: "confidence",
        header: "Confidence",
        cell: ({ getValue }) => <Badge tone={CONFIDENCE_TONES[getValue()]}>{getValue()}</Badge>,
      }),
      columnHelper.accessor("status", {
        id: "status",
        header: "Status",
        cell: ({ getValue }) => <Badge tone={STATUS_TONES[getValue()]}>{getValue()}</Badge>,
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="block text-right">Actions</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <IconButton
              icon={<Eye size={15} />}
              label="Preview this post"
              onClick={() => handlePreview(row.original.id)}
              disabled={previewingId === row.original.id}
            />
            <IconButton
              icon={<Trash2 size={15} />}
              label="Delete this draft"
              tone="danger"
              onClick={() => handleDelete(row.original.id)}
              disabled={deletingId === row.original.id}
            />
          </div>
        ),
        enableSorting: false,
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIds, allSelected, selectableIds.length, previewingId, deletingId]
  );

  const table = useReactTable({
    data: drafts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div>
      <Breadcrumb items={[{ label: "Drafts" }]} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-[var(--color-text-primary)]">Drafts</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Posts you created from scratch — edit, preview, publish, or delete them here.
          </p>
        </div>

        {someSelected && (
          <div className="flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-sm">
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

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search drafts by title or organization..."
        className="mt-4 sm:max-w-sm"
      />

      <Card padding="p-0" className="mt-4 overflow-hidden">
        <DataTable table={table} loading={loading} loadingMessage="Loading drafts…" emptyMessage="No drafts yet." />
        <PaginationBar
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </Card>
    </div>
  );
}
