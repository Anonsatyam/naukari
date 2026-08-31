import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getResults, getResultBySlug } from "@/lib/server/data";
import { ResultDetailBody } from "@/components/detail/ResultDetailBody";

export const revalidate = 300;

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

  return <ResultDetailBody result={result} />;
}
