import { Fragment } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Calendar,
  ExternalLink,
  FileText,
  GraduationCap,
  ListChecks,
  Users,
} from "lucide-react";
import { Job } from "@/lib/types";
import { formatDate, daysUntil, isSourceSiteUrl, documentViewerHref } from "@/lib/utils";
import { getApplicationEndDate, isClosingSoon } from "@/lib/dateHelpers";
import { resolveSectionOrder, parseGenericKey } from "@/lib/sectionOrder";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import { KeyValueRow } from "@/components/KeyValueRow";
import JobCard from "@/components/JobCard";
import { Section, StepList, PipeTableOrText, GenericSection } from "@/components/DetailSections";
import { ImportantLinksCard, AtAGlanceCard } from "@/components/detail/DetailSidebar";
import {
  ApplicationFeeSection,
  AgeLimitSection,
  VacancyDetailsSection,
  SelectionProcessSection,
  ExamPatternSection,
  DocumentsRequiredSection,
  FaqsSection,
  ConclusionSection,
  SectionTranslator,
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
  const t = useTranslations("detail") as SectionTranslator;
  const tJobs = useTranslations("jobsPage");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const localePath = (path: string) => (locale === "en" ? path : `/${locale}${path}`);
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
          { label: tCommon("home"), href: localePath("/") },
          { label: tJobs("breadcrumb"), href: localePath("/jobs") },
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
              {remaining === 0 ? t("closesToday") : t("closingInDays", { days: remaining })}
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
                <Section title={t("importantDates")} icon={<Calendar size={16} />} accent="blue">
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
              applicationFeeRaw: <ApplicationFeeSection fee={job.applicationFee} feeText={job.applicationFeeText} t={t} />,
              ageLimitRaw: (
                <AgeLimitSection
                  ageLimitByGrade={job.ageLimitByGrade}
                  ageRelaxationBreakdown={job.ageRelaxationBreakdown}
                  ageLimitText={job.ageLimitText}
                  t={t}
                >
                  {job.ageAsOnDate && (
                    <p className="mt-3 text-xs text-[var(--color-text-secondary)]">
                      {t("ageAsOn", { date: formatDate(job.ageAsOnDate) })}
                    </p>
                  )}
                </AgeLimitSection>
              ),
              postDetailsRaw: (
                <VacancyDetailsSection
                  vacancyBreakdown={job.vacancyBreakdown}
                  postDetailsText={job.postDetailsText}
                  totalVacancies={job.totalVacancies}
                  t={t}
                />
              ),
              eligibilityRaw:
                job.qualification || (Array.isArray(job.eligibilityDetails) && job.eligibilityDetails.length > 0) || job.eligibilityText ? (
                  <Section title={t("educationEligibility")} icon={<GraduationCap size={16} />} accent="teal">
                    {job.qualification && <KeyValueRow label={t("qualification")} value={job.qualification} />}

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
                  t={t}
                />
              ),
              examPatternRaw: (
                <ExamPatternSection examPattern={job.examPattern} examPatternNotes={job.examPatternNotes} t={t} />
              ),
              documentsRequiredRaw: <DocumentsRequiredSection documentsRequired={job.documentsRequired} t={t} />,
              syllabusSummary: job.syllabusSummary ? (
                <Section title={t("syllabus")} accent="neutral">
                  <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{job.syllabusSummary}</p>
                </Section>
              ) : null,
              howToApplyRaw:
                Array.isArray(job.howToApply) && job.howToApply.length > 0 ? (
                  <Section title={t("howToApply")} icon={<ListChecks size={16} />} accent="green">
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

          <FaqsSection faqs={job.faqs} t={t} />
          <ConclusionSection conclusion={job.conclusion} t={t} />

          {relatedJobs.length > 0 && (
            <div>
              <h2 className="font-display text-lg font-bold text-[var(--color-text-primary)]">
                {t("relatedJobs")}
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
          <ImportantLinksCard
            title={t("importantLinks")}
            sourceLinks={sourceLinks}
            noLinkMessage={t("noOfficialLinkJob")}
            sourceUrl={job.sourceUrl}
            officialButtons={[
              ...(hasRealApplyUrl
                ? [
                    {
                      href: documentViewerHref(job.officialApplyUrl, t("applyOfficially")),
                      label: t("applyOfficially"),
                      trailingIcon: <ExternalLink size={14} />,
                    },
                  ]
                : []),
              ...(hasRealNotificationUrl
                ? [
                    {
                      href: documentViewerHref(job.officialNotificationUrl, t("officialNotification")),
                      label: t("officialNotification"),
                      variant: "secondary" as const,
                      leadingIcon: <FileText size={14} />,
                    },
                  ]
                : []),
            ]}
          />

          <AtAGlanceCard
            title={t("atAGlance")}
            icon={<Users size={15} />}
            rows={[
              { label: t("organization"), value: job.organization },
              { label: t("department"), value: job.department },
              { label: t("category"), value: job.category },
              { label: t("lastUpdated"), value: formatDate(job.updatedAt) },
            ]}
            footer={
              <Link
                href={localePath(`/eligibility-checker?job=${job.id}`)}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)]"
              >
                {t("checkEligibility")}
              </Link>
            }
          />
        </aside>
      </div>
    </div>
  );
}
