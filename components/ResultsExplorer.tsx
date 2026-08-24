"use client";

import { useCallback } from "react";
import { Trophy } from "lucide-react";
import { results, isRecent } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { useTextFilter } from "@/lib/useTextFilter";
import Breadcrumb from "@/components/Breadcrumb";
import ListItemCard from "@/components/ListItemCard";
import SearchInput from "@/components/SearchInput";
import Card from "@/components/Card";

export default function ResultsExplorer() {
  const getSearchableText = useCallback(
    (r: (typeof results)[number]) => `${r.title} ${r.organization} ${r.category}`,
    []
  );
  const { query, setQuery, filtered } = useTextFilter(results, getSearchableText);

  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Results" }]} />

      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
          <Trophy size={18} />
        </span>
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
          Results
        </h1>
      </div>

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search results by exam or organization"
        className="mt-4 sm:max-w-md"
      />

      {filtered.length === 0 ? (
        <Card padding="p-10" className="mt-6 border-dashed text-center">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">No results match your search</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Try a different exam or organization name.</p>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <ListItemCard
              key={r.id}
              href={`/results/${r.slug}`}
              eyebrow={r.organization}
              title={r.title}
              description={r.summary}
              category={r.category}
              meta={`Declared ${formatDate(r.resultDate)}`}
              isNew={isRecent(r.resultDate)}
            />
          ))}
        </div>
      )}
    </div>
  );
}