import { Job } from "./types";

// Generic "was this posted/declared/released recently" check, reused for the
// "New" badge on jobs, results and admit cards alike instead of one-off logic per type.
export function isRecent(dateIso: string, withinDays: number = 5): boolean {
  const date = new Date(dateIso).getTime();
  const now = Date.now();
  const diffDays = (now - date) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= withinDays;
}

export function getApplicationEndDate(job: Job): string | undefined {
  return job.importantDates.find((d) => d.label === "Application End")?.date;
}

export function isClosingSoon(job: Job): boolean {
  const endDate = getApplicationEndDate(job);
  if (!endDate) return false;
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const diffDays = (end - now) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 7;
}
