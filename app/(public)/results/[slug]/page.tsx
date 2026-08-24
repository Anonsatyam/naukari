import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { results, getResultBySlug } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { ButtonLink } from "@/components/Button";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import { KeyValueRow } from "@/components/KeyValueRow";
import SourceVerified from "@/components/SourceVerified";

export function generateStaticParams() {
  return results.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = getResultBySlug(slug);
  if (!result) return {};
  return { title: result.title, description: result.summary };
}

export default async function ResultDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = getResultBySlug(slug);
  if (!result) notFound();

  return (
    <div className="container-page py-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Results", href: "/results" },
          { label: result.title },
        ]}
      />

      <Card padding="p-6" className="max-w-2xl">
        <Badge tone="primary">{result.category}</Badge>
        <h1 className="font-display mt-3 text-2xl font-bold text-[var(--color-text-primary)]">
          {result.title}
        </h1>
        <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">{result.organization}</p>
        <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-secondary)]">{result.summary}</p>

        <div className="mt-5 space-y-2.5 border-t border-[var(--color-border)] pt-5">
          <KeyValueRow label="Result Declared" value={formatDate(result.resultDate)} />
        </div>

        <ButtonLink href={result.officialLink} target="_blank" className="mt-6 w-full sm:w-auto">
          View Official Result <ExternalLink size={14} />
        </ButtonLink>
        <div className="mt-3">
          <SourceVerified sourceUrl={result.sourceUrl} />
        </div>
      </Card>
    </div>
  );
}
