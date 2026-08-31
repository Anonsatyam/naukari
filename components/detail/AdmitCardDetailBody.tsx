import { Fragment } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Calendar, ExternalLink, ClipboardList, FileText, HelpCircle, Link2, ListChecks, CheckCircle2 } from "lucide-react";
import { AdmitCardItem } from "@/lib/types";
import { formatDate, isSourceSiteUrl, documentViewerHref } from "@/lib/utils";
import { resolveSectionOrder, parseGenericKey } from "@/lib/sectionOrder";
import { Section, StepList, PipeTableOrText, GenericSection } from "@/components/DetailSections";
import {
  ApplicationFeeSection,
  AgeLimitSection,
  VacancyDetailsSection,
  EligibilitySection,
  SelectionProcessSection,
  SectionTranslator,
} from "@/components/RichSections";
import { ButtonLink } from "@/components/Button";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import { KeyValueRow } from "@/components/KeyValueRow";
import SourceVerified from "@/components/SourceVerified";

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

          {Array.isArray(card.faqs) && card.faqs.length > 0 && (
            <Section title={t("faqs")} icon={<HelpCircle size={16} />} accent="pink">
              <div className="divide-y divide-[var(--color-border)]">
                {card.faqs.map((faq, i) => (
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

          {card.conclusion && (
            <Section title={t("conclusion")} icon={<CheckCircle2 size={16} />} accent="green">
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{card.conclusion}</p>
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
              <ButtonLink href={documentViewerHref(card.officialLink, t("downloadAdmitCard"))} target="_blank" className="w-full">
                {t("downloadAdmitCard")} <ExternalLink size={14} />
              </ButtonLink>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)]">
                {t("noOfficialLinkAdmitCard")}
              </p>
            )}
            <div className="mt-3">
              <SourceVerified sourceUrl={card.sourceUrl} />
            </div>
          </Card>

          <Card>
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
              {t("atAGlance")}
            </p>
            <div className="mt-3 space-y-2.5">
              <KeyValueRow label={t("organization")} value={card.organization} />
              <KeyValueRow label={t("category")} value={card.category} />
              <KeyValueRow label={t("examDate")} value={formatDate(card.examDate)} />
              <KeyValueRow label={t("released")} value={formatDate(card.releaseDate)} />
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
