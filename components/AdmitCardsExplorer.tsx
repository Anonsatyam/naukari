"use client";

import { useEffect, useState } from "react";
import { IdCard } from "lucide-react";
import { AdmitCardItem } from "@/lib/types";
import { isRecent } from "@/lib/dateHelpers";
import { formatDate } from "@/lib/utils";
import Breadcrumb from "@/components/Breadcrumb";
import ListItemCard from "@/components/ListItemCard";
import SearchInput from "@/components/SearchInput";
import Card from "@/components/Card";

export default function AdmitCardsExplorer() {
  const [query, setQuery] = useState("");
  const [admitCards, setAdmitCards] = useState<AdmitCardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());

      setLoading(true);
      fetch(`/api/admit-cards?${params.toString()}`)
        .then((res) => res.json())
        .then((data: { admitCards: AdmitCardItem[] }) => setAdmitCards(data.admitCards))
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(handle);
  }, [query]);

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

      {loading ? (
        <Card padding="p-10" className="mt-6 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">Loading admit cards…</p>
        </Card>
      ) : admitCards.length === 0 ? (
        <Card padding="p-10" className="mt-6 border-dashed text-center">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            {query ? "No admit cards match your search" : "No admit cards published yet"}
          </p>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            {query ? "Try a different exam or organization name." : "Check back once admit cards have been released."}
          </p>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {admitCards.map((a) => (
            <ListItemCard
              key={a.id}
              href={`/admit-cards/${a.slug}`}
              eyebrow={a.organization}
              title={a.title}
              category={a.category}
              tags={a.tags}
              meta={`Exam on ${formatDate(a.examDate)}`}
              isNew={isRecent(a.releaseDate)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
