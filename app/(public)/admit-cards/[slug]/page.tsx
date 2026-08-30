import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Calendar, ExternalLink, ClipboardList, FileText, HelpCircle, ListChecks, CheckCircle2 } from "lucide-react";
import { getAdmitCards, getAdmitCardBySlug } from "@/lib/server/data";
import { formatDate, isSourceSiteUrl } from "@/lib/utils";
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

  // Same dedup reasoning as the job page's sidebar: don't show an
  // importantLinks entry that's just the same URL as the primary
  // "Download Admit Card" button again as a second button.
  const otherImportantLinks = (card.importantLinks ?? []).filter(
    (link) => link.url !== card.officialLink && !isSourceSiteUrl(link.url)
  );
  // See the job page's identical comment — extraction can fail to find
  // a genuine external link, in which case this falls back to the
  // source article's own URL; hidden rather than shown as a misleading
  // "Download Admit Card" button in that last-resort case.
  const hasRealOfficialLink = !isSourceSiteUrl(card.officialLink);

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

          <Section title="How to Download Admit Card" icon={<ListChecks size={16} />} accent="green">
            <StepList
              items={card.howToDownload ?? []}
              fallback="Visit the download link below and follow the on-page instructions."
            />
          </Section>

          {card.examDayInstructionsText && (
            <Section title="Exam Day Instructions" icon={<FileText size={16} />} accent="orange">
              <PipeTableOrText text={card.examDayInstructionsText} />
            </Section>
          )}

          {card.examPattern && (
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
          )}

          {/* Same sections a Job page shows — a source frequently
              bundles a full recruitment notification (fee, age limit,
              vacancy, selection process) into what's nominally an
              "Admit Card" page; these self-hide when this particular
              admit card genuinely has none of it. */}
          <ApplicationFeeSection fee={card.applicationFee} feeText={card.applicationFeeText} />
          <AgeLimitSection
            ageLimitByGrade={card.ageLimitByGrade}
            ageRelaxationBreakdown={card.ageRelaxationBreakdown}
            ageLimitText={card.ageLimitText}
          />
          <VacancyDetailsSection
            vacancyBreakdown={card.vacancyBreakdown}
            postDetailsText={card.postDetailsText}
            totalVacancies={card.totalVacancies}
          />
          <SelectionProcessSection
            selectionProcess={card.selectionProcess}
            selectionProcessText={card.selectionProcessText}
          />
          <EligibilitySection eligibilityText={card.eligibilityText} />

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

          {/* Every source section that doesn't map to one of the specific
              ones above — rendered generically, titled with the source's
              own heading text, instead of being dropped for not matching
              a hardcoded field. */}
          {card.additionalSections?.map((section, i) => (
            <Section key={i} title={section.heading} icon={<FileText size={16} />} accent="neutral">
              <PipeTableOrText text={section.content} />
            </Section>
          ))}

          {card.conclusion && (
            <Section title="Conclusion" icon={<CheckCircle2 size={16} />} accent="green">
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{card.conclusion}</p>
            </Section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-24 lg:h-fit">
          <Card>
            {hasRealOfficialLink && (
              <ButtonLink href={card.officialLink} target="_blank" className="w-full">
                Download Admit Card <ExternalLink size={14} />
              </ButtonLink>
            )}
            {otherImportantLinks.map((link, i) => (
              <ButtonLink
                key={link.label}
                href={link.url}
                target="_blank"
                variant="secondary"
                className={i === 0 && !hasRealOfficialLink ? "w-full" : "mt-2 w-full"}
              >
                {link.label} <ExternalLink size={14} />
              </ButtonLink>
            ))}
            {!hasRealOfficialLink && otherImportantLinks.length === 0 && (
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
