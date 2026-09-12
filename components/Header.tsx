"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Menu, X, Landmark, Wrench, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";

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

  const toolsLink = { href: "/tools", label: t("nav.tools") };
  const aboutLink = { href: "/about", label: t("nav.about") };

  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const otherLocale = locale === "en" ? "hi" : "en";

  const navLinkClass = (active: boolean) =>
    cn(
      "rounded-md px-3 py-2 text-sm font-medium transition-colors",
      active
        ? "bg-white/15 text-white"
        : "text-white/85 underline decoration-white/40 underline-offset-4 hover:bg-white/10 hover:text-white hover:decoration-white"
    );

  const mobileLinkClass = (active: boolean) =>
    cn(
      "rounded-md px-2 py-3 text-sm font-medium transition-colors",
      active
        ? "text-white"
        : "text-white/85 underline decoration-white/40 underline-offset-4 hover:text-white hover:decoration-white"
    );

  return (
    <header className="sticky top-0 z-40 bg-[var(--color-brand)]">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[var(--color-brand)]">
            <Landmark size={18} />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-[15px] font-bold text-white">
              {t("brand.name")}
            </span>
            <span className="text-[11px] text-white/75">
              {t("brand.tagline")}
            </span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={navLinkClass(isActive(link.href))}>
              {link.label}
            </Link>
          ))}

          <Link
            href={toolsLink.href}
            className={cn("flex items-center gap-1.5", navLinkClass(isActive(toolsLink.href)))}
          >
            <Wrench size={14} />
            {toolsLink.label}
          </Link>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href={aboutLink.href} className={navLinkClass(isActive(aboutLink.href))}>
            {aboutLink.label}
          </Link>
          <Link
            href={pathname}
            locale={otherLocale}
            aria-label={t("nav.language")}
            title={t("nav.language")}
            className="flex items-center gap-1.5 rounded-md border border-white/40 px-3 py-2 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/10"
          >
            <Languages size={14} />
            {otherLocale === "hi" ? "हिं" : "EN"}
          </Link>
          <ThemeToggle className="flex h-9 w-9 items-center justify-center rounded-md border border-white/40 text-white transition-colors hover:border-white hover:bg-white/10" />
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href={pathname}
            locale={otherLocale}
            aria-label={t("nav.language")}
            title={t("nav.language")}
            className="flex h-9 items-center gap-1 rounded-md border border-white/40 px-2.5 text-xs font-semibold text-white"
          >
            <Languages size={14} />
            {otherLocale === "hi" ? "हिं" : "EN"}
          </Link>
          <ThemeToggle className="flex h-9 w-9 items-center justify-center rounded-md border border-white/40 text-white" />
          <button
            aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-white/40 text-white"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "lg:hidden overflow-y-auto border-t border-white/15 bg-[var(--color-brand)] transition-[max-height] duration-200",
          open ? "max-h-[80vh] border-t" : "max-h-0 border-t-0"
        )}
      >
        <nav className="container-page flex flex-col py-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={mobileLinkClass(isActive(link.href))}
            >
              {link.label}
            </Link>
          ))}

          <Link
            href={toolsLink.href}
            onClick={() => setOpen(false)}
            className={cn("flex items-center gap-1.5", mobileLinkClass(isActive(toolsLink.href)))}
          >
            <Wrench size={14} />
            {toolsLink.label}
          </Link>

          <Link
            href={aboutLink.href}
            onClick={() => setOpen(false)}
            className={mobileLinkClass(isActive(aboutLink.href))}
          >
            {aboutLink.label}
          </Link>
        </nav>
      </div>
    </header>
  );
}
