"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { fieldInputClass, fieldLabelClass } from "@/lib/ui";

export function ChipInput({
  label,
  value,
  onChange,
  hint,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  hint?: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const tag = draft.trim();
    if (!tag) return;
    if (!value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  };

  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      <label className={fieldLabelClass}>{label}</label>
      <div className={`${fieldInputClass} flex flex-wrap items-center gap-1.5 py-2`}>
        {value.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-tint)] px-2.5 py-1 text-xs font-medium text-[var(--color-primary)]"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="text-[var(--color-primary)]/70 hover:text-[var(--color-primary)]"
              aria-label={`Remove ${tag}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            } else if (e.key === "Backspace" && !draft && value.length > 0) {
              removeAt(value.length - 1);
            }
          }}
          onBlur={commit}
          placeholder={value.length === 0 ? (placeholder ?? "Type a tag and press Enter") : ""}
          className="min-w-[120px] flex-1 border-none bg-transparent p-0 text-sm text-[var(--color-text-primary)] outline-none"
        />
      </div>
      {hint && <p className="mt-1 text-xs text-[var(--color-text-muted)]">{hint}</p>}
    </div>
  );
}
