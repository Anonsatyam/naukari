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
import { Job, ResultItem, AdmitCardItem, BotDraft, BotLogEntry, DraftType, HotUpdateItem } from "@/lib/types";
import { isRecent, isClosingSoon, getApplicationEndDate } from "@/lib/dateHelpers";
import { deepDecodeEntities, decodeHtmlEntities } from "@/lib/entities";
import { parsePipeTables, PipeTable, firstNumber, deriveAgeRange, deriveSalaryRange } from "@/lib/pipeTables";

// Re-exported so the admin draft review page (a client component,
// which can't import this server-only module) can compute the same
// smart pre-fill for its Min/Max Age and Salary inputs — these two are
// pure text parsers with no server dependency, so they live in the
// shared lib/pipeTables.ts and are just re-exported here for callers
// that already import data.ts for everything else.
export { deriveAgeRange, deriveSalaryRange };

// Re-exported so existing callers importing these from this module keep working.
export { isRecent, isClosingSoon, getApplicationEndDate };

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || `job-${Date.now()}`;
}

// ---- Bot raw-field parsing (postDetails / selectionProcess / ageLimit) --
//
// extractHtmlNotificationFields.ts stores each free-form section as one
// or more distinct pipe-tables (see lib/pipeTables.ts) rather than
// trying to force every source site's table layout into one fixed
// shape. Converting that into the Job type's actual structured fields
// (vacancyBreakdown: {category,count}[], selectionProcess: string[])
// belongs here, at the one place a draft turns into a published record
// — not in the extractor, which doesn't know what a Job record needs,
// and not in the page component, which shouldn't have to re-parse raw
// pipe strings to render (it still does, for the raw-text *fallback*
// display, via the same shared lib/pipeTables.ts parser).

// "कुल पद" ("total posts") is at least as common on real notification
// pages as "कुल योग"/"कुल रिक्तियां" — it was missing here, which meant a
// perfectly well-shaped 2-3 column post/vacancy table failed to produce
// a vacancyBreakdown at all (the header-column lookup below never
// matched, so parseVacancyBreakdown bailed out with `undefined` and the
// whole "Vacancy Details" section silently never rendered on the job
// page for any source using that phrasing).
const VACANCY_TOTAL_ROW_LABEL = /total\s*vacanc\w*|total\s*posts?|grand\s*total|कुल\s*रिक्तिय|कुल\s*योग|कुल\s*पद/i;

// Rows whose first cell is itself a category label ("Category" /
// "कोटि" / "वर्ग" / "श्रेणी") mark a table that's entirely category ->
// age/relaxation value, rather than a grade/cadre age table — see
// parseAgeLimitSections below.
const CATEGORY_HEADER = /category|कोटि|वर्ग|श्रेणी/i;

/**
 * Converts a postDetails pipe-table into {category, count}[] for the
 * job page's "Vacancy Details (Category-wise)" section. Only ever looks
 * at the FIRST table under the heading — some sources publish a second,
 * unrelated table in the same section (a regional/language allocation
 * matrix alongside the actual post-count table); rather than guess
 * which one is "the" vacancy table, this only trusts the first, and the
 * job page's postDetailsText raw-table fallback covers the rest.
 *
 * Resolves the count column by its OWN header text (matching the same
 * fix applied in the bot's extractCanonicalVacancies) rather than
 * assuming it's the last column — some notification templates put a
 * Women's Quota or Pay Scale column after the actual post-count
 * column, and a position-based guess picks up the wrong number.
 */
