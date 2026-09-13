// Shared between server (API routes / data layer) and client (PaginationBar's
// page-size select) so both sides always agree on the allowed page sizes.
export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 20;

/** Never trust a client-supplied page size directly — clamp to the allow-list. */
export function clampPageSize(value: number | string | null | undefined): PageSize {
  const n = typeof value === "string" ? Number(value) : value;
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n as number) ? (n as PageSize) : DEFAULT_PAGE_SIZE;
}

/** Escapes ilike wildcard characters so a literal "%" or "_" in a search term is matched literally. */
export function escapeIlikeTerm(term: string): string {
  return term.replace(/[%_]/g, "\\$&");
}
