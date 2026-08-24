"use client";

import { useMemo, useState } from "react";

export function useTextFilter<T>(items: T[], getSearchableText: (item: T) => string) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((item) => getSearchableText(item).toLowerCase().includes(q));
  }, [items, query, getSearchableText]);

  return { query, setQuery, filtered };
}
