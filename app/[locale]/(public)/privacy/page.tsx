import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Mail, ShieldAlert } from "lucide-react";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What information Sarkari Naukri collects, how it's used, and the choices available to you.",
};

const SECTION_COUNT = 14;

export default async function PrivacyPage() {
  const t = await getTranslations("privacyPage");
  const tBrand = await getTranslations("brand");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const localePath = (path: string) => (locale === "en" ? path : `/${locale}${path}`);
  const brand = tBrand("name");

  return (
    <div className="container-page max-w-3xl py-8">
      <Breadcrumb items={[{ label: tCommon("home"), href: localePath("/") }, { label: t("breadcrumb") }]} />

      <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] md:text-3xl">
        {t("heading")}
      </h1>
      <p className="mt-1 text-xs font-medium text-[var(--color-text-muted)]">{t("lastUpdated")}</p>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">{t("intro", { brand })}</p>

      <Card padding="p-6" className="mt-6 space-y-6">
        {Array.from({ length: SECTION_COUNT }, (_, i) => i + 1).map((n) => (
          <div key={n}>
            <h2 className="font-display text-base font-bold text-[var(--color-text-primary)]">
              {n}. {t(`s${n}Heading`)}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-text-secondary)]">{t(`s${n}Body`)}</p>
          </div>
        ))}
      </Card>

      <Card padding="p-6" className="mt-6">
        <h2 className="font-display flex items-center gap-2 text-lg font-bold text-[var(--color-text-primary)]">
          <ShieldAlert size={18} /> {t("grievanceTitle")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{t("grievanceBody")}</p>
        <div className="mt-3 rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-sm">
          <p className="font-semibold text-[var(--color-text-primary)]">{t("grievanceName")}</p>
          <p className="text-[var(--color-text-secondary)]">{t("grievanceDesignation", { brand })}</p>
          <a href="mailto:hello@sarkarinaukri.example" className="font-medium text-[var(--color-primary)]">
            hello@sarkarinaukri.example
          </a>
        </div>
      </Card>

      <Card padding="p-6" className="mt-6">
        <h2 className="font-display flex items-center gap-2 text-lg font-bold text-[var(--color-text-primary)]">
          <Mail size={18} /> {t("contactTitle")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          {t("contactBody")}{" "}
          <a href="mailto:hello@sarkarinaukri.example" className="font-medium text-[var(--color-primary)]">
            hello@sarkarinaukri.example
          </a>
          .
        </p>
      </Card>
    </div>
  );
}
