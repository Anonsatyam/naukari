import { getLocale, getTranslations } from "next-intl/server";
import { Search, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import JobCard from "@/components/JobCard";
import ListItemCard from "@/components/ListItemCard";
import HotUpdates from "@/components/HotUpdates";
import RotatingHeroWord from "@/components/RotatingHeroWord";
import IndiaHeading from "@/components/IndiaHeading";
import { ButtonLink } from "@/components/Button";
import { getPublishedJobs, getResults, getAdmitCards, getHotUpdates } from "@/lib/server/data";
import { isClosingSoon, isRecent } from "@/lib/dateHelpers";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  const t = await getTranslations("home");
  const locale = await getLocale();
  const localePath = (path: string) => (locale === "en" ? path : `/${locale}${path}`);
  const [jobs, results, admitCards, hotUpdates] = await Promise.all([
    getPublishedJobs(),
    getResults(),
    getAdmitCards(),
    getHotUpdates(8),
  ]);

  const closingSoonJobs = jobs.filter(isClosingSoon);
  const latestJobs = [...jobs]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 3);
  const latestResults = [...results]
    .sort((a, b) => new Date(b.resultDate).getTime() - new Date(a.resultDate).getTime())
    .slice(0, 3);
  const latestAdmitCards = [...admitCards]
    .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())
    .slice(0, 3);

  return (
    <div>
      <section className="border-b border-[var(--color-border)] bg-white">
        <div className="container-page py-14 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-success-tint)] px-3 py-1 text-xs font-semibold text-[var(--color-success)] animate-breathe">
              {t("liveBadge")}
            </span>
            <h1 className="font-display mt-5 text-4xl font-extrabold leading-tight text-[var(--color-text-primary)] md:text-6xl">
              {t("heroPrefix")} <RotatingHeroWord />
              <br />
              {t("heroSuffix")} <IndiaHeading />
            </h1>
            <p className="mt-4 text-base leading-relaxed text-[var(--color-text-secondary)] md:text-lg">
              {t("heroTagline")}
            </p>

            <form
              action={localePath("/jobs")}
              className="mt-8 flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-white p-2 shadow-sm transition-shadow focus-within:border-[var(--color-primary)] focus-within:ring-4 focus-within:ring-[var(--color-primary-tint)] sm:flex-row"
            >
              <div className="flex flex-1 items-center gap-2 px-3 py-2">
                <Search size={18} className="text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  name="q"
                  placeholder={t("searchPlaceholder")}
                  className="w-full bg-transparent text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
              >
                {t("searchButton")}
              </button>
            </form>
          </div>
        </div>
      </section>

      <HotUpdates items={hotUpdates} />

      {closingSoonJobs.length > 0 && (
        <section className="container-page py-10">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
              {t("closingSoon")}
            </h2>
            <Link
              href="/closing-soon"
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]"
            >
              {t("viewAll")} <ArrowRight size={14} />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {closingSoonJobs.slice(0, 3).map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </section>
      )}

      {latestJobs.length > 0 && (
        <section className="container-page py-10">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
              {t("latestJobs")}
            </h2>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]"
            >
              {t("viewAll")} <ArrowRight size={14} />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latestJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </section>
      )}

      {latestResults.length > 0 && (
        <section className="container-page py-10">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
              {t("latestResults")}
            </h2>
            <Link
              href="/results"
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]"
            >
              {t("viewAll")} <ArrowRight size={14} />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latestResults.map((r) => (
              <ListItemCard
                key={r.id}
                href={`/results/${r.slug}`}
                eyebrow={r.organization}
                title={r.title}
                category={r.category}
                tags={r.tags}
                meta={t("resultDeclared", { date: formatDate(r.resultDate) })}
                isNew={isRecent(r.resultDate)}
              />
            ))}
          </div>
        </section>
      )}

      {latestAdmitCards.length > 0 && (
        <section className="container-page py-10">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
              {t("latestAdmitCards")}
            </h2>
            <Link
              href="/admit-cards"
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]"
            >
              {t("viewAll")} <ArrowRight size={14} />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latestAdmitCards.map((a) => (
              <ListItemCard
                key={a.id}
                href={`/admit-cards/${a.slug}`}
                eyebrow={a.organization}
                title={a.title}
                category={a.category}
                tags={a.tags}
                meta={t("examOn", { date: formatDate(a.examDate) })}
                isNew={isRecent(a.releaseDate)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="container-page pt-10 pb-10">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-[var(--color-primary)] p-8 text-white md:flex-row md:items-center md:p-10">
          <div>
            <h2 className="font-display text-xl font-bold md:text-2xl">
              {t("ctaTitle")}
            </h2>
            <p className="mt-2 max-w-md text-sm text-white/80 md:text-base">
              {t("ctaBody")}
            </p>
          </div>
          <ButtonLink
            href={localePath("/eligibility-checker")}
            variant="secondary"
            size="lg"
            className="border-0 bg-white text-[var(--color-primary)] hover:bg-white/90"
          >
            {t("ctaButton")}
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
