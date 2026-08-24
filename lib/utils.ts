export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
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

export function formatCurrency(amount: number): string {
  if (!amount) return "As per rules";
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function daysUntil(iso: string, from: string = "2026-08-24"): number {
  const target = new Date(iso).getTime();
  const start = new Date(from).getTime();
  return Math.ceil((target - start) / (1000 * 60 * 60 * 24));
}
