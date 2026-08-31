import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function Footer() {
  const t = useTranslations();

  return (
    <footer className="border-t border-[var(--color-border)] bg-white">
      <div className="container-page py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-[15px] font-bold text-[var(--color-text-primary)]">
              {t("brand.name")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {t("footer.description")}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t("footer.explore")}</p>
            <ul className="mt-3 space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li><Link href="/jobs" className="hover:text-[var(--color-primary)]">{t("footer.allJobs")}</Link></li>
              <li><Link href="/results" className="hover:text-[var(--color-primary)]">{t("footer.results")}</Link></li>
              <li><Link href="/admit-cards" className="hover:text-[var(--color-primary)]">{t("footer.admitCards")}</Link></li>
              <li><Link href="/eligibility-checker" className="hover:text-[var(--color-primary)]">{t("footer.eligibilityChecker")}</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{t("footer.disclaimerTitle")}</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
              {t("footer.disclaimerBody")}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.credit")}</p>
          <div className="flex gap-4">
            <Link href="/about" className="hover:text-[var(--color-primary)]">{t("footer.about")}</Link>
            <Link href="/about#disclaimer" className="hover:text-[var(--color-primary)]">{t("footer.disclaimer")}</Link>
            <Link href="/about#contact" className="hover:text-[var(--color-primary)]">{t("footer.contact")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
