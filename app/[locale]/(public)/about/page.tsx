import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Mail, ShieldCheck, Target } from "lucide-react";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";

export const metadata: Metadata = {
  title: "About Us",
  description: "About Sarkari Naukri — an independent, structured government jobs information platform.",
};

export default async function AboutPage() {
  const t = await getTranslations("aboutPage");
  const tBrand = await getTranslations("brand");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const localePath = (path: string) => (locale === "en" ? path : `/${locale}${path}`);
  const brand = tBrand("name");

  return (
    <div className="container-page max-w-3xl py-8">
      <Breadcrumb items={[{ label: tCommon("home"), href: localePath("/") }, { label: t("breadcrumb") }]} />

      <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] md:text-3xl">
        {t("heading", { brand })}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
        {t("intro", { brand })}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <InfoCard
          icon={<Target size={18} />}
          title={t("missionTitle")}
          body={t("missionBody")}
        />
        <InfoCard
          icon={<ShieldCheck size={18} />}
          title={t("verifyTitle")}
          body={t("verifyBody")}
        />
      </div>

      <Card padding="p-6" className="mt-10">
        <div id="disclaimer" className="scroll-mt-24">
          <h2 className="font-display text-lg font-bold text-[var(--color-text-primary)]">{t("disclaimerTitle")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {t("disclaimerBody")}
          </p>
        </div>
      </Card>

      <Card padding="p-6" className="mt-6">
        <div id="contact" className="scroll-mt-24">
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
        </div>
      </Card>
    </div>
  );
}

function InfoCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card padding="p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
        {icon}
      </span>
      <p className="mt-3 text-sm font-semibold text-[var(--color-text-primary)]">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">{body}</p>
    </Card>
  );
}
