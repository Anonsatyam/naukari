import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import EligibilityChecker from "@/components/EligibilityChecker";
import Breadcrumb from "@/components/Breadcrumb";

export const metadata: Metadata = {
  title: "Eligibility Checker — Government Jobs",
  description: "Check your eligibility for any government job with a clear, reasoned breakdown.",
};

export default async function EligibilityCheckerPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const { job } = await searchParams;
  const t = await getTranslations("eligibilityCheckerPage");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const localePath = (path: string) => (locale === "en" ? path : `/${locale}${path}`);

  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: tCommon("home"), href: localePath("/") }, { label: t("breadcrumb") }]} />

      <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] md:text-3xl">
        {t("heading")}
      </h1>
      <p className="mt-1 max-w-xl text-sm text-[var(--color-text-secondary)]">
        {t("body")}
      </p>

      <div className="mt-6">
        <EligibilityChecker initialJobId={job} />
      </div>
    </div>
  );
}
