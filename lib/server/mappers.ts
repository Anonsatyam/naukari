import { Job, ResultItem, AdmitCardItem, BotDraft, BotLogEntry } from "@/lib/types";

// ---- jobs ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToJob(row: any): Job {
  return {
    id: row.id,
    slug: row.slug,
    state: row.state,
    title: row.title,
    shortInfo: row.short_info,
    organization: row.organization,
    department: row.department,
    category: row.category,
    totalVacancies: row.total_vacancies,
    vacancyBreakdown: row.vacancy_breakdown ?? undefined,
    qualification: row.qualification,
    minAge: row.min_age,
    maxAge: row.max_age,
    ageRelaxation: row.age_relaxation ?? undefined,
    ageRelaxationBreakdown: row.age_relaxation_breakdown ?? undefined,
    salaryMin: row.salary_min,
    salaryMax: row.salary_max,
    applicationFee: row.application_fee,
    selectionProcess: row.selection_process,
    examPattern: row.exam_pattern ?? undefined,
    syllabusSummary: row.syllabus_summary ?? undefined,
    howToApply: row.how_to_apply,
    officialNotificationUrl: row.official_notification_url,
    officialApplyUrl: row.official_apply_url,
    sourceUrl: row.source_url,
    importantLinks: row.important_links ?? undefined,
    importantDates: row.important_dates,
    eligibilityRules: row.eligibility_rules,
    status: row.status,
    createdByBot: row.created_by_bot,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

/** Partial job -> DB row (snake_case), for inserts/updates. Omits `id`. */
export function jobToRow(job: Partial<Job>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (job.slug !== undefined) row.slug = job.slug;
  if (job.state !== undefined) row.state = job.state;
  if (job.title !== undefined) row.title = job.title;
  if (job.shortInfo !== undefined) row.short_info = job.shortInfo;
  if (job.organization !== undefined) row.organization = job.organization;
  if (job.department !== undefined) row.department = job.department;
  if (job.category !== undefined) row.category = job.category;
  if (job.totalVacancies !== undefined) row.total_vacancies = job.totalVacancies;
  if (job.vacancyBreakdown !== undefined) row.vacancy_breakdown = job.vacancyBreakdown;
  if (job.qualification !== undefined) row.qualification = job.qualification;
  if (job.minAge !== undefined) row.min_age = job.minAge;
  if (job.maxAge !== undefined) row.max_age = job.maxAge;
  if (job.ageRelaxation !== undefined) row.age_relaxation = job.ageRelaxation;
  if (job.ageRelaxationBreakdown !== undefined) row.age_relaxation_breakdown = job.ageRelaxationBreakdown;
  if (job.salaryMin !== undefined) row.salary_min = job.salaryMin;
  if (job.salaryMax !== undefined) row.salary_max = job.salaryMax;
  if (job.applicationFee !== undefined) row.application_fee = job.applicationFee;
  if (job.selectionProcess !== undefined) row.selection_process = job.selectionProcess;
  if (job.examPattern !== undefined) row.exam_pattern = job.examPattern;
  if (job.syllabusSummary !== undefined) row.syllabus_summary = job.syllabusSummary;
  if (job.howToApply !== undefined) row.how_to_apply = job.howToApply;
  if (job.officialNotificationUrl !== undefined) row.official_notification_url = job.officialNotificationUrl;
  if (job.officialApplyUrl !== undefined) row.official_apply_url = job.officialApplyUrl;
  if (job.sourceUrl !== undefined) row.source_url = job.sourceUrl;
  if (job.importantLinks !== undefined) row.important_links = job.importantLinks;
  if (job.importantDates !== undefined) row.important_dates = job.importantDates;
  if (job.eligibilityRules !== undefined) row.eligibility_rules = job.eligibilityRules;
  if (job.status !== undefined) row.status = job.status;
  if (job.createdByBot !== undefined) row.created_by_bot = job.createdByBot;
  if (job.publishedAt !== undefined) row.published_at = job.publishedAt;
  if (job.updatedAt !== undefined) row.updated_at = job.updatedAt;
  return row;
}

// ---- results ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToResult(row: any): ResultItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    organization: row.organization,
    category: row.category,
    resultDate: row.result_date,
    officialLink: row.official_link,
    sourceUrl: row.source_url,
    summary: row.summary,
  };
}

export function resultToRow(result: Partial<ResultItem>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (result.slug !== undefined) row.slug = result.slug;
  if (result.title !== undefined) row.title = result.title;
  if (result.organization !== undefined) row.organization = result.organization;
  if (result.category !== undefined) row.category = result.category;
  if (result.resultDate !== undefined) row.result_date = result.resultDate;
  if (result.officialLink !== undefined) row.official_link = result.officialLink;
  if (result.sourceUrl !== undefined) row.source_url = result.sourceUrl;
  if (result.summary !== undefined) row.summary = result.summary;
  return row;
}

// ---- admit cards ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToAdmitCard(row: any): AdmitCardItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    organization: row.organization,
    category: row.category,
    examDate: row.exam_date,
    releaseDate: row.release_date,
    officialLink: row.official_link,
    sourceUrl: row.source_url,
  };
}

export function admitCardToRow(card: Partial<AdmitCardItem>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (card.slug !== undefined) row.slug = card.slug;
  if (card.title !== undefined) row.title = card.title;
  if (card.organization !== undefined) row.organization = card.organization;
  if (card.category !== undefined) row.category = card.category;
  if (card.examDate !== undefined) row.exam_date = card.examDate;
  if (card.releaseDate !== undefined) row.release_date = card.releaseDate;
  if (card.officialLink !== undefined) row.official_link = card.officialLink;
  if (card.sourceUrl !== undefined) row.source_url = card.sourceUrl;
  return row;
}

// ---- bot drafts ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToDraft(row: any): BotDraft {
  return {
    id: row.id,
    jobTitle: row.job_title,
    organization: row.organization,
    sourceUrl: row.source_url,
    detectedAt: row.detected_at,
    status: row.status,
    confidence: row.confidence,
    draftType: row.draft_type ?? "job",
    extractedFields: row.extracted_fields ?? {},
  };
}

export function draftToRow(draft: Partial<BotDraft>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (draft.jobTitle !== undefined) row.job_title = draft.jobTitle;
  if (draft.organization !== undefined) row.organization = draft.organization;
  if (draft.sourceUrl !== undefined) row.source_url = draft.sourceUrl;
  if (draft.detectedAt !== undefined) row.detected_at = draft.detectedAt;
  if (draft.status !== undefined) row.status = draft.status;
  if (draft.confidence !== undefined) row.confidence = draft.confidence;
  if (draft.draftType !== undefined) row.draft_type = draft.draftType;
  if (draft.extractedFields !== undefined) row.extracted_fields = draft.extractedFields;
  return row;
}

// ---- bot log ----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rowToLogEntry(row: any): BotLogEntry {
  return {
    id: row.id,
    timestamp: row.timestamp,
    status: row.status,
    message: row.message,
  };
}
