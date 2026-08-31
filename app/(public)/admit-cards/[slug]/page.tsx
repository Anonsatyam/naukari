import type { Metadata } from "next";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { Calendar, ExternalLink, ClipboardList, FileText, HelpCircle, ListChecks, CheckCircle2 } from "lucide-react";
import { getAdmitCards, getAdmitCardBySlug } from "@/lib/server/data";
import { formatDate, isSourceSiteUrl } from "@/lib/utils";
import { resolveSectionOrder, parseGenericKey } from "@/lib/sectionOrder";
import { Section, StepList, PipeTableOrText } from "@/components/DetailSections";
import {
  ApplicationFeeSection,
  AgeLimitSection,
  VacancyDetailsSection,
  EligibilitySection,
  SelectionProcessSection,
} from "@/components/RichSections";

export const revalidate = 300;
import { ButtonLink } from "@/components/Button";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import { KeyValueRow } from "@/components/KeyValueRow";
import SourceVerified from "@/components/SourceVerified";

// The page's own fixed order — used verbatim for any record with no
// sectionOrder at all (published before this feature existed), and as
// the fallback tail for anything a record's own sectionOrder doesn't
// mention. "documentsRequiredRaw" renders as Exam Day Instructions here
// (see approveDraft's admit_card branch — that bucket is reused for
// exam-day essentials rather than a separate documentsRequired field).
// See lib/sectionOrder.ts's resolveSectionOrder.
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

