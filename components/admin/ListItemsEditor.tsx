"use client";

import { useRef } from "react";
import { ArrowDown, ArrowUp, Link2, Plus, Trash2 } from "lucide-react";
import { insertInlineLink } from "@/lib/richText";
import { InlineRichText } from "@/components/DetailSections";
import { Button } from "@/components/Button";
import { fieldInputClass } from "@/lib/ui";

function ListItemRow({
  value,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addLink = () => {
    const input = inputRef.current;
    if (!input) return;
    const url = window.prompt("Link URL:");
    if (!url) return;
    const { text, cursor } = insertInlineLink(value, input.selectionStart ?? value.length, input.selectionEnd ?? value.length, url);
    onChange(text);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="rounded-lg border border-[var(--color-border)] p-2.5">
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${fieldInputClass} py-2`}
          placeholder="List item text — select a word or phrase, then click the link icon"
        />
        <button
          type="button"
          onClick={addLink}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-primary)] hover:bg-[var(--color-primary-tint)]"
          aria-label="Add link to selected text"
          title="Select text above, then click to link it"
        >
          <Link2 size={15} />
        </button>
        <button
          type="button"
          onClick={onMoveUp}
          disabled={!canMoveUp}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Move up"
        >
          <ArrowUp size={15} />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={!canMoveDown}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Move down"
        >
          <ArrowDown size={15} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-danger)] hover:bg-[var(--color-danger-tint)]"
          aria-label="Delete item"
        >
          <Trash2 size={15} />
        </button>
      </div>
      {value.trim() && (
        <p className="mt-1.5 pl-1 text-xs leading-relaxed text-[var(--color-text-secondary)]">
          <InlineRichText text={value} />
        </p>
      )}
    </div>
  );
}

export function ListItemsEditor({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  const setItem = (i: number, value: string) => onChange(items.map((it, idx) => (idx === i ? value : it)));
  const removeItem = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const addItem = () => onChange([...items, ""]);
  const move = (i: number, dir: -1 | 1) => {
    const target = i + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[i], next[target]] = [next[target], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <ListItemRow
          key={i}
          value={item}
          onChange={(v) => setItem(i, v)}
          onRemove={() => removeItem(i)}
          onMoveUp={() => move(i, -1)}
          onMoveDown={() => move(i, 1)}
          canMoveUp={i > 0}
          canMoveDown={i < items.length - 1}
        />
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={addItem}>
        <Plus size={14} /> Add List Item
      </Button>
    </div>
  );
}
