import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SearchInput({
  value,
  onChange,
  placeholder,
  name,
  className,
}: {
  value?: string;
  onChange?: (value: string) => void;
  placeholder: string;
  name?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-white px-3 py-2.5 transition-shadow focus-within:border-[var(--color-primary)] focus-within:ring-4 focus-within:ring-[var(--color-primary-tint)]",
        className
      )}
    >
      <Search size={18} className="shrink-0 text-[var(--color-text-muted)]" />
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
      />
    </div>
  );
}
