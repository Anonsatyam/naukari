"use client";

import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { TableCellValue } from "@/lib/types";
import { Button } from "@/components/Button";
import { RichTable } from "@/components/DetailSections";
import { ListItemsEditor } from "@/components/admin/ListItemsEditor";
import { IconButton } from "@/components/admin/IconButton";
import { compactFieldClass, compactSelectClass } from "@/lib/ui";
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
  date: "Date",
  link: "Link",
  button: "Button",
  list: "List",
};

function emptyCellOfType(type: TableCellValue["type"]): TableCellValue {
  if (type === "text" || type === "date") return { type, value: "" };
  if (type === "list") return { type: "list", items: [] };
  return { type, label: "", url: "" };
}

function TableCellEditor({ cell, onChange }: { cell: TableCellValue; onChange: (cell: TableCellValue) => void }) {
  return (
    <div className="w-[150px] space-y-1.5">
      <div className="relative">
        <select
          aria-label="Cell type"
          value={cell.type}
          onChange={(e) => onChange(emptyCellOfType(e.target.value as TableCellValue["type"]))}
          className={compactSelectClass}
        >
          {(Object.keys(CELL_TYPE_LABELS) as TableCellValue["type"][]).map((t) => (
            <option key={t} value={t}>
              {CELL_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <ChevronDown
          size={12}
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
        />
      </div>

      {cell.type === "text" && (
        <input
          value={cell.value}
          onChange={(e) => onChange({ type: "text", value: e.target.value })}
          className={compactFieldClass}
        />
      )}

      {cell.type === "date" && (
        <input
          type="date"
          value={cell.value}
          onChange={(e) => onChange({ type: "date", value: e.target.value })}
          className={compactFieldClass}
        />
      )}

      {(cell.type === "link" || cell.type === "button") && (
        <>
          <input
            value={cell.label}
            onChange={(e) => onChange({ ...cell, label: e.target.value })}
            placeholder="Label"
            className={compactFieldClass}
          />
          <input
            value={cell.url}
            onChange={(e) => onChange({ ...cell, url: e.target.value })}
            placeholder="URL"
            className={compactFieldClass}
          />
        </>
      )}

      {cell.type === "list" && (
        <div className="min-w-[200px]">
          <ListItemsEditor items={cell.items} onChange={(items) => onChange({ type: "list", items })} />
        </div>
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
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[var(--color-background)]">
              {value.columns.map((col, i) => (
                <th key={i} className="p-1.5">
                  <div className="flex items-center gap-1">
                    <input
                      value={col}
                      onChange={(e) => setColumn(i, e.target.value)}
                      placeholder={`Column ${i + 1}`}
                      className={`${compactFieldClass} font-semibold`}
                    />
                    <IconButton
                      icon={<Trash2 size={12} />}
                      label="Remove column"
                      tone="danger"
                      size="sm"
                      onClick={() => removeColumn(i)}
                      disabled={value.columns.length <= 1}
                    />
                  </div>
                </th>
              ))}
              <th className="w-9 p-1.5">
                <IconButton icon={<Plus size={14} />} label="Add column" tone="primary" size="sm" onClick={addColumn} />
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
                  <IconButton
                    icon={<Trash2 size={13} />}
                    label="Remove row"
                    tone="danger"
                    size="sm"
                    onClick={() => removeRow(r)}
                    disabled={value.rows.length <= 1}
                  />
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
