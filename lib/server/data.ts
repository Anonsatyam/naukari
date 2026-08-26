import { getStore } from "./store";
import { Job, ResultItem, AdmitCardItem, BotDraft, BotLogEntry } from "@/lib/types";

// ---- Shared helpers (now date-based on real "today", not the fixed mock date) ----

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

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || `job-${Date.now()}`;
}

// ---- Public reads (published only) ----

export interface JobFilters {
  q?: string;
  category?: string[];
  department?: string[];
  qualification?: string[];
}

export function getPublishedJobs(filters: JobFilters = {}): Job[] {
  const { jobs } = getStore();
  return jobs.filter((job) => {
    if (job.status !== "published") return false;

    if (filters.q) {
      const q = filters.q.toLowerCase();
      const matches =
        job.title.toLowerCase().includes(q) ||
        job.organization.toLowerCase().includes(q) ||
        job.department.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (filters.category?.length && !filters.category.includes(job.category)) return false;
    if (filters.department?.length && !filters.department.includes(job.department)) return false;
    if (filters.qualification?.length && !filters.qualification.includes(job.qualification))
      return false;

    return true;
  });
}

export function getPublishedJobBySlug(slug: string): Job | undefined {
  const { jobs } = getStore();
  return jobs.find((j) => j.slug === slug && j.status === "published");
}

export function getRelatedJobs(job: Job, limit: number = 3): Job[] {
  const { jobs } = getStore();
  const published = jobs.filter((j) => j.id !== job.id && j.status === "published");
  const sameCategory = published.filter((j) => j.category === job.category);
  if (sameCategory.length >= limit) return sameCategory.slice(0, limit);
  const sameDepartment = published.filter(
    (j) => j.department === job.department && !sameCategory.includes(j)
  );
  const combined = [...sameCategory, ...sameDepartment];
  if (combined.length >= limit) return combined.slice(0, limit);
  const rest = published.filter((j) => !combined.includes(j));
  return [...combined, ...rest].slice(0, limit);
}

export function getResults(q?: string): ResultItem[] {
  const { results } = getStore();
  if (!q) return results;
  const query = q.toLowerCase();
  return results.filter(
    (r) =>
      r.title.toLowerCase().includes(query) ||
      r.organization.toLowerCase().includes(query) ||
      r.category.toLowerCase().includes(query)
  );
}

export function getResultBySlug(slug: string): ResultItem | undefined {
  const { results } = getStore();
  return results.find((r) => r.slug === slug);
}

export function getAdmitCards(q?: string): AdmitCardItem[] {
  const { admitCards } = getStore();
  if (!q) return admitCards;
  const query = q.toLowerCase();
  return admitCards.filter(
    (a) =>
      a.title.toLowerCase().includes(query) ||
      a.organization.toLowerCase().includes(query) ||
      a.category.toLowerCase().includes(query)
  );
}

export function getAdmitCardBySlug(slug: string): AdmitCardItem | undefined {
  const { admitCards } = getStore();
  return admitCards.find((a) => a.slug === slug);
}

// ---- Admin reads (all statuses) ----

export function getAllJobsAdmin(): Job[] {
  return getStore().jobs;
}

export function getJobByIdAdmin(id: string): Job | undefined {
  return getStore().jobs.find((j) => j.id === id);
}

export function setJobStatus(id: string, status: Job["status"]): Job | undefined {
  const job = getStore().jobs.find((j) => j.id === id);
  if (!job) return undefined;
  job.status = status;
  job.updatedAt = new Date().toISOString();
  return job;
}

export function getPendingDrafts(): BotDraft[] {
  return getStore().drafts.filter((d) => d.status === "pending");
}

export function getAllDrafts(): BotDraft[] {
  return getStore().drafts;
}

export function getDraftById(id: string): BotDraft | undefined {
  return getStore().drafts.find((d) => d.id === id);
}

export function rejectDraft(id: string): BotDraft | undefined {
  const draft = getStore().drafts.find((d) => d.id === id);
  if (!draft) return undefined;
  draft.status = "rejected";
  return draft;
}

/**
 * Approves a draft: merges the bot-extracted fields with whatever the
 * admin edited, fills in sensible defaults for anything still missing
 * (the current draft-review UI only edits a handful of core fields —
 * expanding it into a full structured editor is good follow-up work),
 * and publishes the result as a live Job.
 */
export function approveDraft(id: string, edits: Partial<Job>): Job | undefined {
  const store = getStore();
  const draft = store.drafts.find((d) => d.id === id);
  if (!draft) return undefined;

  const merged: Partial<Job> = { ...draft.extractedFields, ...edits };
  const title = merged.title ?? draft.jobTitle;
  const now = new Date().toISOString();

  const job: Job = {
    id: `job-${Date.now()}`,
    slug: slugify(title),
    state: merged.state ?? "Bihar",
    title,
    shortInfo: merged.shortInfo ?? `${title} — details from the official notification.`,
    organization: merged.organization ?? draft.organization,
    department: merged.department ?? draft.organization,
    category: merged.category ?? "Administrative",
    totalVacancies: merged.totalVacancies ?? 0,
    vacancyBreakdown: merged.vacancyBreakdown,
    qualification: merged.qualification ?? "As per notification",
    minAge: merged.minAge ?? 18,
    maxAge: merged.maxAge ?? 40,
    ageRelaxation: merged.ageRelaxation,
    ageRelaxationBreakdown: merged.ageRelaxationBreakdown,
    salaryMin: merged.salaryMin ?? 0,
    salaryMax: merged.salaryMax ?? 0,
    applicationFee: merged.applicationFee ?? { general: 0, reserved: 0, note: "See official notification" },
    selectionProcess: merged.selectionProcess ?? ["As per official notification"],
    examPattern: merged.examPattern,
    syllabusSummary: merged.syllabusSummary,
    howToApply: merged.howToApply ?? ["See the official notification for the application procedure"],
    officialNotificationUrl: merged.officialNotificationUrl ?? draft.sourceUrl,
    officialApplyUrl: merged.officialApplyUrl ?? draft.sourceUrl,
    sourceUrl: draft.sourceUrl,
    importantLinks: merged.importantLinks,
    importantDates: merged.importantDates ?? [],
    eligibilityRules: merged.eligibilityRules ?? [],
    status: "published",
    createdByBot: true,
    publishedAt: now,
    updatedAt: now,
  };

  store.jobs.push(job);
  draft.status = "approved";
  return job;
}

// ---- Bot ingestion ----

export function draftExistsForSource(sourceUrl: string): boolean {
  const { drafts, jobs } = getStore();
  return (
    drafts.some((d) => d.sourceUrl === sourceUrl) || jobs.some((j) => j.sourceUrl === sourceUrl)
  );
}

export function createDraft(input: {
  jobTitle: string;
  organization: string;
  sourceUrl: string;
  confidence: BotDraft["confidence"];
  extractedFields: Partial<Job>;
}): BotDraft {
  const draft: BotDraft = {
    id: `draft-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    jobTitle: input.jobTitle,
    organization: input.organization,
    sourceUrl: input.sourceUrl,
    detectedAt: new Date().toISOString(),
    status: "pending",
    confidence: input.confidence,
    extractedFields: input.extractedFields,
  };
  getStore().drafts.push(draft);
  return draft;
}

// ---- Bot activity log ----

export function addBotLogEntry(status: BotLogEntry["status"], message: string): BotLogEntry {
  const entry: BotLogEntry = {
    id: `log-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    status,
    message,
  };
  getStore().botLog.unshift(entry);
  // keep the log from growing unbounded in a long-running dev process
  getStore().botLog.splice(200);
  return entry;
}

export function getBotLog(limit: number = 10): BotLogEntry[] {
  return getStore().botLog.slice(0, limit);
}

// ---- Dashboard stats ----

export function getAdminStats() {
  const { jobs, drafts } = getStore();
  return {
    pendingDrafts: drafts.filter((d) => d.status === "pending").length,
    publishedJobs: jobs.filter((j) => j.status === "published").length,
    totalDrafts: drafts.length,
  };
}
