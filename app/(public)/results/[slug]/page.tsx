import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Calendar, ExternalLink, FileText, HelpCircle, ListChecks, CheckCircle2 } from "lucide-react";
import { getResults, getResultBySlug } from "@/lib/server/data";
import { formatDate } from "@/lib/utils";
import { Section, StepList, PipeTableOrText } from "@/components/DetailSections";
import {
  ApplicationFeeSection,
  AgeLimitSection,
  VacancyDetailsSection,
  EligibilitySection,
  SelectionProcessSection,
  ExamPatternSection,
  DocumentsRequiredSection,
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
    const results = await getResults();
    return results.map((r) => ({ slug: r.slug }));
  } catch (err) {
    console.warn("generateStaticParams: could not fetch results at build time, skipping pre-render.", err);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getResultBySlug(slug);
  if (!result) return {};
  return { title: result.title, description: result.summary };
}

export default async function ResultDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getResultBySlug(slug);
  if (!result) notFound();

  // Same dedup reasoning as the job page's sidebar: don't show an
  // importantLinks entry that's just the same URL as the primary
  // "View Official Result" button again as a second button.
  const otherImportantLinks = (result.importantLinks ?? []).filter((link) => link.url !== result.officialLink);

  return (
    <div className="container-page py-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Results", href: "/results" },
          { label: result.title },
        ]}
      />

      <Card padding="p-6">
        <Badge tone="primary">{result.category}</Badge>
        <h1 className="font-display mt-3 text-2xl font-bold leading-tight text-[var(--color-text-primary)] md:text-3xl">
          {result.title}
        </h1>
        <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">{result.organization}</p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">{result.summary}</p>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main content */}
        <div className="order-2 min-w-0 space-y-6 lg:order-1">
          <Section title="Important Dates" icon={<Calendar size={16} />} accent="blue">
            {result.importantDatesText ? (
              <PipeTableOrText text={result.importantDatesText} />
            ) : (
              <KeyValueRow label="Result Declared" value={formatDate(result.resultDate)} />
            )}
          </Section>

          <Section title="How to Check Result" icon={<ListChecks size={16} />} accent="green">
            <StepList
              items={result.howToCheck ?? []}
              fallback="Visit the official result link below and follow the on-page instructions."
            />
          </Section>

          {result.cutoffText && (
            <Section title="Cut Off / Merit Details" icon={<FileText size={16} />} accent="purple">
              <PipeTableOrText text={result.cutoffText} />
            </Section>
          )}

          {/* Same sections a Job page shows — a source frequently
              bundles a full recruitment notification (fee, age limit,
              vacancy, selection process, exam pattern, documents) into
              what's nominally a "Result" page; these self-hide when
              this particular result genuinely has none of it. */}
          <ApplicationFeeSection fee={result.applicationFee} feeText={result.applicationFeeText} />
          <AgeLimitSection
            ageLimitByGrade={result.ageLimitByGrade}
            ageRelaxationBreakdown={result.ageRelaxationBreakdown}
            ageLimitText={result.ageLimitText}
          />
          <VacancyDetailsSection
            vacancyBreakdown={result.vacancyBreakdown}
            postDetailsText={result.postDetailsText}
            totalVacancies={result.totalVacancies}
          />
          <SelectionProcessSection
            selectionProcess={result.selectionProcess}
            selectionProcessText={result.selectionProcessText}
          />
          <ExamPatternSection examPattern={result.examPattern} examPatternNotes={result.examPatternNotes} />
          <DocumentsRequiredSection documentsRequired={result.documentsRequired} />
          <EligibilitySection eligibilityText={result.eligibilityText} />

          {Array.isArray(result.faqs) && result.faqs.length > 0 && (
            <Section title="FAQs" icon={<HelpCircle size={16} />} accent="pink">
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

          {/* Every source section that doesn't map to one of the specific
              ones above — rendered generically, titled with the source's
              own heading text, instead of being dropped for not matching
              a hardcoded field. */}
          {result.additionalSections?.map((section, i) => (
            <Section key={i} title={section.heading} icon={<FileText size={16} />} accent="neutral">
              <PipeTableOrText text={section.content} />
            </Section>
          ))}

          {result.conclusion && (
            <Section title="Conclusion" icon={<CheckCircle2 size={16} />} accent="green">
              <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{result.conclusion}</p>
            </Section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-24 lg:h-fit">
          <Card>
            <ButtonLink href={result.officialLink} target="_blank" className="w-full">
              View Official Result <ExternalLink size={14} />
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
              <SourceVerified sourceUrl={result.sourceUrl} />
            </div>
          </Card>

          <Card>
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
              At a glance
            </p>
            <div className="mt-3 space-y-2.5">
              <KeyValueRow label="Organization" value={result.organization} />
              <KeyValueRow label="Category" value={result.category} />
              <KeyValueRow label="Result Declared" value={formatDate(result.resultDate)} />
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
