import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Breadcrumb from "@/components/Breadcrumb";
import PhotoResizerTool from "@/components/tools/PhotoResizerTool";

export const metadata: Metadata = {
  title: "Photo & Signature Resizer",
  description:
    "Crop and resize your photo or signature to an exact pixel size and file size for job application forms.",
};

export default async function PhotoResizerPage() {
  const t = await getTranslations("photoResizerPage");
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
        <PhotoResizerTool />
      </div>
    </div>
  );
}