export function parseVacancyBreakdown(postDetails: unknown): { category: string; count: number; grade?: string }[] | undefined {
  if (typeof postDetails !== "string") return undefined;
  const table = parsePipeTables(postDetails)[0];
  if (!table) return undefined;

  const { header, body } = table;
  const countColIndex = header.findIndex((h) => VACANCY_TOTAL_ROW_LABEL.test(h));
  if (countColIndex <= 0) return undefined;
  // Some notification templates put a Grade/Scale column between the
  // post name and the post count (e.g. "Post Name | Grade | Total
  // Posts", as BOB SO 2026 does) — captured here so it isn't silently
  // dropped, same as the count column already resolves by header text
  // rather than position.
  const gradeColIndex = countColIndex === 2 ? 1 : -1;

  const breakdown: { category: string; count: number; grade?: string }[] = [];
  for (const row of body) {
    const label = row[0];
    if (!label || VACANCY_TOTAL_ROW_LABEL.test(label)) continue; // skip the grand-total row itself
    const count = firstNumber(row[countColIndex]);
    if (count === undefined) continue;
    const grade = gradeColIndex > 0 ? row[gradeColIndex] : undefined;
    breakdown.push({ category: label, count, ...(grade ? { grade } : {}) });
  }
  return breakdown.length > 0 ? breakdown : undefined;
}

function ageLimitTableToGradeRows(table: PipeTable): { grade: string; minAge: string; maxAge: string }[] {
  return table.body
    .map((row) => ({ grade: row[0], minAge: row[1] ?? "", maxAge: row[2] ?? "" }))
    .filter((r) => r.grade);
}

function ageLimitTableToRelaxationRows(table: PipeTable): { category: string; relaxation: string }[] {
  // Deliberately does NOT re-filter rows by CATEGORY_HEADER — real
  // category *values* routinely contain the same words the header does
  // ("सभी श्रेणी" = "all categories", "आरक्षित वर्ग" = "reserved
  // category"), and an earlier version of this that filtered on that
  // word discarded real data rows, not just a repeated header.
  return table.body
    .map((row) => ({ category: row[0], relaxation: row[row.length - 1] }))
    .filter((r) => r.category && r.relaxation);
}

/**
 * Converts the raw "Age Limit" table(s) into the job page's two
 * distinct sections: a cadre/grade-wise min/max-age table
 * (ageLimitByGrade) and a category-wise relaxation table
 * (ageRelaxationBreakdown). Sources publish this in one of two shapes:
 *
 * 1. Two separate tables under one heading — a grade-wise age table
 *    (e.g. "Officer | 23 | 35") followed by a category/relaxation
 *    table. Table boundaries are explicit (see lib/pipeTables.ts), so
 *    this is just "first table -> grade rows, second -> relaxation
 *    rows" — no guessing which is which needed.
 * 2. A single category-headed table (header's first cell reads
 *    "Category"/"कोटि"/"वर्ग"/"श्रेणी") where every row already *is* a
 *    category -> age/relaxation value — the whole table becomes
 *    ageRelaxationBreakdown, keyed off the row's last cell. This is
 *    the one case that still needs the CATEGORY_HEADER keyword check,
 *    since a single table's own shape is genuinely ambiguous otherwise
 *    (a grade table and a category-relaxation table look the same:
 *    "label | number | number-or-text").
 */
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

/**
 * Converts a selectionProcess pipe-table into one readable line per
 * stage, e.g. "प्रथम चरण — परीक्षा का नाम: ..., कुल अंक: 50 Marks" —
 * for the job page's plain numbered StepList, which expects string[]
 * and has no table-rendering of its own. This is the fix for
 * selectionProcess showing the generic "As per official notification"
 * placeholder: `ensureStringArray` correctly rejects the raw pipe
 * string as the wrong runtime shape and falls back to that placeholder
 * — the fix is supplying it a real fallback derived from the table,
 * not bypassing the shape check. Flattens across every table under the
 * heading (rather than only the first) since a source occasionally
 * splits Prelims/Mains selection stages into two small tables.
 */
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

// ---- Public reads (published only — uses the publishable-key client,
// so Row Level Security enforces this even if a query below had a bug) ----

export interface JobFilters {
  q?: string;
  category?: string[];
  department?: string[];
  qualification?: string[];
}

