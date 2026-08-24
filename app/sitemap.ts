import type { MetadataRoute } from "next";
import { jobs, results, admitCards } from "@/lib/mock-data";

const BASE_URL = "https://www.biharsarkarinaukri.example";

export default function sitemap(): MetadataRoute.Sitemap {
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
