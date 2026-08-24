"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileStack,
  Briefcase,
  LogOut,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/drafts", label: "Bot Drafts", icon: FileStack },
  { href: "/admin/jobs", label: "Manage Jobs", icon: Briefcase },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-[var(--color-border)] bg-white lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-[var(--color-border)] px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)] text-white">
          <Landmark size={16} />
        </span>
        <span className="text-sm font-bold text-[var(--color-text-primary)]">Admin Panel</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-[var(--color-primary-tint)] text-[var(--color-primary)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] hover:text-[var(--color-text-primary)]"
              )}
            >
              <Icon size={17} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--color-border)] p-3">
        <Link
          href="/admin/login"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] hover:text-[var(--color-danger)]"
        >
          <LogOut size={17} />
          Log out
        </Link>
      </div>
    </aside>
  );
}