export async function getPublishedJobs(filters: JobFilters = {}): Promise<Job[]> {
  const supabase = getSupabasePublic();
  let query = supabase.from("jobs").select("*").eq("status", "published");

  if (filters.q) {
    const q = filters.q;
    query = query.or(`title.ilike.%${q}%,organization.ilike.%${q}%,department.ilike.%${q}%`);
  }
  if (filters.category?.length) query = query.in("category", filters.category);
  if (filters.department?.length) query = query.in("department", filters.department);
  if (filters.qualification?.length) query = query.in("qualification", filters.qualification);

  const { data, error } = await query.order("published_at", { ascending: false });
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
  let query = supabase.from("results").select("*");
  if (q) query = query.or(`title.ilike.%${q}%,organization.ilike.%${q}%,category.ilike.%${q}%`);
  const { data, error } = await query.order("result_date", { ascending: false });
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
  let query = supabase.from("admit_cards").select("*");
  if (q) query = query.or(`title.ilike.%${q}%,organization.ilike.%${q}%,category.ilike.%${q}%`);
  const { data, error } = await query.order("release_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToAdmitCard);
}

export async function getAdmitCardBySlug(slug: string): Promise<AdmitCardItem | undefined> {
  const supabase = getSupabasePublic();
  const { data, error } = await supabase.from("admit_cards").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? rowToAdmitCard(data) : undefined;
}

// ---- Admin reads/writes (service-role client — bypasses RLS) ----

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

/**
 * A draft's extractedFields is whatever shape the source extraction
 * happened to produce — it isn't guaranteed to match the Job type it
 * gets spread into. `??` alone only substitutes a default for
 * null/undefined, not for a value that's present but the wrong runtime
 * type (a string where an array is expected, for instance) — that
 * wrong-shaped value would otherwise sail straight into the database
 * and only fail later, when something tries to .map() over it.
 */
function ensureStringArray(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) return value;
  return fallback;
}

function ensureArray<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

// For genuinely optional array fields (rendered conditionally when
// present) — a wrong-shaped value is dropped to undefined rather than
// forced into an empty array, so "this section doesn't apply" and
// "this section had bad data" don't get conflated.
function ensureOptionalArray<T>(value: unknown): T[] | undefined {
  return Array.isArray(value) ? (value as T[]) : undefined;
}

// Finds a link in the bot's raw importantLinks list whose label reads
// as "the apply link" / "the notification PDF" etc., so
// officialApplyUrl/officialNotificationUrl can fall back to the real,
// specific URL the source page actually links to — instead of
// falling all the way back to the source article's own URL, which is
// what happens below when neither field was extracted directly (seen
// in practice: a job whose "Apply Officially" and "Official
// Notification" buttons both silently pointed at the biharjob.co.in
// listing page itself, while the correct IBPS registration link and
// SBI notification PDF sat right there in importantLinks, unused).
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

// The source's own Conclusion paragraph routinely plugs itself by
// name/domain ("अधिक जानकारी के लिए biharjob.co.in पर विजिट करें" and
// similar) — harmless as a fact, but it's directing our own visitors
// to a competing site. Swapped for ours wherever it appears, in any
// of the forms a source actually writes it (bare domain, with a
// protocol/www prefix, or wrapped in a markdown link).
const SOURCE_SITE_PATTERN = /(https?:\/\/)?(www\.)?biharjob\.co\.in/gi;
const OWN_SITE_DOMAIN = "naukari-lac.vercel.app";

