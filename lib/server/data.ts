import { getSupabasePublic, getSupabaseAdmin } from "./supabaseClient";
import {
  rowToJob,
  jobToRow,
  rowToResult,
  resultToRow,
  rowToAdmitCard,
  admitCardToRow,
  rowToDraft,
  draftToRow,
  rowToLogEntry,
} from "./mappers";
import {
  Job,
  ResultItem,
  AdmitCardItem,
  BotDraft,
  BotLogEntry,
  DraftType,
  HotUpdateItem,
  VacancyBreakdown,
  AgeLimitRow,
  AgeRelaxationRow,
  ImportantLink,
} from "@/lib/types";
import { isRecent, isClosingSoon, getApplicationEndDate } from "@/lib/dateHelpers";
import { deepDecodeEntities, decodeHtmlEntities } from "@/lib/entities";
import { parsePipeTables, PipeTable, firstNumber, deriveAgeRange, deriveSalaryRange, TOTAL_ROW_LABEL, parseFaqLines } from "@/lib/pipeTables";
import { classifyQualification } from "@/lib/taxonomy";
import { isSourceSiteUrl } from "@/lib/utils";

export { deriveAgeRange, deriveSalaryRange };

export { isRecent, isClosingSoon, getApplicationEndDate };

const UNDEFINED_COLUMN_PATTERN = /column\s+"?([a-zA-Z0-9_.]+)"?\s+(?:of relation "?[a-zA-Z0-9_]+"?\s+)?does not exist/i;

async function insertWithMissingColumnRetry<T>(
  insert: (
    row: Record<string, unknown>
  ) => PromiseLike<{ data: T | null; error: { code?: string; message?: string } | null }>,
  row: Record<string, unknown>
): Promise<{ data: T | null; error: { code?: string; message?: string } | null }> {
  const attemptRow = { ...row };
  for (let attempt = 0; attempt < 10; attempt++) {
    const result = await insert(attemptRow);
    if (result.error?.code !== "42703") return result;
    const match = result.error.message?.match(UNDEFINED_COLUMN_PATTERN);
    const column = match?.[1]?.split(".").pop();
    if (!column || !(column in attemptRow)) return result;
    delete attemptRow[column];
  }
  return insert(attemptRow);
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || `job-${Date.now()}`;
}


const VACANCY_TOTAL_ROW_LABEL = TOTAL_ROW_LABEL;

const CATEGORY_HEADER = /category|कोटि|वर्ग|श्रेणी/i;

export function parseVacancyBreakdown(postDetails: unknown): { category: string; count: number; grade?: string }[] | undefined {
  if (typeof postDetails !== "string") return undefined;
  const table = parsePipeTables(postDetails)[0];
  if (!table) return undefined;

  const { header, body } = table;
  const countColIndex = header.findIndex((h) => VACANCY_TOTAL_ROW_LABEL.test(h));
  if (countColIndex <= 0) return undefined;
  const gradeColIndex = countColIndex === 2 ? 1 : -1;

  const expectedColumns = gradeColIndex > 0 ? 3 : 2;
  if (header.length > expectedColumns) return undefined;

  const breakdown: { category: string; count: number; grade?: string }[] = [];
  for (const row of body) {
    const label = row[0];
    if (!label || VACANCY_TOTAL_ROW_LABEL.test(label)) continue;
    const count = firstNumber(row[countColIndex]);
    if (count === undefined) continue;
    const grade = gradeColIndex > 0 ? row[gradeColIndex] : undefined;
    breakdown.push({ category: label, count, ...(grade ? { grade } : {}) });
  }
  return breakdown.length > 0 ? breakdown : undefined;
}

function ageLimitTableToGradeRows(table: PipeTable): { grade: string; minAge: string; maxAge: string }[] {
  if (table.header.length < 3) return [];
  return table.body
    .map((row) => ({ grade: row[0], minAge: row[1] ?? "", maxAge: row[2] ?? "" }))
    .filter((r) => r.grade);
}

function ageLimitTableToRelaxationRows(table: PipeTable): { category: string; relaxation: string }[] {
  return table.body
    .map((row) => ({ category: row[0], relaxation: row[row.length - 1] }))
    .filter((r) => r.category && r.relaxation);
}

