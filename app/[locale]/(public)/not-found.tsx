import { getTranslations } from "next-intl/server";
import { SearchX } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default async function PublicNotFound() {
  const t = await getTranslations("notFoundPage");

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary-tint)] text-[var(--color-primary)]">
        <SearchX size={26} />
      </span>
      <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] md:text-3xl">
        {t("heading")}
      </h1>
      <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">{t("body")}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-[var(--radius-control)] bg-[var(--color-brand)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-brand-hover)]"
        >
          {t("homeButton")}
        </Link>
        <Link
          href="/jobs"
          className="rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-primary)]"
        >
          {t("jobsButton")}
        </Link>
      </div>
    </div>
  );
}
