"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Job } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useTextFilter } from "@/lib/useTextFilter";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import SearchInput from "@/components/SearchInput";
import { Button } from "@/components/Button";
import { IconButton } from "@/components/admin/IconButton";

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadJobs = useCallback(() => {
    fetch("/api/admin/jobs")
      .then((res) => res.json())
      .then((data: { jobs: Job[] }) => setJobs(data.jobs))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const getSearchableText = useCallback((j: Job) => `${j.title} ${j.organization}`, []);
  const { query, setQuery, filtered } = useTextFilter(jobs, getSearchableText);

  const toggleStatus = async (job: Job) => {
    setPendingId(job.id);
    const action = job.status === "published" ? "unpublish" : "publish";
    try {
      const res = await fetch(`/api/admin/jobs/${job.id}/${action}`, { method: "POST" });
      if (res.ok) {
        const data: { job: Job } = await res.json();
        setJobs((prev) => prev.map((j) => (j.id === job.id ? data.job : j)));
      }
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
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
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

  const filteredIds = useMemo(() => filtered.map((j) => j.id), [filtered]);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(filteredIds));
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
      setJobs((prev) => prev.filter((j) => !selectedIds.has(j.id)));
      setSelectedIds(new Set());
    } catch {
      toast.error("Could not delete the selected jobs.");
    } finally {
      setBulkDeleting(false);
    }
  };

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
        value={query}
        onChange={setQuery}
        placeholder="Search jobs..."
        className="mt-4 sm:max-w-sm"
      />

      <Card padding="p-0" className="mt-4 overflow-hidden">
        <div className="hidden grid-cols-[28px_1fr_120px_140px_100px_120px] gap-4 border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] md:grid">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            disabled={filteredIds.length === 0}
            aria-label="Select all jobs"
            className="h-4 w-4 cursor-pointer accent-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          />
          <span>Job</span>
          <span>Vacancies</span>
          <span>Updated</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {loading ? (
          <p className="p-4 text-sm text-[var(--color-text-secondary)]">Loading jobs…</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-[var(--color-text-secondary)]">No jobs match your search.</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {filtered.map((job) => (
              <div
                key={job.id}
                className="grid grid-cols-[28px_1fr] gap-2 px-4 py-4 md:grid-cols-[28px_1fr_120px_140px_100px_120px] md:items-center md:gap-4"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(job.id)}
                  onChange={() => toggleOne(job.id)}
                  aria-label={`Select ${job.title}`}
                  className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]"
                />
                <div className="col-start-2 min-w-0 md:col-start-auto">
                  <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{job.title}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{job.organization}</p>
                </div>
                <span className="col-start-2 text-sm text-[var(--color-text-secondary)] md:col-start-auto">
                  {job.totalVacancies ? job.totalVacancies.toLocaleString("en-IN") : "—"}
                </span>
                <span className="col-start-2 text-sm text-[var(--color-text-secondary)] md:col-start-auto">
                  {formatDate(job.updatedAt)}
                </span>
                <span className="col-start-2 md:col-start-auto">
                  <Badge tone={job.status === "published" ? "success" : "neutral"}>{job.status}</Badge>
                </span>
                <div className="col-start-2 flex items-center gap-3 md:col-start-auto">
                  <button
                    onClick={() => toggleStatus(job)}
                    disabled={pendingId === job.id}
                    className="text-xs font-semibold text-[var(--color-primary)] disabled:opacity-50"
                  >
                    {pendingId === job.id
                      ? "Saving…"
                      : job.status === "published"
                      ? "Unpublish"
                      : "Publish"}
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
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