export function parseAgeLimitSections(ageLimit: unknown): {
  ageLimitByGrade?: { grade: string; minAge: string; maxAge: string }[];
  ageRelaxationBreakdown?: { category: string; relaxation: string }[];
} {
  if (typeof ageLimit !== "string") return {};
  const tables = parsePipeTables(ageLimit);
  if (tables.length === 0) return {};

  if (tables.length >= 2) {
    const ageLimitByGrade = ageLimitTableToGradeRows(tables[0]);
    const ageRelaxationBreakdown = ageLimitTableToRelaxationRows(tables[1]);
    return {
      ageLimitByGrade: ageLimitByGrade.length > 0 ? ageLimitByGrade : undefined,
      ageRelaxationBreakdown: ageRelaxationBreakdown.length > 0 ? ageRelaxationBreakdown : undefined,
    };
  }

  const table = tables[0];
  if (CATEGORY_HEADER.test(table.header[0])) {
    const ageRelaxationBreakdown = ageLimitTableToRelaxationRows(table);
    return { ageRelaxationBreakdown: ageRelaxationBreakdown.length > 0 ? ageRelaxationBreakdown : undefined };
  }
  const ageLimitByGrade = ageLimitTableToGradeRows(table);
  return { ageLimitByGrade: ageLimitByGrade.length > 0 ? ageLimitByGrade : undefined };
}

function parseSelectionSteps(selectionProcess: unknown): string[] | undefined {
  if (typeof selectionProcess !== "string") return undefined;
  const tables = parsePipeTables(selectionProcess);
  if (tables.length === 0) return undefined;

  const steps = tables.flatMap(({ header, body }) =>
    body.map((row) => {
      const parts = row
        .slice(1)
        .map((cell, i) => (cell && cell !== "—" ? `${header[i + 1]}: ${cell}` : null))
        .filter((part): part is string => Boolean(part));
      return [row[0], ...parts].filter(Boolean).join(" — ");
    })
  ).filter(Boolean);
  return steps.length > 0 ? steps : undefined;
}


export interface JobFilters {
  q?: string;
  category?: string[];
  department?: string[];
  qualification?: string[];
}

export async function getPublishedJobs(filters: JobFilters = {}): Promise<Job[]> {
  const supabase = getSupabasePublic();

  const buildQuery = () => {
    let q = supabase.from("jobs").select("*").eq("status", "published");
    if (filters.q) {
      const term = filters.q;
      q = q.or(`title.ilike.%${term}%,organization.ilike.%${term}%,department.ilike.%${term}%`);
    }
    if (filters.category?.length) q = q.in("category", filters.category);
    if (filters.department?.length) q = q.in("department", filters.department);
    if (filters.qualification?.length) q = q.in("qualification", filters.qualification);
    return q;
  };

  let { data, error } = await buildQuery()
    .order("source_order_key", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false });
  if (error?.code === "42703") {
    ({ data, error } = await buildQuery().order("published_at", { ascending: false }));
  }
  if (error) throw error;
  return (data ?? []).map(rowToJob);
}

export async function getPublishedJobBySlug(slug: string): Promise<Job | undefined> {
  const supabase = getSupabasePublic();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data ? rowToJob(data) : undefined;
}

export async function getRelatedJobs(job: Job, limit: number = 3): Promise<Job[]> {
  const supabase = getSupabasePublic();

  const { data: sameCategoryData, error: e1 } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "published")
    .eq("category", job.category)
    .neq("id", job.id)
    .limit(limit);
  if (e1) throw e1;
  const sameCategory = (sameCategoryData ?? []).map(rowToJob);
  if (sameCategory.length >= limit) return sameCategory.slice(0, limit);

  const excludeIds = [job.id, ...sameCategory.map((j) => j.id)];
  const { data: sameDeptData, error: e2 } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "published")
    .eq("department", job.department)
    .not("id", "in", `(${excludeIds.join(",")})`)
    .limit(limit - sameCategory.length);
  if (e2) throw e2;
  const sameDepartment = (sameDeptData ?? []).map(rowToJob);
  const combined = [...sameCategory, ...sameDepartment];
  if (combined.length >= limit) return combined.slice(0, limit);

  const combinedIds = [job.id, ...combined.map((j) => j.id)];
  const { data: restData, error: e3 } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "published")
    .not("id", "in", `(${combinedIds.join(",")})`)
    .limit(limit - combined.length);
  if (e3) throw e3;
  const rest = (restData ?? []).map(rowToJob);

  return [...combined, ...rest].slice(0, limit);
}

