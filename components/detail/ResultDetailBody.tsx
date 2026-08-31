import { Fragment } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Calendar, ExternalLink, FileText, HelpCircle, Link2, ListChecks, CheckCircle2 } from "lucide-react";
import { ResultItem } from "@/lib/types";
import { formatDate, isSourceSiteUrl, documentViewerHref } from "@/lib/utils";
import { resolveSectionOrder, parseGenericKey } from "@/lib/sectionOrder";
import { Section, StepList, PipeTableOrText, GenericSection } from "@/components/DetailSections";
import {
  ApplicationFeeSection,
  AgeLimitSection,
  VacancyDetailsSection,
  EligibilitySection,
  SelectionProcessSection,
  ExamPatternSection,
  DocumentsRequiredSection,
  SectionTranslator,
} from "@/components/RichSections";
import { ButtonLink } from "@/components/Button";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import { KeyValueRow } from "@/components/KeyValueRow";
import SourceVerified from "@/components/SourceVerified";

const RESULT_DEFAULT_ORDER = [
  "importantDatesRaw",
  "howToApplyRaw",
  "cutoffText",
  "applicationFeeRaw",
  "ageLimitRaw",
  "postDetailsRaw",
  "selectionProcessRaw",
  "examPatternRaw",
  "documentsRequiredRaw",
  "eligibilityRaw",
];

export async function ResultDetailBody({ result }: { result: ResultItem }) {
  const t = (await getTranslations("detail")) as SectionTranslator;
  const tResults = await getTranslations("resultsPage");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const localePath = (path: string) => (locale === "en" ? path : `/${locale}${path}`);
  const sourceLinks = (result.importantLinks ?? []).filter((link) => !isSourceSiteUrl(link.url));
  const hasRealOfficialLink = !isSourceSiteUrl(result.officialLink);

  const additionalSections = result.additionalSections ?? [];
  const orderedSectionKeys = resolveSectionOrder(result.sectionOrder, RESULT_DEFAULT_ORDER, additionalSections.length);

  return (
    <div className="container-page py-8">
      <Breadcrumb
        items={[
          { label: tCommon("home"), href: localePath("/") },
          { label: tResults("breadcrumb"), href: localePath("/results") },
          { label: result.title },
        ]}
      />

      <Card padding="p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{result.category}</Badge>
          {result.tags?.map((tag) => (
            <Badge key={tag} tone="neutral">
              {tag}
            </Badge>
          ))}
        </div>
        <h1 className="font-display mt-3 text-2xl font-bold leading-tight text-[var(--color-text-primary)] md:text-3xl">
          {result.title}
        </h1>
        <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">{result.organization}</p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">{result.summary}</p>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="order-2 min-w-0 space-y-6 lg:order-1">
          {(() => {
            const sectionRenderers: Record<string, React.ReactNode> = {
              importantDatesRaw: (
                <Section title={t("importantDates")} icon={<Calendar size={16} />} accent="blue">
                  {result.importantDatesText ? (
                    <PipeTableOrText text={result.importantDatesText} />
                  ) : (
                    <KeyValueRow label={t("resultDeclared")} value={formatDate(result.resultDate)} />
                  )}
                </Section>
              ),
              howToApplyRaw:
                Array.isArray(result.howToCheck) && result.howToCheck.length > 0 ? (
                  <Section title={t("howToCheckResult")} icon={<ListChecks size={16} />} accent="green">
                    <StepList items={result.howToCheck} />
                  </Section>
                ) : null,
              cutoffText: result.cutoffText ? (
                <Section title={t("cutoffDetails")} icon={<FileText size={16} />} accent="purple">
                  <PipeTableOrText text={result.cutoffText} />
                </Section>
              ) : null,
              applicationFeeRaw: <ApplicationFeeSection fee={result.applicationFee} feeText={result.applicationFeeText} t={t} />,
              ageLimitRaw: (
                <AgeLimitSection
                  ageLimitByGrade={result.ageLimitByGrade}
                  ageRelaxationBreakdown={result.ageRelaxationBreakdown}
                  ageLimitText={result.ageLimitText}
                  t={t}
                />
              ),
              postDetailsRaw: (
                <VacancyDetailsSection
                  vacancyBreakdown={result.vacancyBreakdown}
                  postDetailsText={result.postDetailsText}
                  totalVacancies={result.totalVacancies}
                  t={t}
                />
              ),
              selectionProcessRaw: (
                <SelectionProcessSection
                  selectionProcess={result.selectionProcess}
                  selectionProcessText={result.selectionProcessText}
                  t={t}
                />
              ),
              examPatternRaw: (
                <ExamPatternSection examPattern={result.examPattern} examPatternNotes={result.examPatternNotes} t={t} />
              ),
              documentsRequiredRaw: <DocumentsRequiredSection documentsRequired={result.documentsRequired} t={t} />,
              eligibilityRaw: <EligibilitySection eligibilityText={result.eligibilityText} t={t} />,
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

          {Array.isArray(result.faqs) && result.faqs.length > 0 && (
            <Section title={t("faqs")} icon={<HelpCircle size={16} />} accent="pink">
              <div className="divide-y divide-[var(--color-border)]">
                {result.faqs.map((faq, i) => (
                  <div key={i} className={i === 0 ? "pb-4" : "py-4"}>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{faq.question}</p>
                    <p className="mt-1.5 border-l-2 border-[var(--color-accent-pink-tint)] pl-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {result.conclusion && (
            <Section title={t("conclusion")} icon={<CheckCircle2 size={16} />} accent="green">
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{result.conclusion}</p>
            </Section>
          )}
        </div>

        <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-24 lg:h-fit">
          <Card>
            <p className="mb-3 flex items-center gap-2 text-base font-bold text-[var(--color-text-primary)]">
              <Link2 size={17} /> {t("importantLinks")}
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
            ) : hasRealOfficialLink ? (
              <ButtonLink href={documentViewerHref(result.officialLink, t("viewOfficialResult"))} target="_blank" className="w-full">
                {t("viewOfficialResult")} <ExternalLink size={14} />
              </ButtonLink>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)]">
                {t("noOfficialLinkResult")}
              </p>
            )}
            <div className="mt-3">
              <SourceVerified sourceUrl={result.sourceUrl} />
            </div>
          </Card>

          <Card>
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
              {t("atAGlance")}
            </p>
            <div className="mt-3 space-y-2.5">
              <KeyValueRow label={t("organization")} value={result.organization} />
              <KeyValueRow label={t("category")} value={result.category} />
              <KeyValueRow label={t("resultDeclared")} value={formatDate(result.resultDate)} />
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
