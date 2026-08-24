"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/jobs", label: "Jobs" },
  { href: "/closing-soon", label: "Closing Soon" },
  { href: "/results", label: "Results" },
  { href: "/admit-cards", label: "Admit Cards" },
  { href: "/eligibility-checker", label: "Eligibility Checker" },
];

const aboutLink = { href: "/about", label: "About" };

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white">
            <Landmark size={18} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[15px] font-bold text-[var(--color-text-primary)]">
              Bihar Sarkari Naukri
            </span>
            <span className="text-[11px] text-[var(--color-text-secondary)]">
              Verified government job updates
            </span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(link.href)
                  ? "bg-[var(--color-primary-tint)] text-[var(--color-primary)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-tint)] hover:text-[var(--color-primary)]"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block">
          <Link
            href={aboutLink.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive(aboutLink.href)
                ? "bg-[var(--color-primary-tint)] text-[var(--color-primary)]"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-tint)] hover:text-[var(--color-primary)]"
            )}
          >
            {aboutLink.label}
          </Link>
        </div>

        <button
          aria-label={open ? "Close menu" : "Open menu"}
          className="lg:hidden flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-primary)]"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <div
        className={cn(
          "lg:hidden overflow-hidden border-t border-[var(--color-border)] bg-white transition-[max-height] duration-200",
          open ? "max-h-96" : "max-h-0 border-t-0"
        )}
      >
        <nav className="container-page flex flex-col py-2">
          {[...navLinks, aboutLink].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-md px-2 py-3 text-sm font-medium transition-colors",
                isActive(link.href)
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-text-primary)] hover:text-[var(--color-primary)]"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}