function replaceSourceSitePlug(text: string | undefined): string | undefined {
  if (typeof text !== "string") return text;
  return text.replace(SOURCE_SITE_PATTERN, OWN_SITE_DOMAIN);
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

/**
 * Approves a draft: merges the bot-extracted fields with whatever the
 * admin edited, fills in sensible defaults for anything still missing,
 * and publishes the result as a live row — in whichever table matches
 * the draft's type (job / result / admit_card).
 */
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

  // Belt-and-suspenders with the bot's own extraction fix: that stops
  // NEW drafts from ever containing raw entity codes (&#8220; etc), but
  // any draft already sitting in bot_drafts from before that fix
  // shipped still has them baked into its stored JSON. Cleaning once
  // here — the one place every draft type funnels through on its way
  // to a published record — means approving an old draft doesn't carry
  // the gibberish into the live site.
  const cleanedExtractedFields = deepDecodeEntities(draft.extractedFields) as Record<string, unknown>;
  // The review page re-sends several of these same raw fields back as
  // `edits` on approve (ageLimit, postDetails, selectionProcess, ...) —
  // sourced from whatever the browser originally fetched, i.e. still
  // undecoded. Cleaning `edits` too, so that pass-through doesn't
  // silently overwrite the decoded version when merged below.
  const cleanedEdits = deepDecodeEntities(edits) as Record<string, unknown>;
  // Same belt-and-suspenders reasoning as above, for the one title
  // field that isn't inside extractedFields/edits: a draft scraped
  // before the bot's own emoji-stripping fix shipped can still have a
  // "🔥" baked into jobTitle itself.
  const cleanJobTitle = decodeHtmlEntities(draft.jobTitle);

  const markApproved = async () => {
    const { error } = await supabase.from("bot_drafts").update({ status: "approved" }).eq("id", id);
    if (error) throw error;
  };

  if (draft.draftType === "result") {
    const merged = { ...cleanedExtractedFields, ...cleanedEdits } as Partial<ResultItem>;
    const title = merged.title ?? cleanJobTitle;
    const newResult: Partial<ResultItem> = {
      slug: slugify(title),
      title,
      organization: merged.organization ?? draft.organization,
      category: merged.category ?? "Administrative",
      resultDate: merged.resultDate ?? new Date().toISOString().slice(0, 10),
      officialLink: merged.officialLink ?? draft.sourceUrl,
      sourceUrl: draft.sourceUrl,
      summary: merged.summary ?? `${title} — see the official notification for full details.`,
    };
    const { data: inserted, error: insertError } = await supabase
      .from("results")
      .insert(resultToRow(newResult))
      .select()
      .single();
    if (insertError) throw insertError;
    await markApproved();
    return { type: "result", entity: rowToResult(inserted) };
  }

  if (draft.draftType === "admit_card") {
    const merged = { ...cleanedExtractedFields, ...cleanedEdits } as Partial<AdmitCardItem>;
    const title = merged.title ?? cleanJobTitle;
    const now = new Date();
    const defaultExamDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const newCard: Partial<AdmitCardItem> = {
      slug: slugify(title),
      title,
      organization: merged.organization ?? draft.organization,
      category: merged.category ?? "Administrative",
      examDate: merged.examDate ?? defaultExamDate,
      releaseDate: merged.releaseDate ?? now.toISOString().slice(0, 10),
      officialLink: merged.officialLink ?? draft.sourceUrl,
      sourceUrl: draft.sourceUrl,
    };
    const { data: inserted, error: insertError } = await supabase
      .from("admit_cards")
      .insert(admitCardToRow(newCard))
      .select()
      .single();
    if (insertError) throw insertError;
    await markApproved();
    return { type: "admit_card", entity: rowToAdmitCard(inserted) };
  }

  // draftType === "job" (default, and the original Phase 3/4 behavior)
  // Partial<Job> alone rejects reading `postDetails` below — it's a
  // raw bot-only field (the postDetails pipe-table string) that never
  // becomes its own Job column; it only exists to be parsed into
  // vacancyBreakdown. The intersection lets known Job fields keep their
  // real types while still allowing that one raw read.
  const merged = { ...cleanedExtractedFields, ...cleanedEdits } as Partial<Job> & Record<string, unknown>;
  const title = merged.title ?? cleanJobTitle;
  const now = new Date().toISOString();

  const newJob: Partial<Job> = {
    slug: slugify(title),
    state: merged.state ?? "Bihar",
    title,
    shortInfo: merged.shortInfo ?? `${title} — details from the official notification.`,
    organization: merged.organization ?? draft.organization,
    department: merged.department ?? draft.organization,
    category: merged.category ?? "Administrative",
    totalVacancies: merged.totalVacancies ?? 0,
    // merged.vacancyBreakdown is only ever populated when an admin
    // edit supplies it directly — the bot never produces that key, only
    // the raw postDetails pipe-table, so this fell back to `undefined`
    // (and the whole "Vacancy Details" section silently never rendered)
    // for every bot-sourced job until now.
    vacancyBreakdown: ensureOptionalArray(merged.vacancyBreakdown) ?? parseVacancyBreakdown(merged.postDetails),
    // Kept verbatim regardless of whether parseVacancyBreakdown found a
    // category->count shape in it — some sources' "Post Details" table
    // is really just post name / participating banks / pay scale, with
    // no per-category numbers to extract at all, and that's still worth
    // showing as a table rather than nothing.
    postDetailsText: typeof merged.postDetails === "string" ? merged.postDetails : undefined,
    qualification: merged.qualification ?? "As per notification",
    // The bot never derives a single min/max age number on its own (no
    // form field for it either) — this was always silently defaulting
    // to the generic 18-40 placeholder even when the real range (e.g.
    // "20 to 28 years") was sitting right there in the Age Limit table.
    minAge: merged.minAge ?? deriveAgeRange(merged.ageLimit).minAge ?? 18,
    maxAge: merged.maxAge ?? deriveAgeRange(merged.ageLimit).maxAge ?? 40,
    ageRelaxation: merged.ageRelaxation,
    // Manual edits from the draft review page win if the admin filled
    // them in; otherwise fall back to parsing the raw "Age Limit" table
    // the bot already extracted, same pattern as vacancyBreakdown below.
    ageRelaxationBreakdown:
      ensureOptionalArray(merged.ageRelaxationBreakdown) ?? parseAgeLimitSections(merged.ageLimit).ageRelaxationBreakdown,
    ageAsOnDate: merged.ageAsOnDate,
    ageLimitByGrade: ensureOptionalArray(merged.ageLimitByGrade) ?? parseAgeLimitSections(merged.ageLimit).ageLimitByGrade,
    ageLimitText: typeof merged.ageLimit === "string" ? merged.ageLimit : undefined,
    // Same gap as age above — there's no dedicated "Salary" section on
    // these sources at all (it's folded into the Post Details prose as
    // "Basic Pay: ₹24,050 – ₹64,480/- + allowances"), so this always
    // silently defaulted to 0/"As per rules" even when a real pay range
    // was sitting in postDetails.
    salaryMin: merged.salaryMin ?? deriveSalaryRange(merged.postDetails).salaryMin ?? 0,
    salaryMax: merged.salaryMax ?? deriveSalaryRange(merged.postDetails).salaryMax ?? 0,
    applicationFee: ensureApplicationFee(merged.applicationFee, {
      general: 0,
      reserved: 0,
      note: "See official notification",
    }),
    // Kept verbatim regardless of whether the two-number summary above
    // captured everything — a third PwBD/OH-only fee row, or a payment-
    // method footnote, has nowhere else to live.
    applicationFeeText: typeof merged.applicationFeeText === "string" ? merged.applicationFeeText : undefined,
    // These two are the exact field the bug that motivated this fix was
    // found in: a draft can carry a same-named field in the wrong shape
    // (e.g. a single joined string instead of an array of steps) —
    // `??` alone only catches null/undefined, not a wrong runtime type,
    // so a string sails straight through and crashes `.map()` on the
    // job page later. Validate the actual shape here, once, at the one
    // place new job records get created, rather than trusting every
    // future extraction source to always produce the right type.
    selectionProcess: ensureStringArray(
      merged.selectionProcess,
      parseSelectionSteps(merged.selectionProcess) ?? ["As per official notification"]
    ),
    // Kept verbatim alongside the reformatted version above — the
    // job page prefers rendering this actual table when it's present,
    // since selectionProcess is a lossy one-line-per-stage rewrite of
    // it built only for the plain numbered StepList.
    selectionProcessText: typeof merged.selectionProcess === "string" ? merged.selectionProcess : undefined,
    examPattern: merged.examPattern,
    examPatternNotes: ensureOptionalArray(merged.examPatternNotes),
    documentsRequired: merged.documentsRequired,
    syllabusSummary: merged.syllabusSummary,
    eligibilityDetails: ensureOptionalArray(merged.eligibilityDetails),
    // Captured unconditionally, unlike eligibilityDetails above (which
    // only exists if an admin kept the review page's textarea
    // populated) — so eligibility content is never silently lost just
    // because nobody edited that field before approving.
    eligibilityText: typeof merged.eligibility === "string" ? merged.eligibility : undefined,
    howToApply: ensureStringArray(merged.howToApply, [
      "See the official notification for the application procedure",
    ]),
    officialNotificationUrl:
      merged.officialNotificationUrl ??
      findLinkByKeywords(merged.importantLinks, NOTIFICATION_LINK_KEYWORDS) ??
      draft.sourceUrl,
    officialApplyUrl:
      merged.officialApplyUrl ?? findLinkByKeywords(merged.importantLinks, APPLY_LINK_KEYWORDS) ?? draft.sourceUrl,
    sourceUrl: draft.sourceUrl,
    importantLinks: ensureOptionalArray(merged.importantLinks),
    importantDates: ensureArray(merged.importantDates, []),
    // The bot hands this over as string[] (one "label | value" row per
    // entry, see importantDatesText in extractHtmlNotificationFields.ts)
    // — joined into the same single pipe-string convention
    // postDetailsText/ageLimitText use, so the job page can render it
    // with the exact same PipeTableOrText.
    importantDatesText: Array.isArray(merged.importantDatesText)
      ? (merged.importantDatesText as string[]).join(" || ")
      : typeof merged.importantDatesText === "string"
        ? merged.importantDatesText
        : undefined,
    eligibilityRules: ensureArray(merged.eligibilityRules, []),
    faqs: ensureOptionalArray(merged.faqs),
    conclusion: replaceSourceSitePlug(merged.conclusion),
    status: "published",
    createdByBot: true,
    publishedAt: now,
    updatedAt: now,
  };

  const { data: insertedJob, error: insertError } = await supabase
    .from("jobs")
    .insert(jobToRow(newJob))
    .select()
    .single();
  if (insertError) throw insertError;
  await markApproved();
  return { type: "job", entity: rowToJob(insertedJob) };
}

