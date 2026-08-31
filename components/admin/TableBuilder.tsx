"use client";

import { Plus, Trash2 } from "lucide-react";
import { TableCellValue } from "@/lib/types";
import { Button } from "@/components/Button";
import { RichTable } from "@/components/DetailSections";
import { parsePipeTables } from "@/lib/pipeTables";

export interface TableBuilderValue {
  columns: string[];
  rows: TableCellValue[][];
}

export function emptyTextCell(): TableCellValue {
  return { type: "text", value: "" };
}

export function emptyTableBuilderValue(): TableBuilderValue {
  return { columns: ["", ""], rows: [[emptyTextCell(), emptyTextCell()]] };
}

export function pipeTextToTableBuilderValue(text: string): TableBuilderValue {
  const table = parsePipeTables(text)[0];
  if (!table) return emptyTableBuilderValue();
  const rows = table.body.length > 0 ? table.body : [table.header.map(() => "")];
  return {
    columns: table.header,
    rows: rows.map((row) => row.map((cell): TableCellValue => ({ type: "text", value: cell }))),
  };
}

const CELL_TYPE_LABELS: Record<TableCellValue["type"], string> = {
  text: "Text",
  link: "Link",
  button: "Button",
  list: "List",
};

function emptyCellOfType(type: TableCellValue["type"]): TableCellValue {
  if (type === "text") return { type: "text", value: "" };
  if (type === "list") return { type: "list", items: [] };
  return { type, label: "", url: "" };
}

function TableCellEditor({ cell, onChange }: { cell: TableCellValue; onChange: (cell: TableCellValue) => void }) {
  const selectClass =
    "w-full rounded border border-[var(--color-border)] bg-white px-1.5 py-1 text-[10px] font-medium text-[var(--color-text-secondary)] outline-none focus:border-[var(--color-primary)]";
  const inputClass =
    "mt-1 w-full min-w-[100px] rounded-[var(--radius-control)] border border-[var(--color-border)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary)]";

  return (
    <div className="min-w-[130px]">
      <select
        value={cell.type}
        onChange={(e) => onChange(emptyCellOfType(e.target.value as TableCellValue["type"]))}
        className={selectClass}
      >
        {(Object.keys(CELL_TYPE_LABELS) as TableCellValue["type"][]).map((t) => (
          <option key={t} value={t}>
            {CELL_TYPE_LABELS[t]}
          </option>
        ))}
      </select>

      {cell.type === "text" && (
        <input
          value={cell.value}
          onChange={(e) => onChange({ type: "text", value: e.target.value })}
          className={inputClass}
        />
      )}

      {(cell.type === "link" || cell.type === "button") && (
        <>
          <input
            value={cell.label}
            onChange={(e) => onChange({ ...cell, label: e.target.value })}
            placeholder="Label"
            className={inputClass}
          />
          <input
            value={cell.url}
            onChange={(e) => onChange({ ...cell, url: e.target.value })}
            placeholder="URL"
            className={inputClass}
          />
        </>
      )}

      {cell.type === "list" && (
        <textarea
          value={cell.items.join("\n")}
          onChange={(e) => onChange({ type: "list", items: e.target.value.split("\n") })}
          placeholder="One item per line"
          rows={3}
          className={`${inputClass} resize-y`}
        />
      )}
    </div>
  );
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
      rows: value.rows.map((row) => [...row, emptyTextCell()]),
    });
  };

  const removeColumn = (i: number) => {
    if (value.columns.length <= 1) return;
    onChange({
      columns: value.columns.filter((_, idx) => idx !== i),
      rows: value.rows.map((row) => row.filter((_, idx) => idx !== i)),
    });
  };

  const setCell = (rowIdx: number, colIdx: number, cell: TableCellValue) => {
    const rows = value.rows.map((row, r) => (r === rowIdx ? row.map((c, cIdx) => (cIdx === colIdx ? cell : c)) : row));
    onChange({ ...value, rows });
  };

  const addRow = () => {
    onChange({ ...value, rows: [...value.rows, value.columns.map(() => emptyTextCell())] });
  };

  const removeRow = (rowIdx: number) => {
    onChange({ ...value, rows: value.rows.filter((_, r) => r !== rowIdx) });
  };

  const hasContent = value.columns.some((c) => c.trim());

  return (
    <div className="space-y-3">
      {hint && <p className="text-xs text-[var(--color-text-secondary)]">{hint}</p>}

      <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full min-w-[560px] text-xs">
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
                  <td key={c} className="p-1.5 align-top">
                    <TableCellEditor cell={row[c] ?? emptyTextCell()} onChange={(cell) => setCell(r, c, cell)} />
                  </td>
                ))}
                <td className="p-1.5 text-center align-top">
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

      {hasContent && (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Preview
          </p>
          <RichTable header={value.columns} rows={value.rows} />
        </div>
      )}
    </div>
  );
}
