import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  GraduationCap,
  HelpCircle,
  Hourglass,
  ListChecks,
  Users,
} from "lucide-react";
import {
  getPublishedJobs,
  getPublishedJobBySlug,
  getApplicationEndDate,
  isClosingSoon,
  getRelatedJobs,
} from "@/lib/server/data";
import { formatDate, daysUntil } from "@/lib/utils";
import { ButtonLink } from "@/components/Button";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import { KeyValueRow } from "@/components/KeyValueRow";
import SourceVerified from "@/components/SourceVerified";
import JobCard from "@/components/JobCard";
import { Section, StepList, PipeTableOrText } from "@/components/DetailSections";
import {
  ApplicationFeeSection,
  VacancyDetailsSection,
  SelectionProcessSection,
  ExamPatternSection,
  DocumentsRequiredSection,
} from "@/components/RichSections";

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

  const hasAgeGradeTable = Array.isArray(job.ageLimitByGrade) && job.ageLimitByGrade.length > 0;
  const hasAgeRelaxationTable = Array.isArray(job.ageRelaxationBreakdown) && job.ageRelaxationBreakdown.length > 0;
  const hasAgeLimitFallback = !hasAgeGradeTable && !hasAgeRelaxationTable && !!job.ageLimitText;

  // The sidebar's Apply Officially / Official Notification buttons
  // already cover those same two links whenever the source's own
  // "Important Links" list includes them — this dedupes by URL so
  // they don't appear twice (once as a fixed button, once again in a
  // separate list), while any genuinely distinct link (the org's
  // official website, an admit-card page, etc.) still shows up as its
  // own button rather than being dropped.
  const otherImportantLinks = (Array.isArray(job.importantLinks) ? job.importantLinks : []).filter(
    (link) => link.url !== job.officialApplyUrl && link.url !== job.officialNotificationUrl
  );

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
        {/* min-w-0 overrides the grid item's default min-width:auto —
            without it, a wide table's intrinsic content width (a
            27-column vacancy table can't shrink below its own content)
            forces this ENTIRE grid column to grow to fit it, dragging
            every other section and the sidebar along with it, instead
            of being contained by the table's own overflow-x-auto
            wrapper the way it should be. */}
        <div className="order-2 min-w-0 space-y-6 lg:order-1">
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

          <ApplicationFeeSection fee={job.applicationFee} feeText={job.applicationFeeText} />

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

          <VacancyDetailsSection
            vacancyBreakdown={job.vacancyBreakdown}
            postDetailsText={job.postDetailsText}
            totalVacancies={job.totalVacancies}
          />

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

          <SelectionProcessSection
            selectionProcess={job.selectionProcess}
            selectionProcessText={job.selectionProcessText}
          />

          <ExamPatternSection examPattern={job.examPattern} examPatternNotes={job.examPatternNotes} />

          <DocumentsRequiredSection documentsRequired={job.documentsRequired} />

          {job.syllabusSummary && (
            <Section title="Syllabus" accent="neutral">
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{job.syllabusSummary}</p>
            </Section>
          )}

          <Section title="How to Apply" icon={<ListChecks size={16} />} accent="green">
            <StepList items={job.howToApply} />
          </Section>

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

          {/* Every source section that doesn't map to one of the specific
              ones above — e.g. a "Physical Eligibility" table alongside
              Education Eligibility — rendered generically, titled with
              the source's own heading text, instead of being dropped for
              not matching a hardcoded field. */}
          {job.additionalSections?.map((section, i) => (
            <Section key={i} title={section.heading} icon={<FileText size={16} />} accent="neutral">
              <PipeTableOrText text={section.content} />
            </Section>
          ))}

          {job.conclusion && (
            <Section title="Conclusion" icon={<CheckCircle2 size={16} />} accent="green">
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
            {otherImportantLinks.map((link) => (
              <ButtonLink
                key={link.label}
                href={link.url}
                target="_blank"
                variant="secondary"
                className="mt-2 w-full"
              >
                {link.label} <ExternalLink size={14} />
              </ButtonLink>
            ))}
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
