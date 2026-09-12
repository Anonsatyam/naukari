import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Flame } from "lucide-react";
import { HotUpdateItem } from "@/lib/types";
import Badge from "./Badge";

const typeTone: Record<HotUpdateItem["type"], "primary" | "neutral" | "warning"> = {
  Job: "primary",
  Result: "neutral",
  "Admit Card": "warning",
};

const typeLabelKey: Record<HotUpdateItem["type"], "typeJob" | "typeResult" | "typeAdmitCard"> = {
  Job: "typeJob",
  Result: "typeResult",
  "Admit Card": "typeAdmitCard",
};

export default function HotUpdates({ items }: { items: HotUpdateItem[] }) {
  const t = useTranslations("common");

  if (items.length === 0) return null;

  return (
    <section className="border-b border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="container-page py-8">
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                <Flame size={16} />
              </span>
              <div>
                <h2 className="font-display text-base font-bold text-[var(--color-text-primary)] sm:text-lg">
                  {t("hotRightNow")}
                </h2>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {t("hotRightNowSubtitle")}
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-success-tint)] px-2.5 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-success)] opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-success)]">
                {t("live")}
              </span>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((item) => (
              <HotUpdateCard
                key={`${item.type}-${item.href}`}
                item={item}
                newLabel={t("newBadge")}
                typeLabel={t(typeLabelKey[item.type])}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HotUpdateCard({
  item,
  newLabel,
  typeLabel,
}: {
  item: HotUpdateItem;
  newLabel: string;
  typeLabel: string;
}) {
  return (
    <Link
      href={item.href}
      className="group block rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 transition-all hover:border-[var(--color-primary)] hover:shadow-[0_4px_20px_rgba(60,68,194,0.08)]"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {item.isNew && <Badge tone="success">{newLabel}</Badge>}
        <Badge tone={typeTone[item.type]}>{typeLabel}</Badge>
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-[var(--color-text-primary)] group-hover:text-[var(--color-primary)]">
        {item.title}
      </h3>
      <p className="mt-1 truncate text-xs text-[var(--color-text-secondary)]">{item.organization}</p>
    </Link>
  );
}
