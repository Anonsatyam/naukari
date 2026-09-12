import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { fieldInputClass, fieldLabelClass, selectFieldClass } from "@/lib/ui";
import { autoFormatDmy, dmyToIso, isoToDmy } from "@/lib/dateFormat";

interface BaseProps {
  label: string;
  className?: string;
}

export function TextField({
  label,
  className,
  trailing,
  ...rest
}: BaseProps & { trailing?: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  const input = <input className={cn(fieldInputClass, Boolean(trailing) && "flex-1", className)} {...rest} />;
  return (
    <div>
      <label className={fieldLabelClass}>{label}</label>
      {trailing ? (
        <div className="flex items-center gap-1.5">
          {input}
          {trailing}
        </div>
      ) : (
        input
      )}
    </div>
  );
}

export function TextAreaField({
  label,
  className,
  hint,
  trailing,
  ...rest
}: BaseProps & { hint?: string; trailing?: React.ReactNode } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const textarea = (
    <textarea className={cn(fieldInputClass, "min-h-[88px] resize-y", Boolean(trailing) && "flex-1", className)} {...rest} />
  );
  return (
    <div>
      <label className={fieldLabelClass}>{label}</label>
      {trailing ? (
        <div className="flex items-start gap-1.5">
          {textarea}
          {trailing}
        </div>
      ) : (
        textarea
      )}
      {hint && <p className="mt-1 text-xs text-[var(--color-text-muted)]">{hint}</p>}
    </div>
  );
}

export interface SelectFieldOption {
  value: string;
  label: string;
}

export function SelectField({
  label,
  className,
  options,
  hideLabel,
  trailing,
  ...rest
}: BaseProps & {
  options: (string | SelectFieldOption)[];
  hideLabel?: boolean;
  trailing?: React.ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const select = (
    <div className={cn("relative", Boolean(trailing) && "flex-1")}>
      <select aria-label={hideLabel ? label : undefined} className={cn(selectFieldClass, className)} {...rest}>
        {options.map((opt) => {
          const value = typeof opt === "string" ? opt : opt.value;
          const text = typeof opt === "string" ? opt : opt.label;
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
      </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
      />
    </div>
  );
  return (
    <div>
      {!hideLabel && <label className={fieldLabelClass}>{label}</label>}
      {trailing ? (
        <div className="flex items-center gap-1.5">
          {select}
          {trailing}
        </div>
      ) : (
        select
      )}
    </div>
  );
}

export function SearchableSelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Search and select…",
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = options.filter((opt) => opt.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className={className} ref={containerRef}>
      <label className={fieldLabelClass}>{label}</label>
      <div className="relative">
        <input
          type="text"
          value={open ? query : value}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setQuery("");
              e.currentTarget.blur();
            }
          }}
          className={cn(fieldInputClass, "pr-9")}
        />
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
        />
        {open && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-[var(--color-text-muted)]">No matches</li>
            )}
            {filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "block w-full px-3 py-2 text-left text-sm hover:bg-[var(--color-primary-tint)]",
                    opt === value ? "font-semibold text-[var(--color-primary)]" : "text-[var(--color-text-primary)]"
                  )}
                >
                  {opt}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function DateField({
  label,
  value,
  onChange,
  className,
  trailing,
}: {
  label: string;
  value: string;
  onChange: (isoValue: string) => void;
  className?: string;
  trailing?: React.ReactNode;
}) {
  const [prevValue, setPrevValue] = useState(value);
  const [text, setText] = useState(() => isoToDmy(value));
  const pickerRef = useRef<HTMLInputElement>(null);
  if (value !== prevValue) {
    setPrevValue(value);
    setText(isoToDmy(value));
  }

  const openPicker = () => {
    const el = pickerRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.focus();
  };

  const field = (
    <div className={cn("relative", Boolean(trailing) && "flex-1")}>
      <input
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        value={text}
        onChange={(e) => {
          const formatted = autoFormatDmy(e.target.value);
          setText(formatted);
          const iso = dmyToIso(formatted);
          if (iso) onChange(iso);
        }}
        onBlur={() => {
          const iso = dmyToIso(text);
          if (iso) setText(isoToDmy(iso));
          else {
            setText("");
            onChange("");
          }
        }}
        className={cn(fieldInputClass, "pr-10")}
      />
      <button
        type="button"
        onClick={openPicker}
        aria-label="Open calendar"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
      >
        <Calendar size={16} />
      </button>
      <input
        ref={pickerRef}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
      />
    </div>
  );

  return (
    <div className={className}>
      <label className={fieldLabelClass}>{label}</label>
      {trailing ? (
        <div className="flex items-center gap-1.5">
          {field}
          {trailing}
        </div>
      ) : (
        field
      )}
    </div>
  );
}

export function CheckboxField({
  label,
  ...rest
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
      <input
        type="checkbox"
        className="h-4 w-4 rounded accent-[var(--color-primary)]"
        {...rest}
      />
      {label}
    </label>
  );
}
