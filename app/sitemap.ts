import type { MetadataRoute } from "next";
import { getPublishedJobs, getResults, getAdmitCards } from "@/lib/server/data";

const BASE_URL = "https://www.biharsarkarinaukri.example";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/jobs",
    "/closing-soon",
    "/results",
    "/admit-cards",
    "/eligibility-checker",
    "/about",
  ].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
  }));

  // If the database is briefly unreachable while the sitemap is being
  // generated, fall back to just the static routes rather than failing
  // the whole request.
  let jobs: Awaited<ReturnType<typeof getPublishedJobs>> = [];
  let results: Awaited<ReturnType<typeof getResults>> = [];
  let admitCards: Awaited<ReturnType<typeof getAdmitCards>> = [];
  try {
    [jobs, results, admitCards] = await Promise.all([getPublishedJobs(), getResults(), getAdmitCards()]);
  } catch (err) {
    console.warn("sitemap: could not fetch data, returning static routes only.", err);
  }

  const jobRoutes = jobs.map((job) => ({
    url: `${BASE_URL}/jobs/${job.slug}`,
    lastModified: new Date(job.updatedAt),
  }));

  const resultRoutes = results.map((r) => ({
    url: `${BASE_URL}/results/${r.slug}`,
    lastModified: new Date(r.resultDate),
  }));

  const admitCardRoutes = admitCards.map((a) => ({
    url: `${BASE_URL}/admit-cards/${a.slug}`,
    lastModified: new Date(a.releaseDate),
  }));

  return [...staticRoutes, ...jobRoutes, ...resultRoutes, ...admitCardRoutes];
}
