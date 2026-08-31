"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Menu, X, Landmark, Wrench, ChevronDown, Languages } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Header() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();

  const navLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/jobs", label: t("nav.jobs") },
    { href: "/closing-soon", label: t("nav.closingSoon") },
    { href: "/results", label: t("nav.results") },
    { href: "/admit-cards", label: t("nav.admitCards") },
    { href: "/eligibility-checker", label: t("nav.eligibilityChecker") },
  ];

  const toolLinks = [
    { href: "/tools/photo-resizer", label: t("toolsNav.photoResizer") },
    { href: "/tools/name-date-photo", label: t("toolsNav.nameDatePhoto") },
    { href: "/tools/signature-merge", label: t("toolsNav.signatureMerge") },
  ];

  const aboutLink = { href: "/about", label: t("nav.about") };

  const [open, setOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const toolsActive = pathname.startsWith("/tools");
  const otherLocale = locale === "en" ? "hi" : "en";

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
              {t("brand.name")}
            </span>
            <span className="text-[11px] text-[var(--color-text-secondary)]">
              {t("brand.tagline")}
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
              {t("nav.tools")}
              <ChevronDown size={14} className={cn("transition-transform", toolsOpen && "rotate-180")} />
            </button>

            {toolsOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-[var(--color-border)] bg-white p-1.5 shadow-lg">
                <Link
                  href="/tools"
                  onClick={() => setToolsOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary-tint)]"
                >
                  {t("nav.allTools")}
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

        <div className="hidden items-center gap-2 lg:flex">
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
          <Link
            href={pathname}
            locale={otherLocale}
            aria-label={t("nav.language")}
            title={t("nav.language")}
            className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            <Languages size={14} />
            {otherLocale === "hi" ? "हिं" : "EN"}
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href={pathname}
            locale={otherLocale}
            aria-label={t("nav.language")}
            title={t("nav.language")}
            className="flex h-9 items-center gap-1 rounded-md border border-[var(--color-border)] px-2.5 text-xs font-semibold text-[var(--color-text-primary)]"
          >
            <Languages size={14} />
            {otherLocale === "hi" ? "हिं" : "EN"}
          </Link>
          <button
            aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-text-primary)]"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
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

          <button
            type="button"
            onClick={() => setMobileToolsOpen((v) => !v)}
            className={cn(
              "flex items-center justify-between rounded-md px-2 py-3 text-sm font-medium transition-colors",
              toolsActive ? "text-[var(--color-primary)]" : "text-[var(--color-text-primary)]"
            )}
          >
            <span className="flex items-center gap-1.5">
              <Wrench size={14} /> {t("nav.tools")}
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
                {t("nav.allTools")}
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
