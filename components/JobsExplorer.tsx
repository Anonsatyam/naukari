"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import JobCard from "./JobCard";
import Breadcrumb from "./Breadcrumb";
import SearchInput from "./SearchInput";
import Card from "./Card";
import { categories, departments, qualifications } from "@/lib/taxonomy";
import { Job } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function JobsExplorer() {
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const initialCategory = searchParams.get("category");
  const [category, setCategory] = useState<string[]>(
    initialCategory && initialCategory !== "All" ? [initialCategory] : []
  );
  const [department, setDepartment] = useState<string[]>([]);
  const [qualification, setQualification] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [filtered, setFiltered] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      category.forEach((c) => params.append("category", c));
      department.forEach((d) => params.append("department", d));
      qualification.forEach((q) => params.append("qualification", q));

      setLoading(true);
      fetch(`/api/jobs?${params.toString()}`)
        .then((res) => res.json())
        .then((data: { jobs: Job[] }) => setFiltered(data.jobs))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(handle);
  }, [query, category, department, qualification]);

  const activeFilterCount = category.length + department.length + qualification.length;

  const resetFilters = () => {
    setCategory([]);
    setDepartment([]);
    setQualification([]);
  };

  const toggle = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    option: string
  ) => {
    if (option === "All") {
      setter([]);
      return;
    }
    setter((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Jobs" }]} />
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] md:text-3xl">
          Government Jobs
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {loading ? "Searching…" : `${filtered.length} job${filtered.length === 1 ? "" : "s"} found`}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search jobs, organizations, departments"
          className="flex-1"
        />
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] lg:hidden"
        >
          <SlidersHorizontal size={16} />
          Filters
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        <aside
          className={cn(
            "lg:block",
            filtersOpen
              ? "fixed inset-0 z-50 overflow-y-auto bg-white p-5 lg:static lg:p-0"
              : "hidden"
          )}
        >
          {filtersOpen && (
            <div className="mb-4 flex items-center justify-between lg:hidden">
              <p className="font-display text-lg font-bold">Filters</p>
              <button onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                <X size={20} />
              </button>
            </div>
          )}

          <Card padding="p-4" className="space-y-6 lg:sticky lg:top-24">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">Filters</p>
                <p className="text-xs text-[var(--color-text-muted)]">Pick as many as you like</p>
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-xs font-medium text-[var(--color-primary)]"
                >
                  Reset
                </button>
              )}
            </div>

            <FilterGroup
              label="Category"
              options={categories}
              selected={category}
              onToggle={(opt) => toggle(setCategory, opt)}
            />
            <FilterGroup
              label="Department"
              options={departments}
              selected={department}
              onToggle={(opt) => toggle(setDepartment, opt)}
            />
            <FilterGroup
              label="Qualification"
              options={qualifications}
              selected={qualification}
              onToggle={(opt) => toggle(setQualification, opt)}
            />

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                State
              </p>
              <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                Bihar
                <span className="text-xs text-[var(--color-text-muted)]">More states soon</span>
              </div>
            </div>

            {filtersOpen && (
              <button
                onClick={() => setFiltersOpen(false)}
                className="w-full rounded-[var(--radius-control)] bg-[var(--color-primary)] py-2.5 text-sm font-semibold text-white lg:hidden"
              >
                Show {filtered.length} jobs
              </button>
            )}
          </Card>
        </aside>

        <div>
          {loading ? (
            <Card padding="p-10" className="text-center">
              <p className="text-sm text-[var(--color-text-secondary)]">Loading jobs…</p>
            </Card>
          ) : filtered.length === 0 ? (
            <Card padding="p-10" className="border-dashed text-center">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                No jobs match these filters
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Try clearing a filter or searching a different term.
              </p>
              <button
                onClick={resetFilters}
                className="mt-4 rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
              >
                Clear filters
              </button>
              </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filtered.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isActive = opt === "All" ? selected.length === 0 : selected.includes(opt);
          return (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              aria-pressed={isActive}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-tint)] text-[var(--color-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