export async function getResults(q?: string): Promise<ResultItem[]> {
  const supabase = getSupabasePublic();
  const buildQuery = () => {
    let query = supabase.from("results").select("*");
    if (q) query = query.or(`title.ilike.%${q}%,organization.ilike.%${q}%,category.ilike.%${q}%`);
    return query;
  };
  let { data, error } = await buildQuery()
    .order("source_order_key", { ascending: false, nullsFirst: false })
    .order("result_date", { ascending: false });
  if (error?.code === "42703") {
    ({ data, error } = await buildQuery().order("result_date", { ascending: false }));
  }
  if (error) throw error;
  return (data ?? []).map(rowToResult);
}

export async function getResultBySlug(slug: string): Promise<ResultItem | undefined> {
  const supabase = getSupabasePublic();
  const { data, error } = await supabase.from("results").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? rowToResult(data) : undefined;
}

export async function getAdmitCards(q?: string): Promise<AdmitCardItem[]> {
  const supabase = getSupabasePublic();
  const buildQuery = () => {
    let query = supabase.from("admit_cards").select("*");
    if (q) query = query.or(`title.ilike.%${q}%,organization.ilike.%${q}%,category.ilike.%${q}%`);
    return query;
  };
  let { data, error } = await buildQuery()
    .order("source_order_key", { ascending: false, nullsFirst: false })
    .order("release_date", { ascending: false });
  if (error?.code === "42703") {
    ({ data, error } = await buildQuery().order("release_date", { ascending: false }));
  }
  if (error) throw error;
  return (data ?? []).map(rowToAdmitCard);
}

export async function getAdmitCardBySlug(slug: string): Promise<AdmitCardItem | undefined> {
  const supabase = getSupabasePublic();
  const { data, error } = await supabase.from("admit_cards").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? rowToAdmitCard(data) : undefined;
}


export async function getAllJobsAdmin(): Promise<Job[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("jobs").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToJob);
}

export async function getJobByIdAdmin(id: string): Promise<Job | undefined> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToJob(data) : undefined;
}

export async function setJobStatus(id: string, status: Job["status"]): Promise<Job | undefined> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("jobs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? rowToJob(data) : undefined;
}

export async function getPendingDrafts(): Promise<BotDraft[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bot_drafts")
    .select("*")
    .eq("status", "pending")
    .order("detected_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToDraft);
}

export async function getAllDrafts(): Promise<BotDraft[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bot_drafts")
    .select("*")
    .order("detected_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToDraft);
}

export async function getDraftById(id: string): Promise<BotDraft | undefined> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("bot_drafts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToDraft(data) : undefined;
}

export async function rejectDraft(id: string): Promise<BotDraft | undefined> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bot_drafts")
    .update({ status: "rejected" })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data ? rowToDraft(data) : undefined;
}

export type ApprovedEntity =
  | { type: "job"; entity: Job }
  | { type: "result"; entity: ResultItem }
  | { type: "admit_card"; entity: AdmitCardItem };

function ensureStringArray(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) return value;
  return fallback;
}

function ensureArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function ensureOptionalArray<T>(value: unknown): T[] | undefined {
  return Array.isArray(value) ? (value as T[]) : undefined;
}

function findLinkByKeywords(links: unknown, keywords: string[]): string | undefined {
  if (!Array.isArray(links)) return undefined;
  for (const link of links) {
    if (!link || typeof link !== "object") continue;
    const label = (link as { label?: unknown }).label;
    const url = (link as { url?: unknown }).url;
    if (typeof label !== "string" || typeof url !== "string") continue;
    if (keywords.some((kw) => label.toLowerCase().includes(kw))) return url;
  }
  return undefined;
}

