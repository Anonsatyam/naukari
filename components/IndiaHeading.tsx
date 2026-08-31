import { cn } from "@/lib/utils";

function ChakraDot() {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-[-0.42em] h-[0.32em] w-[0.32em] -translate-x-1/2"
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

function TricolorSash() {
  return (
    <svg
      viewBox="0 0 240 60"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-[-6%] top-1/2 h-[0.42em] w-[112%] -translate-y-1/2 -rotate-6"
      style={{ zIndex: -1 }}
    >
      <defs>
        <linearGradient id="india-sash-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF9933" />
          <stop offset="46%" stopColor="#FF9933" />
          <stop offset="50%" stopColor="#FFFFFF" />
          <stop offset="54%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#138808" />
        </linearGradient>
      </defs>
      <path
        d="M0,32 C40,14 80,50 120,32 C160,14 200,50 240,32 L240,50 C200,68 160,32 120,50 C80,68 40,32 0,50 Z"
        fill="url(#india-sash-gradient)"
      />
    </svg>
  );
}

export default function IndiaHeading({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-block font-black text-[var(--color-text-primary)]", className)}>
      <TricolorSash />
      I
      <span>nd</span>
      <span className="relative inline-block">
        ı
        <ChakraDot />
      </span>
      a
    </span>
  );
}
