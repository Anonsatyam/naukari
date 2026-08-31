import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Crop, PenTool, Wrench, Type } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import Card from "@/components/Card";

export const metadata: Metadata = {
  title: "Free Tools for Job Applications",
  description:
    "Free tools to prepare your application photo and signature — crop and resize to exact dimensions, add your name and date, or merge your signature onto a photo.",
};

export default async function ToolsPage() {
  const t = await getTranslations("toolsPage");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const localePath = (path: string) => (locale === "en" ? path : `/${locale}${path}`);

  const tools = [
    {
      href: "/tools/photo-resizer",
      icon: Crop,
      title: t("photoResizerTitle"),
      description: t("photoResizerDesc"),
    },
    {
      href: "/tools/name-date-photo",
      icon: Type,
      title: t("nameDatePhotoTitle"),
      description: t("nameDatePhotoDesc"),
    },
    {
      href: "/tools/signature-merge",
      icon: PenTool,
      title: t("signatureMergeTitle"),
      description: t("signatureMergeDesc"),
    },
  ];

  return (
    <div className="container-page py-8">
      <Breadcrumb items={[{ label: tCommon("home"), href: localePath("/") }, { label: t("breadcrumb") }]} />

      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
          <Wrench size={18} />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">{t("heading")}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {t("subtitle")}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link key={tool.href} href={tool.href} className="group block">
              <Card className="h-full transition-all hover:border-[var(--color-primary)] hover:shadow-[0_4px_20px_rgba(60,68,194,0.08)]">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
                  <Icon size={18} />
                </span>
                <p className="mt-3 text-[15px] font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)]">
                  {tool.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {tool.description}
                </p>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
