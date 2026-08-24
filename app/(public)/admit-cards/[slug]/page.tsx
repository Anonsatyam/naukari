import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { admitCards, getAdmitCardBySlug } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import { ButtonLink } from "@/components/Button";
import Badge from "@/components/Badge";
import Card from "@/components/Card";
import Breadcrumb from "@/components/Breadcrumb";
import { KeyValueRow } from "@/components/KeyValueRow";
import SourceVerified from "@/components/SourceVerified";

export function generateStaticParams() {
  return admitCards.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const card = getAdmitCardBySlug(slug);
  if (!card) return {};
  return { title: card.title, description: `Admit card details for ${card.title}` };
}

export default async function AdmitCardDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const card = getAdmitCardBySlug(slug);
  if (!card) notFound();

  return (
    <div className="container-page py-8">
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Admit Cards", href: "/admit-cards" },
          { label: card.title },
        ]}
      />

      <Card padding="p-6" className="max-w-2xl">
        <Badge tone="primary">{card.category}</Badge>
        <h1 className="font-display mt-3 text-2xl font-bold text-[var(--color-text-primary)]">
          {card.title}
        </h1>
        <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">{card.organization}</p>

        <div className="mt-5 space-y-2.5 border-t border-[var(--color-border)] pt-5">
          <KeyValueRow label="Admit Card Released" value={formatDate(card.releaseDate)} />
          <KeyValueRow label="Exam Date" value={formatDate(card.examDate)} />
        </div>

        <ButtonLink href={card.officialLink} target="_blank" className="mt-6 w-full sm:w-auto">
          Download Admit Card <ExternalLink size={14} />
        </ButtonLink>
        <div className="mt-3">
          <SourceVerified sourceUrl={card.sourceUrl} />
        </div>
      </Card>
    </div>
  );
}
