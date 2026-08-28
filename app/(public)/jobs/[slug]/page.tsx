import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  GraduationCap,
  HelpCircle,
  Hourglass,
  Link2,
  ListChecks,
  Users,
  Wallet,
} from "lucide-react";
import {
  getPublishedJobs,
  getPublishedJobBySlug,
  getApplicationEndDate,
  isClosingSoon,
  getRelatedJobs,
} from "@/lib/server/data";
import { formatCurrency, formatDate, daysUntil } from "@/lib/utils";
import { parsePipeTables } from "@/lib/pipeTables";
import { ButtonLink } from "@/components/Button";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import { KeyValueRow } from "@/components/KeyValueRow";
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

  const hasVacancyTable = Array.isArray(job.vacancyBreakdown) && job.vacancyBreakdown.length > 0;
  const hasVacancyFallback = !hasVacancyTable && !!job.postDetailsText;

  const hasAgeGradeTable = Array.isArray(job.ageLimitByGrade) && job.ageLimitByGrade.length > 0;
  const hasAgeRelaxationTable = Array.isArray(job.ageRelaxationBreakdown) && job.ageRelaxationBreakdown.length > 0;
  const hasAgeLimitFallback = !hasAgeGradeTable && !hasAgeRelaxationTable && !!job.ageLimitText;

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
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main content */}
        <div className="order-2 space-y-6 lg:order-1">
          <Section title="Important Dates" icon={<Calendar size={16} />} accent="blue">
            {job.importantDatesText ? (
              // The full dates table as the source actually published it —
              // includes rows (PET schedule, provisional allotment, a
              // month-only value, a relative "2 days after registration
              // closes" edit window) that don't fit the canonical
              // {label, ISO date} shape below and would otherwise be lost.
              <PipeTableOrText text={job.importantDatesText} />
            ) : (
              <div>
                {(Array.isArray(job.importantDates) ? job.importantDates : []).map((d) => (
                  <div key={d.label} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-[var(--color-text-secondary)]">{d.label}</span>
                    <span className="font-medium text-[var(--color-text-primary)]">{formatDate(d.date)}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Application Fee" icon={<Wallet size={16} />} accent="green">
            {job.applicationFeeText ? (
              // The full fee table as the source actually published it
              // already covers categories/footnotes (a PwBD/OH-only row,
              // a payment-method note) — the two-number summary is only
              // needed when there's no full table to fall back to.
              <PipeTableOrText text={job.applicationFeeText} />
            ) : (
              <div className="space-y-3">
                <KeyValueRow label="General / OBC" value={formatCurrency(job.applicationFee?.general ?? 0)} />
                <KeyValueRow label="SC / ST / Reserved" value={formatCurrency(job.applicationFee?.reserved ?? 0)} />
                {job.applicationFee?.note && (
                  <p className="text-xs text-[var(--color-text-secondary)]">{job.applicationFee.note}</p>
                )}
              </div>
            )}
          </Section>

          <Section title="Age Limit Details" icon={<Hourglass size={16} />} accent="purple">
            {!hasAgeGradeTable && !hasAgeRelaxationTable && !hasAgeLimitFallback && (
              <div className="space-y-3">
                <KeyValueRow
                  label="Age Limit"
                  value={job.minAge && job.maxAge ? `${job.minAge} to ${job.maxAge} years` : "As per official notification"}
                />
                {job.ageAsOnDate && (
                  <KeyValueRow label="Age Reckoned As On" value={formatDate(job.ageAsOnDate)} />
                )}
              </div>
            )}

            {hasAgeGradeTable && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Grade-wise Age Limit
                </p>
                <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                  <div className="grid grid-cols-3 gap-3 bg-[var(--color-primary)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white">
                    <span>Grade / Cadre</span>
                    <span>Min. Age</span>
                    <span>Max. Age</span>
                  </div>
                  <div>
                    {job.ageLimitByGrade!.map((row, i) => (
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

            {hasAgeRelaxationTable && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Age Relaxation
                </p>
                <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                  <div className="grid grid-cols-2 bg-[var(--color-primary)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white">
                    <span>Category</span>
                    <span className="text-right">Relaxation</span>
                  </div>
                  <div>
                    {job.ageRelaxationBreakdown!.map((row) => (
                      <div key={row.category} className="grid grid-cols-2 px-4 py-2.5 text-sm">
                        <span className="text-[var(--color-text-secondary)]">{row.category}</span>
                        <span className="text-right font-medium text-[var(--color-text-primary)]">{row.relaxation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {hasAgeLimitFallback && (
              <div className="mt-4">
                <PipeTableOrText text={job.ageLimitText!} />
              </div>
            )}

            <Link
              href={`/eligibility-checker?job=${job.id}`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)]"
            >
              Check your eligibility for this job →
            </Link>
          </Section>

          {(hasVacancyTable || hasVacancyFallback) && (() => {
            const hasGrade = hasVacancyTable && job.vacancyBreakdown!.some((row) => row.grade);
            const cols = hasGrade ? "grid-cols-[1fr_auto_auto]" : "grid-cols-2";
            return (
              <Section title="Post / Vacancy Details" icon={<Users size={16} />} accent="orange">
                {hasVacancyTable ? (
                  <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
                    <div className={`grid ${cols} gap-3 bg-[var(--color-primary)] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white`}>
                      <span>Post / Category</span>
                      {hasGrade && <span>Grade</span>}
                      <span className="text-right">Posts</span>
                    </div>
                    <div>
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
                ) : (
                  <PipeTableOrText text={job.postDetailsText!} />
                )}
              </Section>
            );
          })()}

          <Section title="Education Eligibility" icon={<GraduationCap size={16} />} accent="teal">
            <KeyValueRow label="Qualification" value={job.qualification || "As per notification"} />

            {Array.isArray(job.eligibilityDetails) && job.eligibilityDetails.length > 0 ? (
              // An admin-curated bullet list — shown in preference to the
              // raw table below since it represents deliberate cleanup.
              <ul className="mt-4 space-y-2">
                {job.eligibilityDetails.map((point, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent-teal)]" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            ) : (
              job.eligibilityText && (
                <div className="mt-4">
                  <PipeTableOrText text={job.eligibilityText} />
                </div>
              )
            )}
          </Section>

          <Section title="Selection Process" icon={<ListChecks size={16} />} accent="blue">
            {job.selectionProcessText ? (
              // The source's own table, verbatim — selectionProcess (the
              // numbered-steps fallback below) is a lossy one-line-per-
              // stage reformatting of this, built only for sources with
              // no table at all.
              <PipeTableOrText text={job.selectionProcessText} />
            ) : (
              <StepList items={job.selectionProcess} />
            )}
          </Section>

          {job.examPattern && (
            <Section title="Exam Pattern" icon={<ClipboardList size={16} />} accent="amber">
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
            <Section title="Documents Required" icon={<FileText size={16} />} accent="neutral">
              <PipeTableOrText text={job.documentsRequired} />
            </Section>
          )}

          {job.syllabusSummary && (
            <Section title="Syllabus" accent="neutral">
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{job.syllabusSummary}</p>
            </Section>
          )}

          <Section title="How to Apply" icon={<ListChecks size={16} />} accent="green">
            <StepList items={job.howToApply} />
          </Section>

          {Array.isArray(job.importantLinks) && job.importantLinks.length > 0 && (
            <Section title="Important Links" icon={<Link2 size={16} />} accent="blue">
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
  <Section title="FAQs" icon={<HelpCircle size={16} />} accent="pink">
    <div className="divide-y divide-[var(--color-border)]">
      {job.faqs.map((faq, i) => (
        <div key={i} className={i === 0 ? "pb-4" : "py-4"}>
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            {faq.question}
          </p>
          <p className="mt-1.5 border-l-2 border-[var(--color-accent-pink-tint)] pl-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            {faq.answer}
          </p>
        </div>
      ))}
    </div>
  </Section>
          )}

          {job.conclusion && (
            <Section title="Conclusion" icon={<CheckCircle2 size={16} />} accent="neutral">
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

type Accent = "blue" | "green" | "purple" | "orange" | "teal" | "amber" | "pink" | "neutral";

// Each section on this page gets a color-coded icon chip so a page
// carrying ten-plus sections stays visually scannable — colors pull
// from the same CSS-variable palette (globals.css) the rest of the
// site already uses (the semantic tones directly, four new --color-
// accent-* tones for the rest), rather than a one-off palette bolted
// onto just this page. Sections no longer get a colored left-edge
// border on top of that — just the plain card border every other
// card on the site uses.
const ACCENTS: Record<Accent, { iconBg: string; iconText: string }> = {
  blue: {
    iconBg: "bg-[var(--color-primary-tint)]",
    iconText: "text-[var(--color-primary)]",
  },
  green: {
    iconBg: "bg-[var(--color-success-tint)]",
    iconText: "text-[var(--color-success)]",
  },
  purple: {
    iconBg: "bg-[var(--color-accent-purple-tint)]",
    iconText: "text-[var(--color-accent-purple)]",
  },
  orange: {
    iconBg: "bg-[var(--color-accent-orange-tint)]",
    iconText: "text-[var(--color-accent-orange)]",
  },
  teal: {
    iconBg: "bg-[var(--color-accent-teal-tint)]",
    iconText: "text-[var(--color-accent-teal)]",
  },
  amber: {
    iconBg: "bg-[var(--color-warning-tint)]",
    iconText: "text-[var(--color-warning)]",
  },
  pink: {
    iconBg: "bg-[var(--color-accent-pink-tint)]",
    iconText: "text-[var(--color-accent-pink)]",
  },
  neutral: {
    iconBg: "bg-[var(--color-background)]",
    iconText: "text-[var(--color-text-secondary)]",
  },
};

function Section({
  title,
  icon,
  accent = "neutral",
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  accent?: Accent;
  children: React.ReactNode;
}) {
  const a = ACCENTS[accent];
  return (
    <Card>
      <h2 className="flex items-center gap-2.5 text-[15px] font-bold text-[var(--color-text-primary)]">
        {icon && (
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${a.iconBg} ${a.iconText}`}>
            {icon}
          </span>
        )}
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

// Exam Pattern / Documents Required / the Post-Details, Age-Limit and
// Important-Dates raw-text fallbacks all come through as the pipe-
// encoded, TABLE_SEP-bounded tables lib/pipeTables.ts's parsePipeTables
// understands (see extractHtmlNotificationFields.ts) — rendered here as
// one or more real tables, in source order, each with its own header
// and caption; falls back to plain text for anything that isn't in
// that shape at all (e.g. a hand-edited free-text value), so this
// never hides content it can't parse.
function PipeTableOrText({ text }: { text: string }) {
  const tables = parsePipeTables(text);
  if (tables.length === 0) {
    return <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{text}</p>;
  }
  return (
    <div className="space-y-4">
      {tables.map((t, i) => (
        <div key={i} className="space-y-2">
          {t.caption && <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{t.caption}</p>}
          <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--color-primary)] text-left text-white">
                    {t.header.map((cell, j) => (
                      <th key={j} className="px-3 py-2 align-top font-semibold">
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {t.body.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => (
                        <td key={c} className="whitespace-normal break-words px-3 py-2 align-top text-[var(--color-text-secondary)]">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
