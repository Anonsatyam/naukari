import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import Breadcrumb from "@/components/Breadcrumb";
import SignatureMergeTool from "@/components/tools/SignatureMergeTool";

export const metadata: Metadata = {
  title: "Merge Signature on Photo",
  description: "Overlay your signature onto a photo, with optional white-background removal.",
};

export default async function SignatureMergePage() {
  const t = await getTranslations("signatureMergePage");
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
        <SignatureMergeTool />
      </div>
    </div>
  );
}
