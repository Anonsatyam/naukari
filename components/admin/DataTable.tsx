"use client";

import { flexRender, Table } from "@tanstack/react-table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { LoadingState } from "@/components/LoadingState";

/**
 * Thin renderer around a TanStack `Table` instance — a real <table>, styled
 * to match this app's existing admin list look. Shared by Drafts and Manage
 * Jobs so neither hand-rolls its own header/sort/row markup.
 */
export function DataTable<T>({
  table,
  loading,
  emptyMessage,
  loadingMessage,
}: {
  table: Table<T>;
  loading: boolean;
  emptyMessage: string;
  loadingMessage: string;
}) {
  const rows = table.getRowModel().rows;
  const columnCount = table.getAllLeafColumns().length;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-[var(--color-border)] bg-[var(--color-background)] text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sortDir = header.column.getIsSorted();
                return (
                  <th key={header.id} className="whitespace-nowrap px-4 py-3">
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="flex items-center gap-1 hover:text-[var(--color-text-primary)]"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sortDir === "asc" ? (
                          <ArrowUp size={12} />
                        ) : sortDir === "desc" ? (
                          <ArrowDown size={12} />
                        ) : (
                          <ArrowUpDown size={12} className="opacity-40" />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {loading ? (
            <tr>
              <td colSpan={columnCount}>
                <LoadingState label={loadingMessage} />
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="p-4 text-sm text-[var(--color-text-secondary)]">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
