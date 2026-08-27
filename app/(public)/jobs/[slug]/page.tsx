import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, ExternalLink, FileText, HelpCircle, Link2, ShieldCheck, Users } from "lucide-react";
import {
  getPublishedJobs,
  getPublishedJobBySlug,
  getApplicationEndDate,
  isClosingSoon,
  getRelatedJobs,
} from "@/lib/server/data";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import { ButtonLink } from "@/components/Button";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import { KeyValueRow, StatFact } from "@/components/KeyValueRow";
import SourceVerified from "@/components/SourceVerified";
import JobCard from "@/components/JobCard";

// Statically generated for speed/SEO, but re-checked against the
// database every 5 minutes in the background so an admin edit or
// unpublish doesn't stay stale until the next deploy.
export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const jobs = await getPublishedJobs();
    return jobs.map((job) => ({ slug: job.slug }));
  } catch (err) {
    // If Supabase is briefly unreachable at build time, degrade to zero
    // statically pre-rendered job pages rather than failing the entire
    // site's deployment — every page still renders correctly on-demand.
    console.warn("generateStaticParams: could not fetch jobs at build time, skipping pre-render.", err);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getPublishedJobBySlug(slug);
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
  const job = await getPublishedJobBySlug(slug);
  if (!job) notFound();

  const endDate = getApplicationEndDate(job);
  const closingSoon = isClosingSoon(job);
  const remaining = endDate ? daysUntil(endDate) : null;
  const relatedJobs = await getRelatedJobs(job, 3);

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
          <StatFact label="Qualification" value={job.qualification || "As per notification"} />
          <StatFact label="Age Limit" value={job.minAge && job.maxAge ? `${job.minAge}–${job.maxAge} yrs` : "As per rules"} />
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
              {(Array.isArray(job.importantDates) ? job.importantDates : []).map((d) => (
                <div key={d.label} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-[var(--color-text-secondary)]">{d.label}</span>
                  <span className="font-medium text-[var(--color-text-primary)]">{formatDate(d.date)}</span>
                </div>
              ))}
            </div>
          </Section>

          {Array.isArray(job.vacancyBreakdown) && job.vacancyBreakdown.length > 0 && (() => {
            const hasGrade = job.vacancyBreakdown!.some((row) => row.grade);
            const cols = hasGrade ? "grid-cols-[1fr_auto_auto]" : "grid-cols-2";
            return (
              <Section title="Vacancy Details (Category-wise)" icon={<Users size={16} />}>
                <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                  <div className={`grid ${cols} gap-3 bg-[var(--color-background)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]`}>
                    <span>Post / Category</span>
                    {hasGrade && <span>Grade</span>}
                    <span className="text-right">Posts</span>
                  </div>
                  <div className="divide-y divide-[var(--color-border)]">
                    {job.vacancyBreakdown!.map((row) => (
                      <div key={row.category} className={`grid ${cols} gap-3 px-4 py-2.5 text-sm`}>
                        <span className="text-[var(--color-text-secondary)]">{row.category}</span>
                        {hasGrade && <span className="text-[var(--color-text-secondary)]">{row.grade ?? "—"}</span>}
                        <span className="text-right font-medium text-[var(--color-text-primary)]">
                          {row.count.toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                    <div className={`grid ${cols} gap-3 bg-[var(--color-background)] px-4 py-2.5 text-sm font-semibold`}>
                      <span className="text-[var(--color-text-primary)]">Total</span>
                      {hasGrade && <span />}
                      <span className="text-right text-[var(--color-text-primary)]">
                        {job.totalVacancies ? job.totalVacancies.toLocaleString("en-IN") : "As notified"}
                      </span>
                    </div>
                  </div>
                </div>
              </Section>
            );
          })()}

          <Section title="Eligibility" icon={<ShieldCheck size={16} />}>
            <div className="space-y-3">
              <KeyValueRow label="Qualification" value={job.qualification || "As per notification"} />
              <KeyValueRow
                label="Age Limit"
                value={job.minAge && job.maxAge ? `${job.minAge} to ${job.maxAge} years` : "As per official notification"}
              />
              {job.ageAsOnDate && (
                <KeyValueRow label="Age Reckoned As On" value={formatDate(job.ageAsOnDate)} />
              )}
            </div>

            {Array.isArray(job.eligibilityDetails) && job.eligibilityDetails.length > 0 && (
              <ul className="mt-4 space-y-2">
                {job.eligibilityDetails.map((point, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}

            {Array.isArray(job.ageLimitByGrade) && job.ageLimitByGrade.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Grade-wise Age Limit
                </p>
                <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                  <div className="grid grid-cols-3 gap-3 bg-[var(--color-background)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    <span>Grade / Cadre</span>
                    <span>Min. Age</span>
                    <span>Max. Age</span>
                  </div>
                  <div className="divide-y divide-[var(--color-border)]">
                    {job.ageLimitByGrade.map((row, i) => (
                      <div key={i} className="grid grid-cols-3 gap-3 px-4 py-2.5 text-sm">
                        <span className="font-medium text-[var(--color-text-primary)]">{row.grade}</span>
                        <span className="text-[var(--color-text-secondary)]">{row.minAge}</span>
                        <span className="text-[var(--color-text-secondary)]">{row.maxAge}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {Array.isArray(job.ageRelaxationBreakdown) && job.ageRelaxationBreakdown.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Age Relaxation
                </p>
                <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                  <div className="grid grid-cols-2 bg-[var(--color-background)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                    <span>Category</span>
                    <span className="text-right">Relaxation</span>
                  </div>
                  <div className="divide-y divide-[var(--color-border)]">
                    {job.ageRelaxationBreakdown.map((row) => (
                      <div key={row.category} className="grid grid-cols-2 px-4 py-2.5 text-sm">
                        <span className="text-[var(--color-text-secondary)]">{row.category}</span>
                        <span className="text-right font-medium text-[var(--color-text-primary)]">{row.relaxation}</span>
                      </div>
                    ))}
                  </div>
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
              <KeyValueRow label="General / OBC" value={formatCurrency(job.applicationFee?.general ?? 0)} />
              <KeyValueRow label="SC / ST / Reserved" value={formatCurrency(job.applicationFee?.reserved ?? 0)} />
              {job.applicationFee?.note && (
                <p className="text-xs text-[var(--color-text-secondary)]">{job.applicationFee.note}</p>
              )}
            </div>
          </Section>

          <Section title="Selection Process">
            <StepList items={job.selectionProcess} />
          </Section>

          {job.examPattern && (
            <Section title="Exam Pattern">
              <PipeTableOrText text={job.examPattern} />
              {Array.isArray(job.examPatternNotes) && job.examPatternNotes.length > 0 && (
                <ul className="mt-4 space-y-1.5 border-t border-[var(--color-border)] pt-4">
                  {job.examPatternNotes.map((note, i) => (
                    <li key={i} className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
                      • {note}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          {job.documentsRequired && (
            <Section title="Documents Required">
              <PipeTableOrText text={job.documentsRequired} />
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

          {Array.isArray(job.importantLinks) && job.importantLinks.length > 0 && (
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

          {Array.isArray(job.faqs) && job.faqs.length > 0 && (
            <Section title="FAQs" icon={<HelpCircle size={16} />}>
              <div className="divide-y divide-[var(--color-border)]">
                {job.faqs.map((faq, i) => (
                  <div key={i} className={i === 0 ? "pb-4" : "py-4"}>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      Q{i + 1}. {faq.question}
                    </p>
                    <p className="mt-1.5 border-l-2 border-[var(--color-primary-tint)] pl-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {job.conclusion && (
            <Section title="Conclusion">
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{job.conclusion}</p>
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
  // Belt-and-suspenders: approveDraft now validates this shape before
  // insert, but this guards any record already in the database from
  // before that fix, and any other path that might ever write here.
  const safeItems = Array.isArray(items) ? items : [];
  if (safeItems.length === 0) {
    return <p className="text-sm text-[var(--color-text-secondary)]">See the official notification for details.</p>;
  }
  return (
    <ol className="space-y-2">
      {safeItems.map((step, i) => (
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

// Exam Pattern / Documents Required come through as the same
// "cell | cell || row || row" pipe-delimited strings the bot's HTML
// extractor produces (see extractHtmlNotificationFields.ts) — they were
// previously dumped straight into a <p>, which is why Exam Pattern
// rendered as one long run-on line instead of the table the source
// notification actually shows. Parsed here into a proper table; falls
// back to plain text for anything that isn't in that pipe-row shape
// (e.g. a hand-edited free-text value), so this never hides content it
// can't parse.
function parsePipeRows(text: string): string[][] {
  if (!text.includes(" | ")) return [];
  return text
    .split(" || ")
    .map((row) => row.split(" | ").map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));
}

function PipeTableOrText({ text }: { text: string }) {
  const rows = parsePipeRows(text);
  if (rows.length < 2) {
    return <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{text}</p>;
  }
  const [header, ...body] = rows;
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[var(--color-background)] text-left text-[var(--color-text-muted)]">
            {header.map((cell, i) => (
              <th key={i} className="whitespace-nowrap px-3 py-2 font-semibold">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {body.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="whitespace-nowrap px-3 py-2 text-[var(--color-text-secondary)]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}