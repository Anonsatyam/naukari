import { ShieldCheck } from "lucide-react";

export default function SourceVerified({ sourceUrl }: { sourceUrl: string }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
      <ShieldCheck size={13} />
      Verified from {new URL(sourceUrl).hostname}
    </p>
  );
}
