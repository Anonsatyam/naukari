"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { SlidersHorizontal, X } from "lucide-react";
import JobCard from "./JobCard";
import Breadcrumb from "./Breadcrumb";
import SearchInput from "./SearchInput";
import Card from "./Card";
import { categories, departments, qualifications, states, taxonomyLabel } from "@/lib/taxonomy";
import { Job } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function JobsExplorer() {
  const searchParams = useSearchParams();
  const locale = useLocale();
  const t = useTranslations("jobsPage");
  const tFilters = useTranslations("filters");
  const tCommon = useTranslations("common");
  const localePath = (path: string) => (locale === "en" ? path : `/${locale}${path}`);

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const initialCategory = searchParams.get("category");
  const [category, setCategory] = useState<string[]>(
    initialCategory && initialCategory !== "All" ? [initialCategory] : []
  );
  const [department, setDepartment] = useState<string[]>([]);
  const [qualification, setQualification] = useState<string[]>([]);
  const [state, setState] = useState<string[]>([]);
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
      state.forEach((s) => params.append("state", s));

      setLoading(true);
      fetch(`/api/jobs?${params.toString()}`)
        .then((res) => res.json())
        .then((data: { jobs: Job[] }) => setFiltered(data.jobs))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(handle);
  }, [query, category, department, qualification, state]);

  const activeFilterCount = category.length + department.length + qualification.length + state.length;

  const resetFilters = () => {
    setCategory([]);
    setDepartment([]);
    setQualification([]);
    setState([]);
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
      <Breadcrumb items={[{ label: tCommon("home"), href: localePath("/") }, { label: t("breadcrumb") }]} />
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] md:text-3xl">
          {t("heading")}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {loading ? t("searching") : t("jobsFound", { count: filtered.length })}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t("searchPlaceholder")}
          className="flex-1"
        />
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--color-text-primary)] lg:hidden"
        >
          <SlidersHorizontal size={16} />
          {t("filtersButton")}
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
              <p className="font-display text-lg font-bold">{tFilters("title")}</p>
              <button onClick={() => setFiltersOpen(false)} aria-label={t("closeFilters")}>
                <X size={20} />
              </button>
            </div>
          )}

          <Card padding="p-4" className="space-y-6 lg:sticky lg:top-24">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">{tFilters("title")}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{tFilters("subtitle")}</p>
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-xs font-medium text-[var(--color-primary)]"
                >
                  {tFilters("reset")}
                </button>
              )}
            </div>

            <FilterGroup
              label={tFilters("category")}
              options={categories}
              selected={category}
              onToggle={(opt) => toggle(setCategory, opt)}
              getLabel={(opt) => taxonomyLabel(opt, locale, "category")}
            />
            <FilterGroup
              label={tFilters("department")}
              options={departments}
              selected={department}
              onToggle={(opt) => toggle(setDepartment, opt)}
              getLabel={(opt) => taxonomyLabel(opt, locale, "department")}
            />
            <FilterGroup
              label={tFilters("qualification")}
              options={qualifications}
              selected={qualification}
              onToggle={(opt) => toggle(setQualification, opt)}
              getLabel={(opt) => taxonomyLabel(opt, locale, "qualification")}
            />

            <FilterGroup
              label={tFilters("state")}
              options={states}
              selected={state}
              onToggle={(opt) => toggle(setState, opt)}
              getLabel={(opt) => taxonomyLabel(opt, locale, "state")}
            />

            {filtersOpen && (
              <button
                onClick={() => setFiltersOpen(false)}
                className="w-full rounded-[var(--radius-control)] bg-[var(--color-primary)] py-2.5 text-sm font-semibold text-white lg:hidden"
              >
                {tFilters("showJobs", { count: filtered.length })}
              </button>
            )}
          </Card>
        </aside>

        <div>
          {loading ? (
            <Card padding="p-10" className="text-center">
              <p className="text-sm text-[var(--color-text-secondary)]">{t("loading")}</p>
            </Card>
          ) : filtered.length === 0 ? (
            <Card padding="p-10" className="border-dashed text-center">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                {t("noMatch")}
              </p>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {t("noMatchHint")}
              </p>
              <button
                onClick={resetFilters}
                className="mt-4 rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
              >
                {t("clearFilters")}
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
  getLabel,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
  getLabel?: (option: string) => string;
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
              {getLabel ? getLabel(opt) : opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
