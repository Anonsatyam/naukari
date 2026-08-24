import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import JobCard from "@/components/JobCard";
import ListItemCard from "@/components/ListItemCard";
import LiveStats from "@/components/LiveStats";
import { ButtonLink } from "@/components/Button";
import { jobs, results, admitCards, isClosingSoon, isRecent } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";

export default function Home() {
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

  const stats = [
    { label: "Live Jobs", value: jobs.length, icon: "briefcase" as const, href: "/jobs" },
    { label: "Results Declared", value: results.length, icon: "trophy" as const, href: "/results" },
    { label: "Admit Cards", value: admitCards.length, icon: "idCard" as const, href: "/admit-cards" },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-[var(--color-border)] bg-white">
        <div className="container-page py-14 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-tint)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
              Bihar · verified from official sources
            </span>
            <h1 className="font-display mt-5 text-3xl font-extrabold leading-tight text-[var(--color-text-primary)] md:text-5xl">
              Government jobs in Bihar,{" "}
              <span className="text-[var(--color-primary)]">clearly explained.</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-[var(--color-text-secondary)] md:text-lg">
              Structured job details, real search and filters, and a
              straight answer on whether you&apos;re eligible — no login required.
            </p>

            <form
              action="/jobs"
              className="mt-8 flex flex-col gap-2 rounded-2xl border border-[var(--color-border)] bg-white p-2 shadow-sm transition-shadow focus-within:border-[var(--color-primary)] focus-within:ring-4 focus-within:ring-[var(--color-primary-tint)] sm:flex-row"
            >
              <div className="flex flex-1 items-center gap-2 px-3 py-2">
                <Search size={18} className="text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  name="q"
                  placeholder="Search by job title, department or organization"
                  className="w-full bg-transparent text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)]"
              >
                Search Jobs
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {["Police", "Teaching", "Banking", "Engineering", "Healthcare"].map((c) => (
                <Link
                  key={c}
                  href={`/jobs?category=${encodeURIComponent(c)}`}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                >
                  {c}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Live stats strip */}
      {/* <LiveStats stats={stats} /> */}

      {/* Closing soon */}
      {closingSoonJobs.length > 0 && (
        <section className="container-page py-10">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
              Closing Soon
            </h2>
            <Link
              href="/closing-soon"
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {closingSoonJobs.slice(0, 3).map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </section>
      )}

      {/* Latest jobs */}
      <section className="container-page py-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
            Latest Bihar Jobs
          </h2>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {latestJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </section>

      {/* Latest results */}
      <section className="container-page py-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
            Latest Results
          </h2>
          <Link
            href="/results"
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]"
          >
            View all <ArrowRight size={14} />
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
              meta={`Declared ${formatDate(r.resultDate)}`}
              isNew={isRecent(r.resultDate)}
            />
          ))}
        </div>
      </section>

      {/* Latest admit cards */}
      <section className="container-page py-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
            Latest Admit Cards
          </h2>
          <Link
            href="/admit-cards"
            className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)]"
          >
            View all <ArrowRight size={14} />
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
              meta={`Exam on ${formatDate(a.examDate)}`}
              isNew={isRecent(a.releaseDate)}
            />
          ))}
        </div>
      </section>

      {/* Eligibility CTA */}
      <section className="container-page">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-[var(--color-primary)] p-8 text-white md:flex-row md:items-center md:p-10">
          <div>
            <h2 className="font-display text-xl font-bold md:text-2xl">
              Not sure if you qualify?
            </h2>
            <p className="mt-2 max-w-md text-sm text-white/80 md:text-base">
              Check your eligibility for any listed job in seconds — with a
              clear reason, not just a yes or no.
            </p>
          </div>
          <ButtonLink
            href="/eligibility-checker"
            variant="secondary"
            size="lg"
            className="border-0 bg-white text-[var(--color-primary)] hover:bg-white/90"
          >
            Check Eligibility
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}