import { useRef, useState } from "react";
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
  ...rest
}: BaseProps & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className={fieldLabelClass}>{label}</label>
      <input className={cn(fieldInputClass, className)} {...rest} />
    </div>
  );
}

export function TextAreaField({
  label,
  className,
  hint,
  ...rest
}: BaseProps & { hint?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label className={fieldLabelClass}>{label}</label>
      <textarea className={cn(fieldInputClass, "min-h-[88px] resize-y", className)} {...rest} />
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
  ...rest
}: BaseProps & {
  options: (string | SelectFieldOption)[];
  hideLabel?: boolean;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      {!hideLabel && <label className={fieldLabelClass}>{label}</label>}
      <div className="relative">
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
    </div>
  );
}

export function DateField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (isoValue: string) => void;
  className?: string;
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

  return (
    <div className={className}>
      <label className={fieldLabelClass}>{label}</label>
      <div className="relative">
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
