"use client";

import { useCallback } from "react";
import { AlarmClock } from "lucide-react";
import { jobs, isClosingSoon } from "@/lib/mock-data";
import { useTextFilter } from "@/lib/useTextFilter";
import JobCard from "@/components/JobCard";
import Breadcrumb from "@/components/Breadcrumb";
import SearchInput from "@/components/SearchInput";
import Card from "@/components/Card";

export default function ClosingSoonExplorer() {
  const closingSoonJobs = jobs.filter(isClosingSoon);

  const getSearchableText = useCallback(
    (j: (typeof closingSoonJobs)[number]) => `${j.title} ${j.organization} ${j.department} ${j.category}`,
    []
  );
  const { query, setQuery, filtered } = useTextFilter(closingSoonJobs, getSearchableText);

  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Jobs Closing Soon" }]} />

      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-danger-tint)] text-[var(--color-danger)]">
          <AlarmClock size={18} />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
            Jobs Closing Soon
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Applications closing within the next 7 days
          </p>
        </div>
      </div>

      {closingSoonJobs.length > 0 && (
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search jobs closing soon"
          className="mt-4 sm:max-w-md"
        />
      )}

      {closingSoonJobs.length === 0 ? (
        <Card padding="p-10" className="mt-8 border-dashed text-center">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            Nothing closing in the next 7 days
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Check back soon, or browse all open jobs.
          </p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card padding="p-10" className="mt-8 border-dashed text-center">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            No closing-soon jobs match your search
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Try a different search term.
          </p>
        </Card>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
