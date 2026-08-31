"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { AdditionalSection, AdditionalSectionKind, TableCellValue } from "@/lib/types";
import { buildPipeTable } from "@/lib/pipeTables";
import { Button } from "@/components/Button";
import { TextField, TextAreaField } from "@/components/FormField";
import { fieldInputClass, fieldLabelClass } from "@/lib/ui";
import { ChipInput } from "@/components/admin/ChipInput";
import { RowsEditor, LinkRowDraft } from "@/components/admin/DraftFormShared";
import {
  TableBuilder,
  TableBuilderValue,
  emptyTableBuilderValue,
  pipeTextToTableBuilderValue,
} from "@/components/admin/TableBuilder";

function cellToPlainText(cell: TableCellValue): string {
  if (cell.type === "text") return cell.value;
  if (cell.type === "list") return cell.items.filter(Boolean).join("; ");
  return cell.label || cell.url;
}

export interface DateRowDraft {
  label: string;
  date: string;
}

export interface DynamicSectionDraft {
  id: string;
  heading: string;
  kind: AdditionalSectionKind;
  table: TableBuilderValue;
  list: string;
  links: LinkRowDraft[];
  dates: DateRowDraft[];
  chips: string[];
  text: string;
}

const KIND_LABELS: Record<AdditionalSectionKind, string> = {
  table: "Table",
  list: "List",
  links: "Links",
  dates: "Dates",
  chips: "Chips",
  text: "Text",
};

let nextId = 0;
function newId(): string {
  nextId += 1;
  return `section-${Date.now()}-${nextId}`;
}

export function newSectionDraft(kind: AdditionalSectionKind = "table"): DynamicSectionDraft {
  return {
    id: newId(),
    heading: "",
    kind,
    table: emptyTableBuilderValue(),
    list: "",
    links: [],
    dates: [],
    chips: [],
    text: "",
  };
}

export function sectionToDraft(section: AdditionalSection): DynamicSectionDraft {
  const kind = section.kind ?? "table";
  const table =
    kind === "table"
      ? Array.isArray(section.tableHeader) && Array.isArray(section.tableRows)
        ? { columns: section.tableHeader, rows: section.tableRows }
        : pipeTextToTableBuilderValue(section.content ?? "")
      : emptyTableBuilderValue();
  return {
    id: newId(),
    heading: section.heading ?? "",
    kind,
    table,
    list: kind === "list" ? (section.content ?? "").split(" || ").join("\n") : "",
    links: kind === "links" ? section.links ?? [] : [],
    dates: kind === "dates" ? section.dates ?? [] : [],
    chips: kind === "chips" ? section.chips ?? [] : [],
    text: kind === "text" ? section.content ?? "" : "",
  };
}

export function draftToSection(draft: DynamicSectionDraft): AdditionalSection | null {
  const heading = draft.heading.trim();
  if (!heading) return null;

  if (draft.kind === "table") {
    const columns = draft.table.columns.map((c) => c.trim());
    if (columns.every((c) => !c)) return null;
    const content = buildPipeTable(columns, draft.table.rows.map((row) => row.map(cellToPlainText)));
    return { heading, kind: "table", tableHeader: columns, tableRows: draft.table.rows, content };
  }
  if (draft.kind === "list") {
    const items = draft.list.split("\n").map((s) => s.trim()).filter(Boolean);
    return items.length > 0 ? { heading, kind: "list", content: items.join(" || ") } : null;
  }
  if (draft.kind === "links") {
    const links = draft.links.filter((l) => l.label.trim() || l.url.trim());
    return links.length > 0 ? { heading, kind: "links", links } : null;
  }
  if (draft.kind === "dates") {
    const dates = draft.dates.filter((d) => d.label.trim() && d.date.trim());
    return dates.length > 0 ? { heading, kind: "dates", dates } : null;
  }
  if (draft.kind === "chips") {
    return draft.chips.length > 0 ? { heading, kind: "chips", chips: draft.chips } : null;
  }
  const text = draft.text.trim();
  return text ? { heading, kind: "text", content: text } : null;
}

export function draftsToSections(drafts: DynamicSectionDraft[]): AdditionalSection[] {
  return drafts.map(draftToSection).filter((s): s is AdditionalSection => s !== null);
}

