import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function Footer() {
  const t = useTranslations();

  const linkClass =
    "underline decoration-white/40 underline-offset-2 transition-colors hover:text-white hover:decoration-white";

  return (
    <footer className="bg-[var(--color-primary)] text-white">
      <div className="container-page py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <p className="text-[15px] font-bold text-white">
              {t("brand.name")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/75">
              {t("footer.description")}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">{t("footer.explore")}</p>
            <ul className="mt-3 space-y-2 text-sm text-white/85">
              <li><Link href="/jobs" className={linkClass}>{t("footer.allJobs")}</Link></li>
              <li><Link href="/results" className={linkClass}>{t("footer.results")}</Link></li>
              <li><Link href="/admit-cards" className={linkClass}>{t("footer.admitCards")}</Link></li>
              <li><Link href="/eligibility-checker" className={linkClass}>{t("footer.eligibilityChecker")}</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-white">{t("footer.disclaimerTitle")}</p>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              {t("footer.disclaimerBody")}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-white/20 pt-6 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.credit")}</p>
          <div className="flex gap-4">
            <Link href="/about" className={linkClass}>{t("footer.about")}</Link>
            <Link href="/about#disclaimer" className={linkClass}>{t("footer.disclaimer")}</Link>
            <Link href="/about#contact" className={linkClass}>{t("footer.contact")}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
