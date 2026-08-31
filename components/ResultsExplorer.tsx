"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { ResultItem } from "@/lib/types";
import { isRecent } from "@/lib/dateHelpers";
import { formatDate } from "@/lib/utils";
import Breadcrumb from "@/components/Breadcrumb";
import ListItemCard from "@/components/ListItemCard";
import SearchInput from "@/components/SearchInput";
import Card from "@/components/Card";

export default function ResultsExplorer() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());

      setLoading(true);
      fetch(`/api/results?${params.toString()}`)
        .then((res) => res.json())
        .then((data: { results: ResultItem[] }) => setResults(data.results))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(handle);
  }, [query]);

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

      {loading ? (
        <Card padding="p-10" className="mt-6 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">Loading results…</p>
        </Card>
      ) : results.length === 0 ? (
        <Card padding="p-10" className="mt-6 border-dashed text-center">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            {query ? "No results match your search" : "No results published yet"}
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {query ? "Try a different exam or organization name." : "Check back once results have been declared."}
          </p>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => (
            <ListItemCard
              key={r.id}
              href={`/results/${r.slug}`}
              eyebrow={r.organization}
              title={r.title}
              description={r.summary}
              category={r.category}
              tags={r.tags}
              meta={`Declared ${formatDate(r.resultDate)}`}
              isNew={isRecent(r.resultDate)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
