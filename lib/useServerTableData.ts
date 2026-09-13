"use client";

import { useEffect, useState } from "react";
import type { SortingState, Updater } from "@tanstack/react-table";
import { DEFAULT_PAGE_SIZE, PageSize } from "@/lib/pagination";

interface ServerTableState<T> {
  rows: T[];
  total: number;
  loading: boolean;
  page: number;
  pageSize: PageSize;
  setPage: (page: number) => void;
  setPageSize: (size: PageSize) => void;
  search: string;
  setSearch: (value: string) => void;
  sorting: SortingState;
  setSorting: (updater: Updater<SortingState>) => void;
  totalPages: number;
  reload: () => void;
}

/**
 * Shared server-driven pagination/search/sort state + fetch, used by both
 * the Drafts and Manage Jobs admin tables so neither duplicates this logic.
 * `endpoint` must accept ?page=&pageSize=&search=&sortBy=&sortDir= and
 * respond with `{ [rowsKey]: T[], total: number }`.
 */
export function useServerTableData<T>(
  endpoint: string,
  rowsKey: string,
  initialSort: SortingState
): ServerTableState<T> {
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sorting, setSortingState] = useState<SortingState>(initialSort);
  const [reloadTick, setReloadTick] = useState(0);

  // Debounce the raw search input before it drives a fetch.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handle);
  }, [search]);

  // Reset to page 1 whenever the (debounced) search term actually changes —
  // done during render (comparing against the previous value we've seen)
  // rather than in an effect, per this project's react-hooks/set-state-in-effect
  // convention for prop/state-driven resets.
  const [prevDebouncedSearch, setPrevDebouncedSearch] = useState(debouncedSearch);
  if (debouncedSearch !== prevDebouncedSearch) {
    setPrevDebouncedSearch(debouncedSearch);
    setPage(1);
  }

  const setPageSize = (size: PageSize) => {
    setPageSizeState(size);
    setPage(1);
  };

  const setSorting = (updater: Updater<SortingState>) => {
    setSortingState((prev) => (typeof updater === "function" ? updater(prev) : updater));
    setPage(1);
  };

  const reload = () => setReloadTick((t) => t + 1);

  // Flip back to "loading" as soon as a new request is about to be fired —
  // computed during render (comparing against the last request we started)
  // rather than as a synchronous setState at the top of the effect, per this
  // project's react-hooks/set-state-in-effect convention.
  const requestKey = JSON.stringify([page, pageSize, debouncedSearch, sorting]);
  const [lastStartedKey, setLastStartedKey] = useState(requestKey);
  if (requestKey !== lastStartedKey) {
    setLastStartedKey(requestKey);
    setLoading(true);
  }

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    const term = debouncedSearch.trim();
    if (term) params.set("search", term);
    const sort = sorting[0];
    if (sort) {
      params.set("sortBy", sort.id);
      params.set("sortDir", sort.desc ? "desc" : "asc");
    }

    let cancelled = false;
    fetch(`${endpoint}?${params.toString()}`)
      .then((res) => res.json())
      .then((data: Record<string, unknown>) => {
        if (cancelled) return;
        setRows((data[rowsKey] as T[]) ?? []);
        setTotal(typeof data.total === "number" ? data.total : 0);
        // The server clamps an out-of-range page (e.g. after a delete makes
        // the current page disappear) — reflect that back so the pagination
        // bar doesn't stay stuck on a page that no longer exists.
        if (typeof data.page === "number" && data.page !== page) setPage(data.page);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint, rowsKey, page, pageSize, debouncedSearch, sorting, reloadTick]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    rows,
    total,
    loading,
    page,
    pageSize,
    setPage,
    setPageSize,
    search,
    setSearch,
    sorting,
    setSorting,
    totalPages,
    reload,
  };
}
