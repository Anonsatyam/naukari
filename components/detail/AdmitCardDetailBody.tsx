import { Fragment } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Calendar, ExternalLink, ClipboardList, FileText, ListChecks } from "lucide-react";
import { AdmitCardItem } from "@/lib/types";
import { formatDate, isSourceSiteUrl, documentViewerHref } from "@/lib/utils";
import { resolveSectionOrder, parseGenericKey } from "@/lib/sectionOrder";
import { Section, StepList, PipeTableOrText, GenericSection } from "@/components/DetailSections";
import { ImportantLinksCard, AtAGlanceCard } from "@/components/detail/DetailSidebar";
import {
  ApplicationFeeSection,
  AgeLimitSection,
  VacancyDetailsSection,
  EligibilitySection,
  SelectionProcessSection,
  FaqsSection,
  ConclusionSection,
  SectionTranslator,
} from "@/components/RichSections";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import { KeyValueRow } from "@/components/KeyValueRow";

const ADMIT_CARD_DEFAULT_ORDER = [
  "importantDatesRaw",
  "howToApplyRaw",
  "documentsRequiredRaw",
  "examPatternRaw",
  "applicationFeeRaw",
  "ageLimitRaw",
  "postDetailsRaw",
  "selectionProcessRaw",
  "eligibilityRaw",
];

export async function AdmitCardDetailBody({ card }: { card: AdmitCardItem }) {
  const t = (await getTranslations("detail")) as SectionTranslator;
  const tAdmitCards = await getTranslations("admitCardsPage");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const localePath = (path: string) => (locale === "en" ? path : `/${locale}${path}`);
  const sourceLinks = (card.importantLinks ?? []).filter((link) => !isSourceSiteUrl(link.url));
  const hasRealOfficialLink = !isSourceSiteUrl(card.officialLink);

  const additionalSections = card.additionalSections ?? [];
  const orderedSectionKeys = resolveSectionOrder(card.sectionOrder, ADMIT_CARD_DEFAULT_ORDER, additionalSections.length);

  return (
    <div className="container-page py-8">
      <Breadcrumb
        items={[
          { label: tCommon("home"), href: localePath("/") },
          { label: tAdmitCards("breadcrumb"), href: localePath("/admit-cards") },
          { label: card.title },
        ]}
      />

      <Card padding="p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{card.category}</Badge>
          {card.tags?.map((tag) => (
            <Badge key={tag} tone="neutral">
              {tag}
            </Badge>
          ))}
        </div>
        <h1 className="font-display mt-3 text-2xl font-bold leading-tight text-[var(--color-text-primary)] md:text-3xl">
          {card.title}
        </h1>
        <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">{card.organization}</p>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="order-2 min-w-0 space-y-6 lg:order-1">
          {(() => {
            const sectionRenderers: Record<string, React.ReactNode> = {
              importantDatesRaw: (
                <Section title={t("importantDates")} icon={<Calendar size={16} />} accent="blue">
                  {card.importantDatesText ? (
                    <PipeTableOrText text={card.importantDatesText} />
                  ) : (
                    <div className="space-y-2.5">
                      <KeyValueRow label={t("admitCardReleased")} value={formatDate(card.releaseDate)} />
                      <KeyValueRow label={t("examDate")} value={formatDate(card.examDate)} />
                    </div>
                  )}
                </Section>
              ),
              howToApplyRaw:
                Array.isArray(card.howToDownload) && card.howToDownload.length > 0 ? (
                  <Section title={t("howToDownloadAdmitCard")} icon={<ListChecks size={16} />} accent="green">
                    <StepList items={card.howToDownload} />
                  </Section>
                ) : null,
              documentsRequiredRaw: card.examDayInstructionsText ? (
                <Section title={t("examDayInstructions")} icon={<FileText size={16} />} accent="orange">
                  <PipeTableOrText text={card.examDayInstructionsText} />
                </Section>
              ) : null,
              examPatternRaw: card.examPattern ? (
                <Section title={t("examPattern")} icon={<ClipboardList size={16} />} accent="amber">
                  <PipeTableOrText text={card.examPattern} />
                  {Array.isArray(card.examPatternNotes) && card.examPatternNotes.length > 0 && (
                    <ul className="mt-4 space-y-1.5 border-t border-[var(--color-border)] pt-4">
                      {card.examPatternNotes.map((note, i) => (
                        <li key={i} className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
                          • {note}
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              ) : null,
              applicationFeeRaw: <ApplicationFeeSection fee={card.applicationFee} feeText={card.applicationFeeText} t={t} />,
              ageLimitRaw: (
                <AgeLimitSection
                  ageLimitByGrade={card.ageLimitByGrade}
                  ageRelaxationBreakdown={card.ageRelaxationBreakdown}
                  ageLimitText={card.ageLimitText}
                  t={t}
                />
              ),
              postDetailsRaw: (
                <VacancyDetailsSection
                  vacancyBreakdown={card.vacancyBreakdown}
                  postDetailsText={card.postDetailsText}
                  totalVacancies={card.totalVacancies}
                  t={t}
                />
              ),
              selectionProcessRaw: (
                <SelectionProcessSection
                  selectionProcess={card.selectionProcess}
                  selectionProcessText={card.selectionProcessText}
                  t={t}
                />
              ),
              eligibilityRaw: <EligibilitySection eligibilityText={card.eligibilityText} t={t} />,
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

          <FaqsSection faqs={card.faqs} t={t} />
          <ConclusionSection conclusion={card.conclusion} t={t} />
        </div>

        <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-24 lg:h-fit">
          <ImportantLinksCard
            title={t("importantLinks")}
            sourceLinks={sourceLinks}
            noLinkMessage={t("noOfficialLinkAdmitCard")}
            sourceUrl={card.sourceUrl}
            officialButtons={
              hasRealOfficialLink
                ? [
                    {
                      href: documentViewerHref(card.officialLink, t("downloadAdmitCard")),
                      label: t("downloadAdmitCard"),
                      trailingIcon: <ExternalLink size={14} />,
                    },
                  ]
                : []
            }
          />

          <AtAGlanceCard
            title={t("atAGlance")}
            rows={[
              { label: t("organization"), value: card.organization },
              { label: t("category"), value: card.category },
              { label: t("examDate"), value: formatDate(card.examDate) },
              { label: t("released"), value: formatDate(card.releaseDate) },
            ]}
          />
        </aside>
      </div>
    </div>
  );
}
