import Link from "next/link";
import { Landmark } from "lucide-react";

export default function RootNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-background)] p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-brand)] text-white">
        <Landmark size={22} />
      </span>
      <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">Page not found</h1>
      <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">
        The page you&apos;re looking for doesn&apos;t exist, or may have moved.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-[var(--radius-control)] bg-[var(--color-brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]"
      >
        Go to Homepage
      </Link>
    </div>
  );
}
