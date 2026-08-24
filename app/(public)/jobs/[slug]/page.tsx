import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, ExternalLink, FileText, Link2, ShieldCheck, Users } from "lucide-react";
import { jobs, getJobBySlug, getApplicationEndDate, isClosingSoon, getRelatedJobs } from "@/lib/mock-data";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import { ButtonLink } from "@/components/Button";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import { KeyValueRow, StatFact } from "@/components/KeyValueRow";
import SourceVerified from "@/components/SourceVerified";
import JobCard from "@/components/JobCard";

export function generateStaticParams() {
  return jobs.map((job) => ({ slug: job.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = getJobBySlug(slug);
  if (!job) return {};
  return {
    title: job.title,
    description: `${job.title} — ${job.totalVacancies || "Multiple"} vacancies at ${job.organization}. Qualification: ${job.qualification}. Check dates, fees and how to apply.`,
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = getJobBySlug(slug);
  if (!job) notFound();

  const endDate = getApplicationEndDate(job);
  const closingSoon = isClosingSoon(job);
  const remaining = endDate ? daysUntil(endDate) : null;
  const relatedJobs = getRelatedJobs(job, 3);

  return (
    <div className="container-page py-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Jobs", href: "/jobs" },
          { label: job.title },
        ]}
      />

      {/* Header */}
      <Card padding="p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{job.category}</Badge>
          <Badge tone="success">{job.state}</Badge>
          {closingSoon && remaining !== null && (
            <Badge tone="danger">
              {remaining === 0 ? "Closes today" : `Closing in ${remaining}d`}
            </Badge>
          )}
        </div>
        <h1 className="font-display mt-3 text-2xl font-bold leading-tight text-[var(--color-text-primary)] md:text-3xl">
          {job.title}
        </h1>
        <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">
          {job.organization} · {job.department}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
          {job.shortInfo}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--color-border)] pt-5 sm:grid-cols-4">
          <StatFact
            label="Total Vacancies"
            value={job.totalVacancies ? job.totalVacancies.toLocaleString("en-IN") : "As notified"}
          />
          <StatFact label="Qualification" value={job.qualification} />
          <StatFact label="Age Limit" value={`${job.minAge}–${job.maxAge} yrs`} />
          <StatFact
            label="Salary"
            value={job.salaryMin ? `${formatCurrency(job.salaryMin)}–${formatCurrency(job.salaryMax)}` : "As per rules"}
          />
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main content */}
        <div className="order-2 space-y-6 lg:order-1">
          <Section title="Important Dates" icon={<Calendar size={16} />}>
            <div className="divide-y divide-[var(--color-border)]">
              {job.importantDates.map((d) => (
                <div key={d.label} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-[var(--color-text-secondary)]">{d.label}</span>
                  <span className="font-medium text-[var(--color-text-primary)]">{formatDate(d.date)}</span>
                </div>
              ))}
            </div>
          </Section>

          {job.vacancyBreakdown && job.vacancyBreakdown.length > 0 && (
            <Section title="Vacancy Details (Category-wise)" icon={<Users size={16} />}>
              <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                <div className="grid grid-cols-2 bg-[var(--color-background)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  <span>Category</span>
                  <span className="text-right">Posts</span>
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {job.vacancyBreakdown.map((row) => (
                    <div key={row.category} className="grid grid-cols-2 px-4 py-2.5 text-sm">
                      <span className="text-[var(--color-text-secondary)]">{row.category}</span>
                      <span className="text-right font-medium text-[var(--color-text-primary)]">
                        {row.count.toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                  <div className="grid grid-cols-2 bg-[var(--color-background)] px-4 py-2.5 text-sm font-semibold">
                    <span className="text-[var(--color-text-primary)]">Total</span>
                    <span className="text-right text-[var(--color-text-primary)]">
                      {job.totalVacancies.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            </Section>
          )}

          <Section title="Eligibility" icon={<ShieldCheck size={16} />}>
            <div className="space-y-3">
              <KeyValueRow label="Qualification" value={job.qualification} />
              <KeyValueRow label="Age Limit" value={`${job.minAge} to ${job.maxAge} years`} />
            </div>

            {job.ageRelaxationBreakdown && job.ageRelaxationBreakdown.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-lg border border-[var(--color-border)]">
                <div className="grid grid-cols-2 bg-[var(--color-background)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  <span>Age Relaxation</span>
                  <span className="text-right">Category</span>
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {job.ageRelaxationBreakdown.map((row) => (
                    <div key={row.category} className="grid grid-cols-2 px-4 py-2.5 text-sm">
                      <span className="font-medium text-[var(--color-text-primary)]">{row.relaxation}</span>
                      <span className="text-right text-[var(--color-text-secondary)]">{row.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Link
              href={`/eligibility-checker?job=${job.id}`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)]"
            >
              Check your eligibility for this job →
            </Link>
          </Section>

          <Section title="Application Fee">
            <div className="space-y-3">
              <KeyValueRow label="General / OBC" value={formatCurrency(job.applicationFee.general)} />
              <KeyValueRow label="SC / ST / Reserved" value={formatCurrency(job.applicationFee.reserved)} />
              {job.applicationFee.note && (
                <p className="text-xs text-[var(--color-text-secondary)]">{job.applicationFee.note}</p>
              )}
            </div>
          </Section>

          <Section title="Selection Process">
            <StepList items={job.selectionProcess} />
          </Section>

          {job.examPattern && (
            <Section title="Exam Pattern">
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{job.examPattern}</p>
            </Section>
          )}

          {job.syllabusSummary && (
            <Section title="Syllabus">
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{job.syllabusSummary}</p>
            </Section>
          )}

          <Section title="How to Apply">
            <StepList items={job.howToApply} />
          </Section>

          {job.importantLinks && job.importantLinks.length > 0 && (
            <Section title="Important Links" icon={<Link2 size={16} />}>
              <div className="divide-y divide-[var(--color-border)]">
                {job.importantLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-[var(--color-primary)]"
                  >
                    <span className="font-medium text-[var(--color-text-primary)]">{link.label}</span>
                    <ExternalLink size={14} className="shrink-0 text-[var(--color-text-muted)]" />
                  </a>
                ))}
              </div>
            </Section>
          )}

          {relatedJobs.length > 0 && (
            <div>
              <h2 className="font-display text-lg font-bold text-[var(--color-text-primary)]">
                Related Jobs
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {relatedJobs.map((rj) => (
                  <JobCard key={rj.id} job={rj} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-24 lg:h-fit">
          <Card>
            <ButtonLink href={job.officialApplyUrl} target="_blank" className="w-full">
              Apply Officially <ExternalLink size={14} />
            </ButtonLink>
            <ButtonLink
              href={job.officialNotificationUrl}
              target="_blank"
              variant="secondary"
              className="mt-2 w-full"
            >
              <FileText size={14} /> Official Notification
            </ButtonLink>
            <div className="mt-3">
              <SourceVerified sourceUrl={job.sourceUrl} />
            </div>
          </Card>

          <Card>
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
              <Users size={15} /> At a glance
            </p>
            <div className="mt-3 space-y-2.5">
              <KeyValueRow label="Organization" value={job.organization} />
              <KeyValueRow label="Department" value={job.department} />
              <KeyValueRow label="Category" value={job.category} />
              <KeyValueRow label="Last Updated" value={formatDate(job.updatedAt)} />
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <h2 className="flex items-center gap-2 text-[15px] font-bold text-[var(--color-text-primary)]">
        {icon}
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function StepList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2">
      {items.map((step, i) => (
        <li key={step} className="flex gap-3 text-sm">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-tint)] text-[10px] font-bold text-[var(--color-primary)]">
            {i + 1}
          </span>
          <span className="text-[var(--color-text-primary)]">{step}</span>
        </li>
      ))}
    </ol>
  );
}
