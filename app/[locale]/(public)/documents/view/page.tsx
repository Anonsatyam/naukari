import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Download, ExternalLink, FileText } from "lucide-react";
import { isOwnDocumentUrl } from "@/lib/utils";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import { ButtonLink } from "@/components/Button";

export const metadata: Metadata = {
  title: "Document Viewer",
};

export default async function DocumentViewPage({
  searchParams,
}: {
  searchParams: Promise<{ src?: string; title?: string }>;
}) {
  const { src, title } = await searchParams;
  if (!src || !isOwnDocumentUrl(src)) notFound();

  const t = await getTranslations("documentViewerPage");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const localePath = (path: string) => (locale === "en" ? path : `/${locale}${path}`);

  const downloadUrl = `${src}${src.includes("?") ? "&" : "?"}download`;
  const heading = title?.trim() || t("defaultHeading");

  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: tCommon("home"), href: localePath("/") }, { label: heading }]} />

      <Card padding="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2.5 text-lg font-bold text-[var(--color-text-primary)]">
            <FileText size={20} className="text-[var(--color-primary)]" />
            {heading}
          </p>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href={downloadUrl}>
              <Download size={14} /> {t("download")}
            </ButtonLink>
            <ButtonLink href={src} target="_blank" variant="secondary">
              {t("openInNewTab")} <ExternalLink size={14} />
            </ButtonLink>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-[var(--color-border)]">
          <iframe src={src} title={heading} className="h-[80vh] w-full" />
        </div>
      </Card>
    </div>
  );
}