export async function generateStaticParams() {
  try {
    const admitCards = await getAdmitCards();
    return admitCards.map((a) => ({ slug: a.slug }));
  } catch (err) {
    console.warn("generateStaticParams: could not fetch admit cards at build time, skipping pre-render.", err);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const card = await getAdmitCardBySlug(slug);
  if (!card) return {};
  return { title: card.title, description: `Admit card details for ${card.title}` };
}

export default async function AdmitCardDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const card = await getAdmitCardBySlug(slug);
  if (!card) notFound();

  // The source's own Important Links table already has its own
  // "Download Admit Card" (or equivalent) row — showing that verbatim
  // AND a separately-labeled "Download Admit Card" button synthesized
  // from officialLink duplicated the same destination under two
  // different names/positions, neither matching what biharjob.co.in
  // itself shows. Once the source publishes a real links list, that
  // list IS the sidebar — same labels, same set, same order — with no
  // synthesized button layered on top of it.
  const sourceLinks = (card.importantLinks ?? []).filter((link) => !isSourceSiteUrl(link.url));
  // The synthesized "Download Admit Card" button is now only a
  // fallback for the rarer case where extraction found no Important
  // Links list at all — still needed so a page never has literally
  // zero way to reach the admit card. See the job page's identical
  // comment on why officialLink itself can still be the source
  // article's own URL in the worst case (extraction found no external
  // link anywhere), which is hidden rather than shown as misleading.
  const hasRealOfficialLink = !isSourceSiteUrl(card.officialLink);

  const additionalSections = card.additionalSections ?? [];
  const orderedSectionKeys = resolveSectionOrder(card.sectionOrder, ADMIT_CARD_DEFAULT_ORDER, additionalSections.length);

  return (
    <div className="container-page py-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Admit Cards", href: "/admit-cards" },
          { label: card.title },
        ]}
      />

      <Card padding="p-6">
        <Badge tone="primary">{card.category}</Badge>
        <h1 className="font-display mt-3 text-2xl font-bold leading-tight text-[var(--color-text-primary)] md:text-3xl">
          {card.title}
        </h1>
        <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">{card.organization}</p>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main content */}
        <div className="order-2 min-w-0 space-y-6 lg:order-1">
          {(() => {
            // Every "regular" section, keyed by the same raw field name
            // extraction records in sectionOrder — rendered by walking
            // orderedSectionKeys (the source's own order, with a fixed
            // fallback tail) instead of this fixed list's own order.
            // FAQs/Conclusion are deliberately NOT here — always pinned
            // to the very end below, regardless of source order.
            const sectionRenderers: Record<string, React.ReactNode> = {
              importantDatesRaw: (
                <Section title="Important Dates" icon={<Calendar size={16} />} accent="blue">
                  {card.importantDatesText ? (
                    <PipeTableOrText text={card.importantDatesText} />
                  ) : (
                    <div className="space-y-2.5">
                      <KeyValueRow label="Admit Card Released" value={formatDate(card.releaseDate)} />
                      <KeyValueRow label="Exam Date" value={formatDate(card.examDate)} />
                    </div>
                  )}
                </Section>
              ),
              howToApplyRaw: (
                <Section title="How to Download Admit Card" icon={<ListChecks size={16} />} accent="green">
                  <StepList
                    items={card.howToDownload ?? []}
                    fallback="Visit the download link below and follow the on-page instructions."
                  />
                </Section>
              ),
              documentsRequiredRaw: card.examDayInstructionsText ? (
                <Section title="Exam Day Instructions" icon={<FileText size={16} />} accent="orange">
                  <PipeTableOrText text={card.examDayInstructionsText} />
                </Section>
              ) : null,
              examPatternRaw: card.examPattern ? (
                <Section title="Exam Pattern" icon={<ClipboardList size={16} />} accent="amber">
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
              // Same sections a Job page shows — a source frequently
              // bundles a full recruitment notification (fee, age limit,
              // vacancy, selection process) into what's nominally an
              // "Admit Card" page; these self-hide when this particular
              // admit card genuinely has none of it.
              applicationFeeRaw: <ApplicationFeeSection fee={card.applicationFee} feeText={card.applicationFeeText} />,
              ageLimitRaw: (
                <AgeLimitSection
                  ageLimitByGrade={card.ageLimitByGrade}
                  ageRelaxationBreakdown={card.ageRelaxationBreakdown}
                  ageLimitText={card.ageLimitText}
                />
              ),
              postDetailsRaw: (
                <VacancyDetailsSection
                  vacancyBreakdown={card.vacancyBreakdown}
                  postDetailsText={card.postDetailsText}
                  totalVacancies={card.totalVacancies}
                />
              ),
              selectionProcessRaw: (
                <SelectionProcessSection
                  selectionProcess={card.selectionProcess}
                  selectionProcessText={card.selectionProcessText}
                />
              ),
              eligibilityRaw: <EligibilitySection eligibilityText={card.eligibilityText} />,
            };

            return orderedSectionKeys.map((key) => {
              const genericIdx = parseGenericKey(key);
              if (genericIdx !== null) {
                // Every source section that doesn't map to one of the
                // specific ones above — rendered generically, titled
                // with the source's own heading text, interleaved at
                // exactly the position the source itself used, rather
                // than always lumped together at one fixed spot.
                const section = additionalSections[genericIdx];
                if (!section) return null;
                return (
                  <Section key={key} title={section.heading} icon={<FileText size={16} />} accent="neutral">
                    <PipeTableOrText text={section.content} />
                  </Section>
                );
              }
              return <Fragment key={key}>{sectionRenderers[key] ?? null}</Fragment>;
            });
          })()}

          {Array.isArray(card.faqs) && card.faqs.length > 0 && (
            <Section title="FAQs" icon={<HelpCircle size={16} />} accent="pink">
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
            <Section title="Conclusion" icon={<CheckCircle2 size={16} />} accent="green">
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{card.conclusion}</p>
            </Section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-24 lg:h-fit">
          <Card>
            {sourceLinks.length > 0 ? (
              sourceLinks.map((link, i) => (
                <ButtonLink
                  key={`${link.label}-${i}`}
                  href={link.url}
                  target="_blank"
                  variant="secondary"
                  className={i === 0 ? "w-full" : "mt-2 w-full"}
                >
                  {link.label} <ExternalLink size={14} />
                </ButtonLink>
              ))
            ) : hasRealOfficialLink ? (
              <ButtonLink href={card.officialLink} target="_blank" className="w-full">
                Download Admit Card <ExternalLink size={14} />
              </ButtonLink>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)]">
                No official link could be found for this admit card yet — check the source notification for details.
              </p>
            )}
            <div className="mt-3">
              <SourceVerified sourceUrl={card.sourceUrl} />
            </div>
          </Card>

          <Card>
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
              At a glance
            </p>
            <div className="mt-3 space-y-2.5">
              <KeyValueRow label="Organization" value={card.organization} />
              <KeyValueRow label="Category" value={card.category} />
              <KeyValueRow label="Exam Date" value={formatDate(card.examDate)} />
              <KeyValueRow label="Released" value={formatDate(card.releaseDate)} />
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
