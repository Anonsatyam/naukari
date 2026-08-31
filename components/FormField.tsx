import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { fieldInputClass, fieldLabelClass, selectFieldClass } from "@/lib/ui";

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