const APPLY_LINK_KEYWORDS = ["apply", "online", "registration", "आवेदन", "रजिस्ट्रेशन"];
const NOTIFICATION_LINK_KEYWORDS = ["notification", "notice", "advertisement", "pdf", "नोटिफिकेशन", "अधिसूचना"];
const RESULT_LINK_KEYWORDS = ["result", "स्कोर", "scorecard", "मेरिट", "merit", "परिणाम"];
const ADMIT_CARD_LINK_KEYWORDS = ["admit card", "hall ticket", "प्रवेश पत्र", "एडमिट कार्ड", "call letter"];

export function sanitizeImportantLinks(links: unknown): ImportantLink[] | undefined {
  if (!Array.isArray(links)) return undefined;
  const cleaned = links.filter(
    (link): link is ImportantLink =>
      !!link &&
      typeof link === "object" &&
      typeof (link as { label?: unknown }).label === "string" &&
      typeof (link as { url?: unknown }).url === "string" &&
      !isSourceSiteUrl((link as { url: string }).url)
  );
  return cleaned.length > 0 ? cleaned : undefined;
}

function firstExternalUrl(...candidates: (string | undefined)[]): string | undefined {
  for (const candidate of candidates) {
    if (candidate && !isSourceSiteUrl(candidate)) return candidate;
  }
  return undefined;
}

const SOURCE_SITE_PATTERN = /(https?:\/\/)?(www\.)?biharjob\.co\.in/gi;
const OWN_SITE_DOMAIN = "naukari-lac.vercel.app";

function replaceSourceSitePlug(text: string | undefined): string | undefined {
  if (typeof text !== "string") return text;
  return text.replace(SOURCE_SITE_PATTERN, OWN_SITE_DOMAIN);
}

function applyRawTextDefaults(merged: Record<string, unknown>): void {
  const hasFaqs = Array.isArray(merged.faqs) && merged.faqs.length > 0;
  if (!hasFaqs && Array.isArray(merged.faqText) && merged.faqText.length > 0) {
    merged.faqs = parseFaqLines(merged.faqText as string[]);
  }
  const hasConclusion = typeof merged.conclusion === "string" && merged.conclusion.trim().length > 0;
  if (!hasConclusion && typeof merged.conclusionText === "string" && merged.conclusionText.trim().length > 0) {
    merged.conclusion = merged.conclusionText;
  }
}

function ensureApplicationFee(
  value: unknown,
  fallback: { general: number; reserved: number; note?: string }
): { general: number; reserved: number; note?: string } {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    ("general" in value || "reserved" in value)
  ) {
    return value as { general: number; reserved: number; note?: string };
  }
  return fallback;
}

function ensureOptionalApplicationFee(
  value: unknown
): { general: number; reserved: number; note?: string } | undefined {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    ("general" in value || "reserved" in value)
  ) {
    return value as { general: number; reserved: number; note?: string };
  }
  return undefined;
}

function extractSharedNotificationFields(merged: Record<string, unknown>) {
  return {
    totalVacancies: typeof merged.totalVacancies === "number" ? merged.totalVacancies : undefined,
    vacancyBreakdown:
      ensureOptionalArray<VacancyBreakdown>(merged.vacancyBreakdown) ?? parseVacancyBreakdown(merged.postDetails),
    postDetailsText: typeof merged.postDetails === "string" ? merged.postDetails : undefined,
    ageLimitByGrade:
      ensureOptionalArray<AgeLimitRow>(merged.ageLimitByGrade) ?? parseAgeLimitSections(merged.ageLimit).ageLimitByGrade,
    ageRelaxationBreakdown:
      ensureOptionalArray<AgeRelaxationRow>(merged.ageRelaxationBreakdown) ??
      parseAgeLimitSections(merged.ageLimit).ageRelaxationBreakdown,
    ageLimitText: typeof merged.ageLimit === "string" ? merged.ageLimit : undefined,
    applicationFee: ensureOptionalApplicationFee(merged.applicationFee),
    applicationFeeText: typeof merged.applicationFeeText === "string" ? merged.applicationFeeText : undefined,
    selectionProcess: ensureOptionalArray<string>(merged.selectionProcess) ?? parseSelectionSteps(merged.selectionProcess),
    selectionProcessText: typeof merged.selectionProcess === "string" ? merged.selectionProcess : undefined,
    examPatternNotes: ensureOptionalArray<string>(merged.examPatternNotes),
    eligibilityText: typeof merged.eligibility === "string" ? merged.eligibility : undefined,
  };
}

