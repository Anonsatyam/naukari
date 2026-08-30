export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// The site this whole pipeline scrapes — used to keep every "Apply
// Officially" / "Official Notification" / "View Official Result" /
// "Download Admit Card" button from ever landing a visitor back on the
// aggregator page instead of the actual government site. Extraction
// can fail to find a genuine external link (a source page with no
// working "Important Links" section, an unusual layout), and the old
// fallback chain's last resort was the source article's own URL —
// silently pointing an "official" button at biharjob.co.in itself.
// Shared (not server-only) since both lib/server/data.ts (filtering
// candidate links before they're stored) and the public detail pages
// (a last-resort check on already-published records, including ones
// published before this fix existed) need the same check.
const SOURCE_SITE_HOSTNAME = "biharjob.co.in";

export function isSourceSiteUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return hostname === SOURCE_SITE_HOSTNAME || hostname.endsWith(`.${SOURCE_SITE_HOSTNAME}`);
  } catch {
    // Not a parseable absolute URL (a relative path, or malformed
    // extraction output) — fall back to a plain substring check rather
    // than treating it as "safe" by default.
    return url.toLowerCase().includes(SOURCE_SITE_HOSTNAME);
  }
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Date + time, for anything that can happen more than once a day (the
// bot runs every 4 hours) — formatDate alone can't tell two same-day
// runs apart.
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(amount: number): string {
  if (!amount) return "As per rules";
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function daysUntil(iso: string, from: string = new Date().toISOString()): number {
  const target = new Date(iso).getTime();
  const start = new Date(from).getTime();
  return Math.ceil((target - start) / (1000 * 60 * 60 * 24));
}
