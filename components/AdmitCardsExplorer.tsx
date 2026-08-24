"use client";

import { useCallback } from "react";
import { IdCard } from "lucide-react";
import { admitCards, isRecent } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { useTextFilter } from "@/lib/useTextFilter";
import Breadcrumb from "@/components/Breadcrumb";
import ListItemCard from "@/components/ListItemCard";
import SearchInput from "@/components/SearchInput";
import Card from "@/components/Card";

export default function AdmitCardsExplorer() {
  const getSearchableText = useCallback(
    (a: (typeof admitCards)[number]) => `${a.title} ${a.organization} ${a.category}`,
    []
  );
  const { query, setQuery, filtered } = useTextFilter(admitCards, getSearchableText);

  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Admit Cards" }]} />

      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
          <IdCard size={18} />
        </span>
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
          Admit Cards
        </h1>
      </div>

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search admit cards by exam or organization"
        className="mt-4 sm:max-w-md"
      />

      {filtered.length === 0 ? (
        <Card padding="p-10" className="mt-6 border-dashed text-center">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">No admit cards match your search</p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Try a different exam or organization name.</p>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <ListItemCard
              key={a.id}
              href={`/admit-cards/${a.slug}`}
              eyebrow={a.organization}
              title={a.title}
              category={a.category}
              meta={`Exam on ${formatDate(a.examDate)}`}
              isNew={isRecent(a.releaseDate)}
            />
          ))}
        </div>
      )}
    </div>
  );
}