export function DynamicSectionsEditor({
  sections,
  setSections,
}: {
  sections: DynamicSectionDraft[];
  setSections: (updater: (prev: DynamicSectionDraft[]) => DynamicSectionDraft[]) => void;
}) {
  const update = (id: string, patch: Partial<DynamicSectionDraft>) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const remove = (id: string) => setSections((prev) => prev.filter((s) => s.id !== id));

  const move = (id: string, dir: -1 | 1) =>
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const target = idx + dir;
      if (idx === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });

  const add = () => setSections((prev) => [...prev, newSectionDraft()]);

  return (
    <div className="space-y-4">
      {sections.map((section, i) => (
        <div key={section.id} className="rounded-lg border border-[var(--color-border)] p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <TextField
                label="Section Name"
                value={section.heading}
                onChange={(e) => update(section.id, { heading: e.target.value })}
                placeholder="e.g. Important Dates, Age Limit, Physical Test..."
              />
            </div>
            <div className="w-40">
              <label className={fieldLabelClass}>Content Type</label>
              <select
                value={section.kind}
                onChange={(e) => update(section.id, { kind: e.target.value as AdditionalSectionKind })}
                className={fieldInputClass}
              >
                {(Object.keys(KIND_LABELS) as AdditionalSectionKind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-5 flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => move(section.id, -1)}
                disabled={i === 0}
                className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Move up"
              >
                <ArrowUp size={15} />
              </button>
              <button
                type="button"
                onClick={() => move(section.id, 1)}
                disabled={i === sections.length - 1}
                className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Move down"
              >
                <ArrowDown size={15} />
              </button>
              <button
                type="button"
                onClick={() => remove(section.id)}
                className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-danger)] hover:bg-[var(--color-danger-tint)]"
                aria-label="Remove section"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          <div className="mt-3">
            {section.kind === "table" && (
              <TableBuilder value={section.table} onChange={(table) => update(section.id, { table })} />
            )}
            {section.kind === "list" && (
              <TextAreaField
                label="Items"
                value={section.list}
                onChange={(e) => update(section.id, { list: e.target.value })}
                hint="One item per line — shown as a bulleted list."
              />
            )}
            {section.kind === "links" && (
              <RowsEditor
                rows={section.links}
                setRows={(updater) => update(section.id, { links: updater(section.links) })}
                fields={[
                  { key: "label", label: "Label" },
                  { key: "url", label: "URL" },
                ]}
                addLabel="Add Link"
                newRow={{ label: "", url: "" }}
              />
            )}
            {section.kind === "dates" && (
              <div className="space-y-3">
                {section.dates.map((row, r) => (
                  <div key={r} className="flex items-end gap-2 rounded-lg border border-[var(--color-border)] p-3">
                    <div className="flex-1">
                      <TextField
                        label="Label"
                        value={row.label}
                        onChange={(e) => {
                          const dates = section.dates.map((d, idx) => (idx === r ? { ...d, label: e.target.value } : d));
                          update(section.id, { dates });
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <TextField
                        label="Date"
                        type="date"
                        value={row.date}
                        onChange={(e) => {
                          const dates = section.dates.map((d, idx) => (idx === r ? { ...d, date: e.target.value } : d));
                          update(section.id, { dates });
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => update(section.id, { dates: section.dates.filter((_, idx) => idx !== r) })}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-danger)] hover:bg-[var(--color-danger-tint)]"
                      aria-label="Remove date"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => update(section.id, { dates: [...section.dates, { label: "", date: "" }] })}
                >
                  <Plus size={14} /> Add Date
                </Button>
              </div>
            )}
            {section.kind === "chips" && (
              <ChipInput label="Chips" value={section.chips} onChange={(chips) => update(section.id, { chips })} />
            )}
            {section.kind === "text" && (
              <TextAreaField
                label="Text"
                value={section.text}
                onChange={(e) => update(section.id, { text: e.target.value })}
              />
            )}
          </div>
        </div>
      ))}

      <Button type="button" variant="secondary" size="sm" onClick={add}>
        <Plus size={14} /> Add Section
      </Button>
    </div>
  );
}
