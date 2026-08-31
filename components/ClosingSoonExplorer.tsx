"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlarmClock } from "lucide-react";
import { Job } from "@/lib/types";
import { isClosingSoon } from "@/lib/dateHelpers";
import { useTextFilter } from "@/lib/useTextFilter";
import JobCard from "@/components/JobCard";
import Breadcrumb from "@/components/Breadcrumb";
import SearchInput from "@/components/SearchInput";
import Card from "@/components/Card";

export default function ClosingSoonExplorer() {
  const locale = useLocale();
  const t = useTranslations("closingSoonPage");
  const tCommon = useTranslations("common");
  const localePath = (path: string) => (locale === "en" ? path : `/${locale}${path}`);
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data: { jobs: Job[] }) => setAllJobs(data.jobs))
      .finally(() => setLoading(false));
  }, []);

  const closingSoonJobs = allJobs.filter(isClosingSoon);

  const getSearchableText = useCallback(
    (j: Job) => `${j.title} ${j.organization} ${j.department} ${j.category}`,
    []
  );
  const { query, setQuery, filtered } = useTextFilter(closingSoonJobs, getSearchableText);

  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: tCommon("home"), href: localePath("/") }, { label: t("breadcrumb") }]} />

      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-danger-tint)] text-[var(--color-danger)]">
          <AlarmClock size={18} />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
            {t("heading")}
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {!loading && closingSoonJobs.length > 0 && (
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t("searchPlaceholder")}
          className="mt-4 sm:max-w-md"
        />
      )}

      {loading ? (
        <Card padding="p-10" className="mt-8 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">{t("loading")}</p>
        </Card>
      ) : closingSoonJobs.length === 0 ? (
        <Card padding="p-10" className="mt-8 border-dashed text-center">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            {t("noneClosing")}
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {t("checkBackHint")}
          </p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card padding="p-10" className="mt-8 border-dashed text-center">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            {t("noSearchMatch")}
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {t("tryDifferentSearch")}
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
