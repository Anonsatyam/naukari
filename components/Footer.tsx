import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-[var(--color-border)] bg-white">
      <div className="container-page py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-[15px] font-bold text-[var(--color-text-primary)]">
              Bihar Sarkari Naukri
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              Structured, verified government job information for Bihar —
              sourced directly from official notifications.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Explore</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li><Link href="/jobs" className="hover:text-[var(--color-primary)]">All Jobs</Link></li>
              <li><Link href="/results" className="hover:text-[var(--color-primary)]">Results</Link></li>
              <li><Link href="/admit-cards" className="hover:text-[var(--color-primary)]">Admit Cards</Link></li>
              <li><Link href="/eligibility-checker" className="hover:text-[var(--color-primary)]">Eligibility Checker</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">Disclaimer</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              This is an independent information portal, not an official
              government website. Always verify details and apply only
              through the official notification and application links
              provided on each listing.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Bihar Sarkari Naukri. Built for Bihar, made to scale.</p>
          <div className="flex gap-4">
            <Link href="/about" className="hover:text-[var(--color-primary)]">About</Link>
            <Link href="/about#disclaimer" className="hover:text-[var(--color-primary)]">Disclaimer</Link>
            <Link href="/about#contact" className="hover:text-[var(--color-primary)]">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
