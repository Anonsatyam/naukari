import { getLocale, getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import JobCard from "@/components/JobCard";
import ListItemCard from "@/components/ListItemCard";
import HotUpdates from "@/components/HotUpdates";
import SectionPanel from "@/components/SectionPanel";
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
  const latestJobs = jobs.slice(0, 3);
  const latestResults = results.slice(0, 3);
  const latestAdmitCards = admitCards.slice(0, 3);

  return (
    <div>
      <section className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
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
              className="mt-8 flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-sm transition-shadow focus-within:border-[var(--color-primary)] focus-within:ring-4 focus-within:ring-[var(--color-primary-tint)] sm:flex-row"
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
                className="rounded-xl bg-[var(--color-brand)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-hover)]"
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
          <SectionPanel title={t("closingSoon")} viewAllHref="/closing-soon" viewAllLabel={t("viewAll")}>
            {closingSoonJobs.slice(0, 3).map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </SectionPanel>
        </section>
      )}

      {latestJobs.length > 0 && (
        <section className="container-page py-10">
          <SectionPanel title={t("latestJobs")} viewAllHref="/jobs" viewAllLabel={t("viewAll")}>
            {latestJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </SectionPanel>
        </section>
      )}

      {latestResults.length > 0 && (
        <section className="container-page py-10">
          <SectionPanel title={t("latestResults")} viewAllHref="/results" viewAllLabel={t("viewAll")}>
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
          </SectionPanel>
        </section>
      )}

      {latestAdmitCards.length > 0 && (
        <section className="container-page py-10">
          <SectionPanel title={t("latestAdmitCards")} viewAllHref="/admit-cards" viewAllLabel={t("viewAll")}>
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
          </SectionPanel>
        </section>
      )}

      <section className="container-page pt-10 pb-10">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-[var(--color-brand)] p-8 text-white md:flex-row md:items-center md:p-10">
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
            variant="inverse"
            size="lg"
          >
            {t("ctaButton")}
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
