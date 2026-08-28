import { ShieldCheck } from "lucide-react";

// sourceUrl is kept in the signature so every call site (job/result/
// admit-card detail pages) doesn't need touching, but is intentionally
// unused below — every listing is verified against our own site, not
// re-attributed to whatever government/aggregator page the bot
// originally pulled it from.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function SourceVerified({ sourceUrl }: { sourceUrl: string }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
      <ShieldCheck size={13} className="text-[var(--color-success)]" />
      Verified from naukari-lac.vercel.app
    </p>
  );
}
