"use client";

import { useMemo, useState } from "react";
import { createColumnHelper, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Job } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useServerTableData } from "@/lib/useServerTableData";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import SearchInput from "@/components/SearchInput";
import { Button } from "@/components/Button";
import { IconButton } from "@/components/admin/IconButton";
import { DataTable } from "@/components/admin/DataTable";
import { PaginationBar } from "@/components/admin/PaginationBar";

const columnHelper = createColumnHelper<Job>();

export default function AdminJobsPage() {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const {
    rows: jobs,
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
  } = useServerTableData<Job>("/api/admin/jobs", "jobs", [{ id: "updatedAt", desc: true }]);

  const toggleStatus = async (job: Job) => {
    setPendingId(job.id);
    const action = job.status === "published" ? "unpublish" : "publish";
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}/${action}`, { method: "POST" });
      if (res.ok) reload();
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async (job: Job) => {
    if (!window.confirm(`Delete "${job.title}" permanently? This cannot be undone.`)) return;
    setDeletingId(job.id);
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
      reload();
    } catch {
      toast.error("Could not delete this job.");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pageIds = useMemo(() => jobs.map((j) => j.id), [jobs]);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(pageIds));
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} job${ids.length > 1 ? "s" : ""} permanently? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/admin/jobs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Bulk delete failed");
      setSelectedIds(new Set());
      reload();
    } catch {
      toast.error("Could not delete the selected jobs.");
    } finally {
      setBulkDeleting(false);
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
            disabled={pageIds.length === 0}
            aria-label="Select all jobs on this page"
            className="h-4 w-4 cursor-pointer accent-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.has(row.original.id)}
            onChange={() => toggleOne(row.original.id)}
            aria-label={`Select ${row.original.title}`}
            className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
          />
        ),
        enableSorting: false,
      }),
      columnHelper.accessor("title", {
        id: "title",
        header: "Job",
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{row.original.title}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{row.original.organization}</p>
          </div>
        ),
      }),
      columnHelper.accessor("totalVacancies", {
        id: "totalVacancies",
        header: "Vacancies",
        cell: ({ getValue }) => (
          <span className="text-sm text-[var(--color-text-secondary)]">
            {getValue() ? getValue().toLocaleString("en-IN") : "—"}
          </span>
        ),
      }),
      columnHelper.accessor("updatedAt", {
        id: "updatedAt",
        header: "Updated",
        cell: ({ getValue }) => <span className="text-sm text-[var(--color-text-secondary)]">{formatDate(getValue())}</span>,
      }),
      columnHelper.accessor("status", {
        id: "status",
        header: "Status",
        cell: ({ getValue }) => <Badge tone={getValue() === "published" ? "success" : "neutral"}>{getValue()}</Badge>,
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="block text-right">Actions</span>,
        cell: ({ row }) => {
          const job = row.original;
          return (
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => toggleStatus(job)}
                disabled={pendingId === job.id}
                className="text-xs font-semibold text-[var(--color-primary)] disabled:opacity-50"
              >
                {pendingId === job.id ? "Saving…" : job.status === "published" ? "Unpublish" : "Publish"}
              </button>
              <a
                href={`/jobs/${job.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                aria-label="View public page"
                title="View public page"
              >
                <ExternalLink size={14} />
              </a>
              <IconButton
                icon={<Trash2 size={14} />}
                label="Delete this job"
                tone="danger"
                size="sm"
                onClick={() => handleDelete(job)}
                disabled={deletingId === job.id}
              />
            </div>
          );
        },
        enableSorting: false,
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIds, allSelected, pageIds.length, pendingId, deletingId]
  );

  const table = useReactTable({
    data: jobs,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div>
      <Breadcrumb items={[{ label: "Drafts", href: "/admin/my-drafts" }, { label: "Manage Jobs" }]} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-[var(--color-text-primary)]">Manage Jobs</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            All jobs, including closed listings. Unpublish once applications close, or keep it live.
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
              disabled={bulkDeleting}
              onClick={handleBulkDelete}
              className="bg-[var(--color-danger)] text-white hover:opacity-90"
            >
              <Trash2 size={14} /> {bulkDeleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        )}
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search jobs by title or organization..."
        className="mt-4 sm:max-w-sm"
      />

      <Card padding="p-0" className="mt-4 overflow-hidden">
        <DataTable table={table} loading={loading} loadingMessage="Loading jobs…" emptyMessage="No jobs match your search." />
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
