import { cn } from "@/lib/utils";

export default function IndiaHeading({ className }: { className?: string }) {
  return (
    <span className={cn("tricolor-text relative inline-block", className)}>
      In
      <span className="relative inline-block">
        d
        <svg
          viewBox="0 0 100 100"
          aria-hidden="true"
          className="pointer-events-none absolute left-[40%] top-[72%] h-[0.5em] w-[0.5em] -translate-x-1/2 -translate-y-1/2"
        >
          <circle cx="50" cy="50" r="44" fill="none" stroke="#000080" strokeWidth="5" />
          {Array.from({ length: 24 }).map((_, i) => (
            <line
              key={i}
              x1="50"
              y1="50"
              x2="50"
              y2="8"
              stroke="#000080"
              strokeWidth="3"
              transform={`rotate(${i * 15} 50 50)`}
            />
          ))}
          <circle cx="50" cy="50" r="5" fill="#000080" />
        </svg>
      </span>
      ia
    </span>
  );
}