export async function approveDraft(
  id: string,
  edits: Record<string, unknown>
): Promise<ApprovedEntity | undefined> {
  const supabase = getSupabaseAdmin();

  const { data: draftRow, error: fetchError } = await supabase
    .from("bot_drafts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!draftRow) return undefined;
  const draft = rowToDraft(draftRow);

  if (draft.status === "pending" && (await isSourceAlreadyPublished(draft.sourceUrl))) {
    await supabase.from("bot_drafts").update({ status: "rejected" }).eq("id", id);
    throw new Error(
      "A job/result/admit card for this exact source is already published — this draft was a stale duplicate and has been marked rejected instead."
    );
  }

  const cleanedExtractedFields = deepDecodeEntities(draft.extractedFields) as Record<string, unknown>;
  const cleanedEdits = deepDecodeEntities(edits) as Record<string, unknown>;
  const cleanJobTitle = decodeHtmlEntities(draft.jobTitle);

  const markApproved = async () => {
    const { error } = await supabase.from("bot_drafts").update({ status: "approved" }).eq("id", id);
    if (error) throw error;
  };

  if (draft.draftType === "result") {
    const merged = { ...cleanedExtractedFields, ...cleanedEdits } as Partial<ResultItem> & Record<string, unknown>;
    applyRawTextDefaults(merged);
    const title = merged.title ?? cleanJobTitle;
    const sanitizedLinks = sanitizeImportantLinks(merged.importantLinks);
    const newResult: Partial<ResultItem> = {
      slug: slugify(title),
      title,
      organization: merged.organization ?? draft.organization,
      category: merged.category ?? "Administrative",
      resultDate: merged.resultDate ?? new Date().toISOString().slice(0, 10),
      officialLink:
        firstExternalUrl(
          merged.officialLink,
          findLinkByKeywords(sanitizedLinks, RESULT_LINK_KEYWORDS),
          findLinkByKeywords(sanitizedLinks, NOTIFICATION_LINK_KEYWORDS),
          findLinkByKeywords(sanitizedLinks, APPLY_LINK_KEYWORDS),
          typeof merged.notificationPdfLink === "string" ? merged.notificationPdfLink : undefined,
          typeof merged.applyOnlineLink === "string" ? merged.applyOnlineLink : undefined,
          typeof merged.officialWebsiteLink === "string" ? merged.officialWebsiteLink : undefined
        ) ?? draft.sourceUrl,
      sourceUrl: draft.sourceUrl,
      summary: merged.summary ?? `${title} — see the official notification for full details.`,
      importantDatesText: merged.importantDatesText,
      howToCheck: ensureOptionalArray(merged.howToApply),
      cutoffText: typeof merged.cutoffText === "string" ? merged.cutoffText : undefined,
      ...extractSharedNotificationFields(merged),
      examPattern: typeof merged.examPattern === "string" ? merged.examPattern : undefined,
      documentsRequired: typeof merged.documentsRequired === "string" ? merged.documentsRequired : undefined,
      importantLinks: sanitizedLinks,
      faqs: ensureOptionalArray(merged.faqs),
      conclusion: replaceSourceSitePlug(merged.conclusion),
      additionalSections: ensureOptionalArray(merged.genericSections),
      sectionOrder: ensureOptionalArray<string>(merged.sectionOrder),
      sourceOrderKey: draft.sourceOrderKey,
    };
    const resultRow = resultToRow(newResult);
    const { data: inserted, error: insertError } = await insertWithMissingColumnRetry(
      (row) => supabase.from("results").insert(row).select().single(),
      resultRow
    );
    if (insertError) throw insertError;
    await markApproved();
    return { type: "result", entity: rowToResult(inserted) };
  }

  if (draft.draftType === "admit_card") {
    const merged = { ...cleanedExtractedFields, ...cleanedEdits } as Partial<AdmitCardItem> & Record<string, unknown>;
    applyRawTextDefaults(merged);
    const title = merged.title ?? cleanJobTitle;
    const now = new Date();
    const defaultExamDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const sanitizedLinks = sanitizeImportantLinks(merged.importantLinks);
    const newCard: Partial<AdmitCardItem> = {
      slug: slugify(title),
      title,
      organization: merged.organization ?? draft.organization,
      category: merged.category ?? "Administrative",
      examDate: merged.examDate ?? defaultExamDate,
      releaseDate: merged.releaseDate ?? now.toISOString().slice(0, 10),
      officialLink:
        firstExternalUrl(
          merged.officialLink,
          findLinkByKeywords(sanitizedLinks, ADMIT_CARD_LINK_KEYWORDS),
          findLinkByKeywords(sanitizedLinks, NOTIFICATION_LINK_KEYWORDS),
          findLinkByKeywords(sanitizedLinks, APPLY_LINK_KEYWORDS),
          typeof merged.notificationPdfLink === "string" ? merged.notificationPdfLink : undefined,
          typeof merged.applyOnlineLink === "string" ? merged.applyOnlineLink : undefined,
          typeof merged.officialWebsiteLink === "string" ? merged.officialWebsiteLink : undefined
        ) ?? draft.sourceUrl,
      sourceUrl: draft.sourceUrl,
      importantDatesText: merged.importantDatesText,
      howToDownload: ensureOptionalArray(merged.howToApply),
      examDayInstructionsText: typeof merged.documentsRequired === "string" ? merged.documentsRequired : undefined,
      examPattern: merged.examPattern,
      ...extractSharedNotificationFields(merged),
      importantLinks: sanitizedLinks,
      faqs: ensureOptionalArray(merged.faqs),
      conclusion: replaceSourceSitePlug(merged.conclusion),
      additionalSections: ensureOptionalArray(merged.genericSections),
      sectionOrder: ensureOptionalArray<string>(merged.sectionOrder),
      sourceOrderKey: draft.sourceOrderKey,
    };
    const cardRow = admitCardToRow(newCard);
    const { data: inserted, error: insertError } = await insertWithMissingColumnRetry(
      (row) => supabase.from("admit_cards").insert(row).select().single(),
      cardRow
    );
    if (insertError) throw insertError;
    await markApproved();
    return { type: "admit_card", entity: rowToAdmitCard(inserted) };
  }

  const merged = { ...cleanedExtractedFields, ...cleanedEdits } as Partial<Job> & Record<string, unknown>;
  applyRawTextDefaults(merged);
  const title = merged.title ?? cleanJobTitle;
  const now = new Date().toISOString();
  const sanitizedLinks = sanitizeImportantLinks(merged.importantLinks);

  const newJob: Partial<Job> = {
    slug: slugify(title),
    state: merged.state ?? "Bihar",
    title,
    shortInfo: merged.shortInfo ?? `${title} — details from the official notification.`,
    organization: merged.organization ?? draft.organization,
    department: merged.department ?? draft.organization,
    category: merged.category ?? "Administrative",
    totalVacancies: merged.totalVacancies ?? 0,
    vacancyBreakdown: ensureOptionalArray(merged.vacancyBreakdown) ?? parseVacancyBreakdown(merged.postDetails),
    postDetailsText: typeof merged.postDetails === "string" ? merged.postDetails : undefined,
    qualification:
      merged.qualification ??
      classifyQualification(typeof merged.eligibility === "string" ? merged.eligibility : undefined) ??
      classifyQualification(title) ??
      "As per notification",
    minAge: merged.minAge ?? deriveAgeRange(merged.ageLimit).minAge ?? 18,
    maxAge: merged.maxAge ?? deriveAgeRange(merged.ageLimit).maxAge ?? 40,
    ageRelaxation: merged.ageRelaxation,
    ageRelaxationBreakdown:
      ensureOptionalArray(merged.ageRelaxationBreakdown) ?? parseAgeLimitSections(merged.ageLimit).ageRelaxationBreakdown,
    ageAsOnDate: merged.ageAsOnDate,
    ageLimitByGrade: ensureOptionalArray(merged.ageLimitByGrade) ?? parseAgeLimitSections(merged.ageLimit).ageLimitByGrade,
    ageLimitText: typeof merged.ageLimit === "string" ? merged.ageLimit : undefined,
    salaryMin: merged.salaryMin ?? deriveSalaryRange(merged.postDetails).salaryMin ?? 0,
    salaryMax: merged.salaryMax ?? deriveSalaryRange(merged.postDetails).salaryMax ?? 0,
    applicationFee: ensureApplicationFee(merged.applicationFee, {
      general: 0,
      reserved: 0,
      note: "See official notification",
    }),
    applicationFeeText: typeof merged.applicationFeeText === "string" ? merged.applicationFeeText : undefined,
    selectionProcess: ensureStringArray(
      merged.selectionProcess,
      parseSelectionSteps(merged.selectionProcess) ?? ["As per official notification"]
    ),
    selectionProcessText: typeof merged.selectionProcess === "string" ? merged.selectionProcess : undefined,
    examPattern: merged.examPattern,
    examPatternNotes: ensureOptionalArray(merged.examPatternNotes),
    documentsRequired: merged.documentsRequired,
    syllabusSummary: merged.syllabusSummary,
    eligibilityDetails: ensureOptionalArray(merged.eligibilityDetails),
    eligibilityText: typeof merged.eligibility === "string" ? merged.eligibility : undefined,
    howToApply: ensureStringArray(merged.howToApply, [
      "See the official notification for the application procedure",
    ]),
    officialNotificationUrl:
      firstExternalUrl(
        merged.officialNotificationUrl,
        findLinkByKeywords(sanitizedLinks, NOTIFICATION_LINK_KEYWORDS),
        typeof merged.notificationPdfLink === "string" ? merged.notificationPdfLink : undefined
      ) ?? draft.sourceUrl,
    officialApplyUrl:
      firstExternalUrl(
        merged.officialApplyUrl,
        findLinkByKeywords(sanitizedLinks, APPLY_LINK_KEYWORDS),
        typeof merged.applyOnlineLink === "string" ? merged.applyOnlineLink : undefined
      ) ?? draft.sourceUrl,
    sourceUrl: draft.sourceUrl,
    importantLinks: sanitizedLinks,
    importantDates: ensureArray(merged.importantDates, []),
    importantDatesText: Array.isArray(merged.importantDatesText)
      ? (merged.importantDatesText as string[]).join(" || ")
      : typeof merged.importantDatesText === "string"
        ? merged.importantDatesText
        : undefined,
    eligibilityRules: ensureArray(merged.eligibilityRules, []),
    faqs: ensureOptionalArray(merged.faqs),
    conclusion: replaceSourceSitePlug(merged.conclusion),
    additionalSections: ensureOptionalArray(merged.genericSections),
    sectionOrder: ensureOptionalArray<string>(merged.sectionOrder),
    sourceOrderKey: draft.sourceOrderKey,
    status: "published",
    createdByBot: true,
    publishedAt: now,
    updatedAt: now,
  };

  const jobRow = jobToRow(newJob);
  const { data: insertedJob, error: insertError } = await insertWithMissingColumnRetry(
    (row) => supabase.from("jobs").insert(row).select().single(),
    jobRow
  );
  if (insertError) throw insertError;
  await markApproved();
  return { type: "job", entity: rowToJob(insertedJob) };
}


async function isSourceAlreadyPublished(sourceUrl: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const [jobResult, resultResult, admitCardResult] = await Promise.all([
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("source_url", sourceUrl),
    supabase.from("results").select("id", { count: "exact", head: true }).eq("source_url", sourceUrl),
    supabase.from("admit_cards").select("id", { count: "exact", head: true }).eq("source_url", sourceUrl),
  ]);
  if (jobResult.error) throw jobResult.error;
  if (resultResult.error) throw resultResult.error;
  if (admitCardResult.error) throw admitCardResult.error;
  return (jobResult.count ?? 0) > 0 || (resultResult.count ?? 0) > 0 || (admitCardResult.count ?? 0) > 0;
}

export async function draftExistsForSource(sourceUrl: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { count: draftCount, error: draftError } = await supabase
    .from("bot_drafts")
    .select("id", { count: "exact", head: true })
    .eq("source_url", sourceUrl);
  if (draftError) throw draftError;
  if ((draftCount ?? 0) > 0) return true;

  return isSourceAlreadyPublished(sourceUrl);
}

export async function createDraft(input: {
  jobTitle: string;
  organization: string;
  sourceUrl: string;
  confidence: BotDraft["confidence"];
  draftType?: DraftType;
  sourceOrderKey?: number;
  extractedFields: Record<string, unknown>;
}): Promise<BotDraft> {
  const supabase = getSupabaseAdmin();
  const row = draftToRow({
    jobTitle: input.jobTitle,
    organization: input.organization,
    sourceUrl: input.sourceUrl,
    detectedAt: new Date().toISOString(),
    status: "pending",
    confidence: input.confidence,
    draftType: input.draftType ?? "job",
    sourceOrderKey: input.sourceOrderKey,
    extractedFields: input.extractedFields,
  });
  let { data, error } = await supabase.from("bot_drafts").insert(row).select().single();
  if (error?.code === "42703") {
    delete row.source_order_key;
    ({ data, error } = await supabase.from("bot_drafts").insert(row).select().single());
  }
  if (error) throw error;
  return rowToDraft(data);
}


export async function addBotLogEntry(
  status: BotLogEntry["status"],
  message: string
): Promise<BotLogEntry> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bot_log")
    .insert({ status, message })
    .select()
    .single();
  if (error) throw error;
  return rowToLogEntry(data);
}

