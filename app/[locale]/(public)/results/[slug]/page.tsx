import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getResultBySlug } from "@/lib/server/data";
import { ResultDetailBody } from "@/components/detail/ResultDetailBody";

export const dynamic = "force-dynamic";

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
