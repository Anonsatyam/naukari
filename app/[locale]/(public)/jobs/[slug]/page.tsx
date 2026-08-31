import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedJobs, getPublishedJobBySlug, getRelatedJobs } from "@/lib/server/data";
import { JobDetailBody } from "@/components/detail/JobDetailBody";

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const jobs = await getPublishedJobs();
    return jobs.map((job) => ({ slug: job.slug }));
  } catch (err) {
    console.warn("generateStaticParams: could not fetch jobs at build time, skipping pre-render.", err);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = await getPublishedJobBySlug(slug);
  if (!job) return {};
  return {
    title: job.title,
    description: `${job.title} — ${job.totalVacancies || "Multiple"} vacancies at ${job.organization}. Qualification: ${job.qualification}. Check dates, fees and how to apply.`,
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const job = await getPublishedJobBySlug(slug);
  if (!job) notFound();

  const relatedJobs = await getRelatedJobs(job, 3);

  return <JobDetailBody job={job} relatedJobs={relatedJobs} />;
}