export async function getBotLog(limit: number = 10): Promise<BotLogEntry[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bot_log")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(rowToLogEntry);
}

export interface BotRunSummary {
  ranAt: string;
  newCount: number;
  duplicateCount: number;
  expiredCount: number;
  errorCount: number;
}

const RUN_SUMMARY_PATTERN =
  /^Bot run summary: (\d+) new draft\(s\), (\d+) duplicate\(s\) skipped, (\d+) expired skipped, (\d+) error\(s\)/;

export async function getLastBotRunSummary(): Promise<BotRunSummary | undefined> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bot_log")
    .select("*")
    .ilike("message", "Bot run summary:%")
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;

  const match = (data.message as string).match(RUN_SUMMARY_PATTERN);
  if (!match) return undefined;

  return {
    ranAt: data.timestamp,
    newCount: Number(match[1]),
    duplicateCount: Number(match[2]),
    expiredCount: Number(match[3]),
    errorCount: Number(match[4]),
  };
}


export async function getAdminStats() {
  const supabase = getSupabaseAdmin();

  const [{ count: pendingDrafts }, { count: publishedJobs }, { count: totalDrafts }] = await Promise.all([
    supabase.from("bot_drafts").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("bot_drafts").select("id", { count: "exact", head: true }),
  ]);

  return {
    pendingDrafts: pendingDrafts ?? 0,
    publishedJobs: publishedJobs ?? 0,
    totalDrafts: totalDrafts ?? 0,
  };
}


export async function getHotUpdates(limit: number = 8): Promise<HotUpdateItem[]> {
  const [jobs, results, admitCards] = await Promise.all([
    getPublishedJobs(),
    getResults(),
    getAdmitCards(),
  ]);

  const jobItems: HotUpdateItem[] = jobs.map((j) => ({
    type: "Job",
    href: `/jobs/${j.slug}`,
    title: j.title,
    organization: j.organization,
    category: j.category,
    date: j.publishedAt,
    isNew: isRecent(j.publishedAt),
  }));

  const resultItems: HotUpdateItem[] = results.map((r) => ({
    type: "Result",
    href: `/results/${r.slug}`,
    title: r.title,
    organization: r.organization,
    category: r.category,
    date: r.resultDate,
    isNew: isRecent(r.resultDate),
  }));

  const admitCardItems: HotUpdateItem[] = admitCards.map((a) => ({
    type: "Admit Card",
    href: `/admit-cards/${a.slug}`,
    title: a.title,
    organization: a.organization,
    category: a.category,
    date: a.releaseDate,
    isNew: isRecent(a.releaseDate),
  }));

  return [...jobItems, ...resultItems, ...admitCardItems]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}