import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Breadcrumb from "@/components/Breadcrumb";
import NameDatePhotoTool from "@/components/tools/NameDatePhotoTool";

export const metadata: Metadata = {
  title: "Name & Date on Photo",
  description: "Add your name and today's date onto a photo, positioned exactly where you want it.",
};

export default async function NameDatePhotoPage() {
  const t = await getTranslations("nameDatePhotoPage");
  const tTools = await getTranslations("toolsPage");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const localePath = (path: string) => (locale === "en" ? path : `/${locale}${path}`);

  return (
    <div className="container-page py-8">
      <Breadcrumb
        items={[
          { label: tCommon("home"), href: localePath("/") },
          { label: tTools("breadcrumb"), href: localePath("/tools") },
          { label: t("breadcrumb") },
        ]}
      />

      <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] md:text-3xl">
        {t("heading")}
      </h1>
      <p className="mt-1 max-w-xl text-sm text-[var(--color-text-secondary)]">
        {t("body")}
      </p>

      <div className="mt-6">
        <NameDatePhotoTool />
      </div>
    </div>
  );
}
