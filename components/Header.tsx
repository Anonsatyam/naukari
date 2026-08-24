"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X, Landmark, Wrench, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/jobs", label: "Jobs" },
  { href: "/closing-soon", label: "Closing Soon" },
  { href: "/results", label: "Results" },
  { href: "/admit-cards", label: "Admit Cards" },
  { href: "/eligibility-checker", label: "Eligibility Checker" },
];

const toolLinks = [
  { href: "/tools/photo-resizer", label: "Photo & Signature Resizer" },
  { href: "/tools/name-date-photo", label: "Name & Date on Photo" },
  { href: "/tools/signature-merge", label: "Merge Signature on Photo" },
];

const aboutLink = { href: "/about", label: "About" };

export default function Header() {
  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const toolsActive = pathname.startsWith("/tools");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

          {/* Tools dropdown */}
          <div className="relative" ref={toolsRef}>
            <button
              type="button"
              onClick={() => setToolsOpen((v) => !v)}
              className={cn(
                "flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                toolsActive || toolsOpen
                  ? "bg-[var(--color-primary-tint)] text-[var(--color-primary)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-primary-tint)] hover:text-[var(--color-primary)]"
              )}
            >
              <Wrench size={14} />
              Tools
              <ChevronDown size={14} className={cn("transition-transform", toolsOpen && "rotate-180")} />
            </button>

            {toolsOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-[var(--color-border)] bg-white p-1.5 shadow-lg">
                <Link
                  href="/tools"
                  onClick={() => setToolsOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-tint)]"
                >
                  All Tools
                </Link>
                <div className="my-1 border-t border-[var(--color-border)]" />
                {toolLinks.map((tool) => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    onClick={() => setToolsOpen(false)}
                    className={cn(
                      "block rounded-md px-3 py-2 text-sm transition-colors",
                      isActive(tool.href)
                        ? "bg-[var(--color-primary-tint)] text-[var(--color-primary)]"
                        : "text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] hover:text-[var(--color-text-primary)]"
                    )}
                  >
                    {tool.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
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
          "lg:hidden overflow-y-auto border-t border-[var(--color-border)] bg-white transition-[max-height] duration-200",
          open ? "max-h-[80vh] border-t" : "max-h-0 border-t-0"
        )}
      >
        <nav className="container-page flex flex-col py-2">
          {navLinks.map((link) => (
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

          {/* Tools expandable section */}
          <button
            type="button"
            onClick={() => setMobileToolsOpen((v) => !v)}
            className={cn(
              "flex items-center justify-between rounded-md px-2 py-3 text-sm font-medium transition-colors",
              toolsActive ? "text-[var(--color-primary)]" : "text-[var(--color-text-primary)]"
            )}
          >
            <span className="flex items-center gap-1.5">
              <Wrench size={14} /> Tools
            </span>
            <ChevronDown size={14} className={cn("transition-transform", mobileToolsOpen && "rotate-180")} />
          </button>
          {mobileToolsOpen && (
            <div className="ml-4 flex flex-col border-l border-[var(--color-border)] pl-3">
              <Link
                href="/tools"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2.5 text-sm font-semibold text-[var(--color-primary)]"
              >
                All Tools
              </Link>
              {toolLinks.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-md px-2 py-2.5 text-sm transition-colors",
                    isActive(tool.href)
                      ? "text-[var(--color-primary)]"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
                  )}
                >
                  {tool.label}
                </Link>
              ))}
            </div>
          )}

          <Link
            href={aboutLink.href}
            onClick={() => setOpen(false)}
            className={cn(
              "rounded-md px-2 py-3 text-sm font-medium transition-colors",
              isActive(aboutLink.href)
                ? "text-[var(--color-primary)]"
                : "text-[var(--color-text-primary)] hover:text-[var(--color-primary)]"
            )}
          >
            {aboutLink.label}
          </Link>
        </nav>
      </div>
    </header>
  );
}
