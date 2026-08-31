import { cn } from "@/lib/utils";

function ChakraDot() {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className="pointer-events-none absolute bottom-full left-1/2 mb-[-0.28em] h-[0.26em] w-[0.26em] -translate-x-1/2"
    >
      <circle cx="20" cy="20" r="17" fill="#ffffff" stroke="#000080" strokeWidth="3" />
      {Array.from({ length: 24 }).map((_, i) => (
        <line
          key={i}
          x1="20"
          y1="20"
          x2="20"
          y2="5"
          stroke="#000080"
          strokeWidth="1.6"
          transform={`rotate(${i * 15} 20 20)`}
        />
      ))}
      <circle cx="20" cy="20" r="2.5" fill="#000080" />
    </svg>
  );
}

export default function IndiaHeading({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-block font-black text-[var(--color-text-primary)]", className)}>
      <span>
        I
        <span>nd</span>
        <span className="relative inline-block leading-none">
          ı
          <ChakraDot />
        </span>
        a
      </span>
      <span aria-hidden="true" className="india-sash-clip pointer-events-none absolute inset-0">
        Indıa
      </span>
    </span>
  );
}
