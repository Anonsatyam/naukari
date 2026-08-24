"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { jobs as allJobs } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import SearchInput from "@/components/SearchInput";

export default function AdminJobsPage() {
  const [query, setQuery] = useState("");
  const [jobStates, setJobStates] = useState(
    Object.fromEntries(allJobs.map((j) => [j.id, j.status]))
  );

  const filtered = allJobs.filter(
    (j) =>
      j.title.toLowerCase().includes(query.toLowerCase()) ||
      j.organization.toLowerCase().includes(query.toLowerCase())
  );

  const toggleStatus = (id: string) => {
    setJobStates((prev) => ({
      ...prev,
      [id]: prev[id] === "published" ? "closed" : "published",
    }));
  };

  return (
    <div>
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Manage Jobs" }]} />

      <h1 className="font-display text-xl font-bold text-[var(--color-text-primary)]">Manage Jobs</h1>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        All published jobs. Unpublish a listing once applications close, or keep it live.
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
                <Badge tone={jobStates[job.id] === "published" ? "success" : "neutral"}>
                  {jobStates[job.id]}
                </Badge>
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleStatus(job.id)}
                  className="text-xs font-semibold text-[var(--color-primary)]"
                >
                  {jobStates[job.id] === "published" ? "Unpublish" : "Publish"}
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
      </Card>
    </div>
  );
}
