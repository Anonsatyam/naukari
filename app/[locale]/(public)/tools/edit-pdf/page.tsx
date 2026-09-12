import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Breadcrumb from "@/components/Breadcrumb";
import EditPdfTool from "@/components/tools/EditPdfTool";

export const metadata: Metadata = {
  title: "Edit PDF",
  description: "Reorder, rotate, or delete pages in a PDF, free and in your browser.",
};

export default async function EditPdfPage() {
  const t = await getTranslations("editPdfPage");
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
      <p className="mt-1 max-w-xl text-sm text-[var(--color-text-secondary)]">{t("body")}</p>

      <div className="mt-6">
        <EditPdfTool />
      </div>
    </div>
  );
}
