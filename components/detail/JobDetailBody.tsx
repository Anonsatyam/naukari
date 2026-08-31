import { Fragment } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  ExternalLink,
  FileText,
  GraduationCap,
  HelpCircle,
  Link2,
  ListChecks,
  Users,
} from "lucide-react";
import { Job } from "@/lib/types";
import { formatDate, daysUntil, isSourceSiteUrl, documentViewerHref } from "@/lib/utils";
import { getApplicationEndDate, isClosingSoon } from "@/lib/dateHelpers";
import { resolveSectionOrder, parseGenericKey } from "@/lib/sectionOrder";
import { ButtonLink } from "@/components/Button";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import { KeyValueRow } from "@/components/KeyValueRow";
import SourceVerified from "@/components/SourceVerified";
import JobCard from "@/components/JobCard";
import { Section, StepList, PipeTableOrText, GenericSection } from "@/components/DetailSections";
import {
  ApplicationFeeSection,
  AgeLimitSection,
  VacancyDetailsSection,
  SelectionProcessSection,
  ExamPatternSection,
  DocumentsRequiredSection,
} from "@/components/RichSections";

const JOB_DEFAULT_ORDER = [
  "importantDatesRaw",
  "applicationFeeRaw",
  "ageLimitRaw",
  "postDetailsRaw",
  "eligibilityRaw",
  "selectionProcessRaw",
  "examPatternRaw",
  "documentsRequiredRaw",
  "syllabusSummary",
  "howToApplyRaw",
];

export function JobDetailBody({ job, relatedJobs = [] }: { job: Job; relatedJobs?: Job[] }) {
  const endDate = getApplicationEndDate(job);
  const closingSoon = isClosingSoon(job);
  const remaining = endDate ? daysUntil(endDate) : null;

  const additionalSections = job.additionalSections ?? [];
  const orderedSectionKeys = resolveSectionOrder(job.sectionOrder, JOB_DEFAULT_ORDER, additionalSections.length);

  const sourceLinks = (Array.isArray(job.importantLinks) ? job.importantLinks : []).filter(
    (link) => !isSourceSiteUrl(link.url)
  );
  const hasRealApplyUrl = !isSourceSiteUrl(job.officialApplyUrl);
  const hasRealNotificationUrl = !isSourceSiteUrl(job.officialNotificationUrl);

  return (
    <div className="container-page py-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Jobs", href: "/jobs" },
          { label: job.title },
        ]}
      />

      <Card padding="p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{job.category}</Badge>
          <Badge tone="success">{job.state}</Badge>
          {job.tags?.map((tag) => (
            <Badge key={tag} tone="neutral">
              {tag}
            </Badge>
          ))}
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
        <div className="order-2 min-w-0 space-y-6 lg:order-1">
          {(() => {
            const sectionRenderers: Record<string, React.ReactNode> = {
              importantDatesRaw: (
                <Section title="Important Dates" icon={<Calendar size={16} />} accent="blue">
                  {job.importantDatesText ? (
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
              ),
              applicationFeeRaw: <ApplicationFeeSection fee={job.applicationFee} feeText={job.applicationFeeText} />,
              ageLimitRaw: (
                <AgeLimitSection
                  ageLimitByGrade={job.ageLimitByGrade}
                  ageRelaxationBreakdown={job.ageRelaxationBreakdown}
                  ageLimitText={job.ageLimitText}
                >
                  {job.ageAsOnDate && (
                    <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
                      Age reckoned as on {formatDate(job.ageAsOnDate)}
                    </p>
                  )}
                </AgeLimitSection>
              ),
              postDetailsRaw: (
                <VacancyDetailsSection
                  vacancyBreakdown={job.vacancyBreakdown}
                  postDetailsText={job.postDetailsText}
                  totalVacancies={job.totalVacancies}
                />
              ),
              eligibilityRaw:
                job.qualification || (Array.isArray(job.eligibilityDetails) && job.eligibilityDetails.length > 0) || job.eligibilityText ? (
                  <Section title="Education Eligibility" icon={<GraduationCap size={16} />} accent="teal">
                    {job.qualification && <KeyValueRow label="Qualification" value={job.qualification} />}

                    {Array.isArray(job.eligibilityDetails) && job.eligibilityDetails.length > 0 ? (
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
                ) : null,
              selectionProcessRaw: (
                <SelectionProcessSection
                  selectionProcess={job.selectionProcess}
                  selectionProcessText={job.selectionProcessText}
                />
              ),
              examPatternRaw: <ExamPatternSection examPattern={job.examPattern} examPatternNotes={job.examPatternNotes} />,
              documentsRequiredRaw: <DocumentsRequiredSection documentsRequired={job.documentsRequired} />,
              syllabusSummary: job.syllabusSummary ? (
                <Section title="Syllabus" accent="neutral">
                  <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{job.syllabusSummary}</p>
                </Section>
              ) : null,
              howToApplyRaw:
                Array.isArray(job.howToApply) && job.howToApply.length > 0 ? (
                  <Section title="How to Apply" icon={<ListChecks size={16} />} accent="green">
                    <StepList items={job.howToApply} />
                  </Section>
                ) : null,
            };

            return orderedSectionKeys.map((key) => {
              const genericIdx = parseGenericKey(key);
              if (genericIdx !== null) {
                const section = additionalSections[genericIdx];
                if (!section) return null;
                return <GenericSection key={key} section={section} icon={<FileText size={16} />} />;
              }
              return <Fragment key={key}>{sectionRenderers[key] ?? null}</Fragment>;
            });
          })()}

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

        <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-24 lg:h-fit">
          <Card>
            <p className="mb-3 flex items-center gap-2 text-base font-bold text-[var(--color-text-primary)]">
              <Link2 size={17} /> Important Links
            </p>
            {sourceLinks.length > 0 ? (
              sourceLinks.map((link, i) => (
                <ButtonLink
                  key={`${link.label}-${i}`}
                  href={documentViewerHref(link.url, link.label)}
                  target="_blank"
                  variant="secondary"
                  className={i === 0 ? "w-full" : "mt-2 w-full"}
                >
                  {link.label} <ExternalLink size={14} />
                </ButtonLink>
              ))
            ) : hasRealApplyUrl || hasRealNotificationUrl ? (
              <>
                {hasRealApplyUrl && (
                  <ButtonLink href={documentViewerHref(job.officialApplyUrl, "Apply Officially")} target="_blank" className="w-full">
                    Apply Officially <ExternalLink size={14} />
                  </ButtonLink>
                )}
                {hasRealNotificationUrl && (
                  <ButtonLink
                    href={documentViewerHref(job.officialNotificationUrl, "Official Notification")}
                    target="_blank"
                    variant="secondary"
                    className={hasRealApplyUrl ? "mt-2 w-full" : "w-full"}
                  >
                    <FileText size={14} /> Official Notification
                  </ButtonLink>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)]">
                No official link could be found for this posting yet — check the source notification for details.
              </p>
            )}
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
            <Link
              href={`/eligibility-checker?job=${job.id}`}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)]"
            >
              Check your eligibility for this job →
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
