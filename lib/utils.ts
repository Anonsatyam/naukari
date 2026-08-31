export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const SOURCE_SITE_HOSTNAME = "biharjob.co.in";

export function isSourceSiteUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return hostname === SOURCE_SITE_HOSTNAME || hostname.endsWith(`.${SOURCE_SITE_HOSTNAME}`);
  } catch {
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
