"use client";

import { Plus, Trash2 } from "lucide-react";
import { parsePipeTables } from "@/lib/pipeTables";
import { Button } from "@/components/Button";
import { TextField, TextAreaField } from "@/components/FormField";
import { IconButton } from "@/components/admin/IconButton";
import { DraftType } from "@/lib/types";

export interface AgeLimitRowDraft {
  grade: string;
  minAge: string;
  maxAge: string;
}

export interface AgeRelaxationRowDraft {
  category: string;
  relaxation: string;
}

export interface LinkRowDraft {
  label: string;
  url: string;
}

export interface FaqDraft {
  question: string;
  answer: string;
}

export interface SectionDraft {
  heading: string;
  content: string;
}

export const TYPE_LABELS: Record<DraftType, string> = {
  job: "Job",
  result: "Result",
  admit_card: "Admit Card",
};

export const JOB_DATE_FIELDS: { key: string; label: string }[] = [
  { key: "dateApplicationStart", label: "Application Start" },
  { key: "dateApplicationEnd", label: "Application End" },
  { key: "dateCorrectionDate", label: "Correction Date" },
  { key: "dateExamDate", label: "Exam Date" },
  { key: "dateAdmitCardRelease", label: "Admit Card Release" },
  { key: "dateResultDate", label: "Result Date" },
];

export function PipeTable({ text }: { text?: string }) {
  if (!text) return null;
  const tables = parsePipeTables(text);
  if (tables.length === 0) return null;
  return (
    <div className="space-y-3">
      {tables.map((t, i) => (
        <div key={i} className="space-y-1.5">
          {t.caption && <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">{t.caption}</p>}
          <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--color-primary)] text-left text-white">
                    {t.header.map((cell, j) => (
                      <th key={j} className="px-3 py-2 align-top font-semibold">
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {t.body.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => (
                        <td key={c} className="whitespace-normal break-words px-3 py-2 align-top text-[var(--color-text-secondary)]">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RawTableField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <TextAreaField label={label} value={value} onChange={(e) => onChange(e.target.value)} hint={hint} rows={4} />
      {value.trim() && (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            Preview
          </p>
          <PipeTable text={value} />
        </div>
      )}
    </div>
  );
}

export function RowsEditor<T extends Record<string, string>>({
  rows,
  setRows,
  fields,
  addLabel,
  newRow,
}: {
  rows: T[];
  setRows: (updater: (prev: T[]) => T[]) => void;
  fields: { key: keyof T & string; label: string; multiline?: boolean }[];
  addLabel: string;
  newRow: T;
}) {
  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="rounded-lg border border-[var(--color-border)] p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              {fields.map((f) => {
                const Field = f.multiline ? TextAreaField : TextField;
                return (
                  <Field
                    key={f.key}
                    label={f.label}
                    value={row[f.key] ?? ""}
                    onChange={(e) =>
                      setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [f.key]: e.target.value } : r)))
                    }
                  />
                );
              })}
            </div>
            <IconButton
              icon={<Trash2 size={15} />}
              label="Remove row"
              tone="danger"
              onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
            />
          </div>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={() => setRows((prev) => [...prev, newRow])}>
        <Plus size={14} /> {addLabel}
      </Button>
    </div>
  );
}

export function SectionDivider({ label }: { label: string }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
  );
}

export function pipeRowsToLines(text: string, tableSep: string): string[] {
  return text.split(tableSep).flatMap((chunk) => {
    const rows = chunk.split(" || ").map((row) => row.trim()).filter(Boolean);
    if (!chunk.includes(" | ")) {
      return rows;
    }
    return rows
      .slice(1)
      .map((row) =>
        row
          .split(" | ")
          .map((c) => c.trim())
          .filter(Boolean)
          .join(": ")
      )
      .filter(Boolean);
  });
}
