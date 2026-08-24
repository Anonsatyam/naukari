"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/drafts", label: "Drafts" },
  { href: "/admin/jobs", label: "Jobs" },
];

export default function AdminTopbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-white">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <nav className="flex items-center gap-1 lg:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-2.5 py-2 text-xs font-semibold",
                pathname.startsWith(link.href)
                  ? "bg-[var(--color-primary-tint)] text-[var(--color-primary)]"
                  : "text-[var(--color-text-secondary)]"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block" />

        <div className="flex items-center gap-4">
          <button
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-background)]"
          >
            <Bell size={17} />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--color-danger)]" />
          </button>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary-tint)] text-xs font-bold text-[var(--color-primary)]">
              A
            </span>
            <span className="hidden text-sm font-medium text-[var(--color-text-primary)] sm:inline">
              Admin
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
