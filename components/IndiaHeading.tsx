import { cn } from "@/lib/utils";

function ChakraD() {
  return (
    <svg
      viewBox="0 0 60 100"
      aria-hidden="true"
      className="inline-block h-[1em] w-[0.6em] align-baseline"
    >
      <rect x="42" y="2" width="14" height="96" rx="6" fill="currentColor" />
      <circle cx="28" cy="72" r="26" fill="#ffffff" stroke="#000080" strokeWidth="4" />
      {Array.from({ length: 24 }).map((_, i) => (
        <line
          key={i}
          x1="28"
          y1="72"
          x2="28"
          y2="50"
          stroke="#000080"
          strokeWidth="2"
          transform={`rotate(${i * 15} 28 72)`}
        />
      ))}
      <circle cx="28" cy="72" r="4" fill="#000080" />
    </svg>
  );
}

export default function IndiaHeading({ className }: { className?: string }) {
  return (
    <span className={cn("text-[var(--color-text-primary)]", className)}>
      In
      <ChakraD />
      ia
    </span>
  );
}
