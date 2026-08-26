"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Job } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useTextFilter } from "@/lib/useTextFilter";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import SearchInput from "@/components/SearchInput";

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

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

  return (
    <div>
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Manage Jobs" }]} />

      <h1 className="font-display text-xl font-bold text-[var(--color-text-primary)]">Manage Jobs</h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        All jobs, including closed listings. Unpublish once applications close, or keep it live.
      </p>

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search jobs..."
        className="mt-4 sm:max-w-sm"
      />

      <Card padding="p-0" className="mt-4 overflow-hidden">
        <div className="hidden grid-cols-[1fr_120px_140px_100px_90px] gap-4 border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] md:grid">
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
                className="grid grid-cols-1 gap-2 px-4 py-4 md:grid-cols-[1fr_120px_140px_100px_90px] md:items-center md:gap-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{job.title}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{job.organization}</p>
                </div>
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {job.totalVacancies ? job.totalVacancies.toLocaleString("en-IN") : "—"}
                </span>
                <span className="text-sm text-[var(--color-text-secondary)]">{formatDate(job.updatedAt)}</span>
                <span>
                  <Badge tone={job.status === "published" ? "success" : "neutral"}>{job.status}</Badge>
                </span>
                <div className="flex items-center gap-3">
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
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