// ---- Bot ingestion ----

export async function draftExistsForSource(sourceUrl: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { count: draftCount, error: draftError } = await supabase
    .from("bot_drafts")
    .select("id", { count: "exact", head: true })
    .eq("source_url", sourceUrl);
  if (draftError) throw draftError;
  if ((draftCount ?? 0) > 0) return true;

  const { count: jobCount, error: jobError } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("source_url", sourceUrl);
  if (jobError) throw jobError;
  return (jobCount ?? 0) > 0;
}

export async function createDraft(input: {
  jobTitle: string;
  organization: string;
  sourceUrl: string;
  confidence: BotDraft["confidence"];
  draftType?: DraftType;
  extractedFields: Record<string, unknown>;
}): Promise<BotDraft> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("bot_drafts")
    .insert(
      draftToRow({
        jobTitle: input.jobTitle,
        organization: input.organization,
        sourceUrl: input.sourceUrl,
        detectedAt: new Date().toISOString(),
        status: "pending",
        confidence: input.confidence,
        draftType: input.draftType ?? "job",
        extractedFields: input.extractedFields,
      })
    )
    .select()
    .single();
  if (error) throw error;
  return rowToDraft(data);
}

// ---- Bot activity log ----

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

// ---- Dashboard stats ----

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

// ---- Home page "Hot Right Now" mixed feed ----

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