"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/Button";
import { PipeTable } from "@/components/admin/DraftFormShared";
import { buildPipeTable } from "@/lib/pipeTables";

export interface TableBuilderValue {
  columns: string[];
  rows: string[][];
}

export function emptyTableBuilderValue(): TableBuilderValue {
  return { columns: ["", ""], rows: [["", ""]] };
}

export function tableBuilderToPipeText(value: TableBuilderValue): string {
  const columns = value.columns.map((c) => c.trim());
  if (columns.every((c) => !c)) return "";
  return buildPipeTable(columns, value.rows);
}

export function TableBuilder({
  value,
  onChange,
  hint,
}: {
  value: TableBuilderValue;
  onChange: (value: TableBuilderValue) => void;
  hint?: string;
}) {
  const setColumn = (i: number, text: string) => {
    const columns = value.columns.map((c, idx) => (idx === i ? text : c));
    onChange({ ...value, columns });
  };

  const addColumn = () => {
    onChange({
      columns: [...value.columns, ""],
      rows: value.rows.map((row) => [...row, ""]),
    });
  };

  const removeColumn = (i: number) => {
    if (value.columns.length <= 1) return;
    onChange({
      columns: value.columns.filter((_, idx) => idx !== i),
      rows: value.rows.map((row) => row.filter((_, idx) => idx !== i)),
    });
  };

  const setCell = (rowIdx: number, colIdx: number, text: string) => {
    const rows = value.rows.map((row, r) => (r === rowIdx ? row.map((c, cIdx) => (cIdx === colIdx ? text : c)) : row));
    onChange({ ...value, rows });
  };

  const addRow = () => {
    onChange({ ...value, rows: [...value.rows, value.columns.map(() => "")] });
  };

  const removeRow = (rowIdx: number) => {
    onChange({ ...value, rows: value.rows.filter((_, r) => r !== rowIdx) });
  };

  const pipeText = tableBuilderToPipeText(value);

  return (
    <div className="space-y-3">
      {hint && <p className="text-xs text-[var(--color-text-secondary)]">{hint}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full min-w-[480px] text-xs">
          <thead>
            <tr className="bg-[var(--color-background)]">
              {value.columns.map((col, i) => (
                <th key={i} className="p-1.5">
                  <div className="flex items-center gap-1">
                    <input
                      value={col}
                      onChange={(e) => setColumn(i, e.target.value)}
                      placeholder={`Column ${i + 1}`}
                      className="w-full min-w-[110px] rounded-[var(--radius-control)] border border-[var(--color-border)] bg-white px-2 py-1.5 text-xs font-semibold text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                    />
                    <button
                      type="button"
                      onClick={() => removeColumn(i)}
                      disabled={value.columns.length <= 1}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[var(--color-danger)] hover:bg-[var(--color-danger-tint)] disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Remove column"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </th>
              ))}
              <th className="w-9 p-1.5">
                <button
                  type="button"
                  onClick={addColumn}
                  className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-primary)] hover:bg-[var(--color-primary-tint)]"
                  aria-label="Add column"
                >
                  <Plus size={14} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {value.rows.map((row, r) => (
              <tr key={r}>
                {value.columns.map((_, c) => (
                  <td key={c} className="p-1.5">
                    <input
                      value={row[c] ?? ""}
                      onChange={(e) => setCell(r, c, e.target.value)}
                      className="w-full min-w-[110px] rounded-[var(--radius-control)] border border-[var(--color-border)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]"
                    />
                  </td>
                ))}
                <td className="p-1.5 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(r)}
                    disabled={value.rows.length <= 1}
                    className="flex h-7 w-7 items-center justify-center rounded text-[var(--color-danger)] hover:bg-[var(--color-danger-tint)] disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Remove row"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button type="button" variant="secondary" size="sm" onClick={addRow}>
        <Plus size={14} /> Add Row
      </Button>

      {pipeText && (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Preview
          </p>
          <PipeTable text={pipeText} />
        </div>
      )}
    </div>
  );
}
