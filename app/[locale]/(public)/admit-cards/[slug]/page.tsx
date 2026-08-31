import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdmitCards, getAdmitCardBySlug } from "@/lib/server/data";
import { AdmitCardDetailBody } from "@/components/detail/AdmitCardDetailBody";

export const revalidate = 300;

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

  return <AdmitCardDetailBody card={card} />;
}
