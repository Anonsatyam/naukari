import { cn } from "@/lib/utils";
import { fieldInputClass, fieldLabelClass } from "@/lib/ui";

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

export function SelectField({
  label,
  className,
  options,
  ...rest
}: BaseProps & {
  options: string[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className={fieldLabelClass}>{label}</label>
      <select className={cn(fieldInputClass, className)} {...rest}>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
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
