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
import { parsePipeTables, PipeTable, firstNumber, deriveAgeRange, deriveSalaryRange, TOTAL_ROW_LABEL } from "@/lib/pipeTables";
import { classifyQualification } from "@/lib/taxonomy";
import { isSourceSiteUrl } from "@/lib/utils";

// Re-exported so the admin draft review page (a client component,
// which can't import this server-only module) can compute the same
// smart pre-fill for its Min/Max Age and Salary inputs — these two are
// pure text parsers with no server dependency, so they live in the
// shared lib/pipeTables.ts and are just re-exported here for callers
// that already import data.ts for everything else.
export { deriveAgeRange, deriveSalaryRange };

// Re-exported so existing callers importing these from this module keep working.
export { isRecent, isClosingSoon, getApplicationEndDate };

// A migration can add several new columns at once (see
// 010_result_admitcard_notification_fields.sql, which added a dozen to
// results/admit_cards in one go) — the single-column-strip pattern
// earlier 42703 fallbacks used (delete just `source_order_key` and
// retry once) only ever handled exactly one specific column going
// missing. If a NEWLY-published field (e.g. applicationFee) is what's
// actually missing instead, that pattern fails the retry too, and
// approving a draft with any of this new content would 500 for every
// admin until the migration is run — worse than the older behavior it
// was meant to preserve. This generalizes it: parse the offending
// column's name straight out of Postgres's own error message, strip
// just that key, and retry, repeating (bounded) until the insert
// either succeeds or a 42703 comes back with no column this can
// identify — so a code deploy landing before its migration degrades to
// "the new fields aren't saved yet" rather than "nothing can be
// approved."
const UNDEFINED_COLUMN_PATTERN = /column\s+"?([a-zA-Z0-9_.]+)"?\s+(?:of relation "?[a-zA-Z0-9_]+"?\s+)?does not exist/i;

async function insertWithMissingColumnRetry<T>(
  // PromiseLike, not Promise — supabase-js's query builder is thenable
  // (awaitable) but isn't nominally a Promise (no .catch/.finally), so
  // a callback returning it directly (rather than an async function
  // wrapping it) wouldn't satisfy a stricter Promise<...> parameter type.
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
    if (!column || !(column in attemptRow)) return result; // can't identify/strip further — surface the error
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

// See TOTAL_ROW_LABEL's own comment (lib/pipeTables.ts) — shared with
// PipeTableOrText so a table's total row is recognized consistently
// wherever it turns up, not just here.
const VACANCY_TOTAL_ROW_LABEL = TOTAL_ROW_LABEL;

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

  // A table with MORE columns than label[, grade], total has genuine
  // category-wise sub-columns this summary shape has no way to
  // represent (e.g. a UR/SC/ST/OBC/EWS breakdown per division/post,
  // not just one number) — collapsing it down to a single total per
  // row would silently show LESS than the source publishes, exactly
  // the gap this site exists to avoid. Bailing out to `undefined` here
  // lets the caller fall back to postDetailsText's raw table instead,
  // which was always captured with every column intact regardless of
  // whether this function could summarize it.
  const expectedColumns = gradeColIndex > 0 ? 3 : 2;
  if (header.length > expectedColumns) return undefined;

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

  // A fresh builder each call — supabase-js's query builder can't be
  // safely re-ordered and re-awaited after its first execution (it
  // silently carries over the first attempt's ORDER BY rather than
  // replacing it), so the 42703 fallback below needs its own complete,
  // independently-built query, not a second .order() appended onto the
  // same base object.
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

  // source_order_key (see BotDraft.sourceOrderKey) reflects where the
  // source itself displays a posting — sorted first, nulls last so a
  // job with no bot origin doesn't jump to the top; published_at is
  // only the tiebreaker/fallback for those.
  let { data, error } = await buildQuery()
    .order("source_order_key", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false });
  if (error?.code === "42703") {
    // source_order_key column not migrated in yet (see
    // supabase/migrations/009_source_order_key.sql) — degrade to the
    // old sort alone instead of 500ing every job listing page load
    // until that migration is run; a code deploy and its migration
    // don't always land at the same instant.
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
  // Fresh builder per attempt — see getPublishedJobs's buildQuery comment.
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
  // Fresh builder per attempt — see getPublishedJobs's buildQuery comment.
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

// Drops any link that points back at the source site itself (see
// isSourceSiteUrl's own comment) — applied once, here, to the raw
// importantLinks list before it's either stored directly or scanned by
// findLinkByKeywords below, so a stray self-referential link (a "Home"
// / "View More" nav link the extractor picked up by mistake) can
// neither show up as its own sidebar button nor get matched as "the"
// apply/notification link.
function sanitizeImportantLinks(links: unknown): ImportantLink[] | undefined {
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

// Resolves to the first candidate that's both present and NOT the
// source site itself — used for officialApplyUrl/officialNotificationUrl
// /officialLink so a genuine external link (however it was found) wins
// over an accidental or absent one. Callers still fall back to
// draft.sourceUrl themselves as the true last resort when every
// candidate here comes back empty (there's nothing else to link to).
function firstExternalUrl(...candidates: (string | undefined)[]): string | undefined {
  for (const candidate of candidates) {
    if (candidate && !isSourceSiteUrl(candidate)) return candidate;
  }
  return undefined;
}

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

// Same shape check as ensureApplicationFee above, but for Result/
// AdmitCard, where there's no sensible non-zero fallback to force —
// unlike a Job, which always has an Application Fee section (with a
// "See official notification" placeholder when the source genuinely
// didn't publish one), a plain result/admit-card announcement often
// has no fee at all, and the page should simply not render that
// section rather than show a fabricated ₹0.
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

// Shared by the Result and AdmitCard approveDraft branches below —
// both bundle the exact same set of "full recruitment notification"
// fields (Fee, Age Limit, Vacancy, Selection Process) using the exact
// same HEADING_FIELD_MAP buckets Job already reads (see lib/types.ts's
// ResultItem/AdmitCardItem comments for why). Centralized here so the
// two branches can't drift out of parity with each other the way
// Result/AdmitCard as a whole drifted out of parity with Job.
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
    // Same "eligibility" bucket Job's own eligibilityText reads —
    // extracted for every source page regardless of draft type, but
    // never actually read into a Result/AdmitCard record until now.
    eligibilityText: typeof merged.eligibility === "string" ? merged.eligibility : undefined,
  };
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
    // The `& Record<string, unknown>` intersection (same trick the Job
    // branch below uses) is needed to read `howToApply` off `merged` —
    // that's the bot's raw, generic field name (shared with Job, since
    // extraction doesn't know or care what kind of posting a "How to
    // ..." section belongs to); ResultItem's own field for it is
    // `howToCheck`, renamed here to match what this section actually
    // is for a result rather than a job application.
    const merged = { ...cleanedExtractedFields, ...cleanedEdits } as Partial<ResultItem> & Record<string, unknown>;
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
          findLinkByKeywords(sanitizedLinks, NOTIFICATION_LINK_KEYWORDS),
          findLinkByKeywords(sanitizedLinks, APPLY_LINK_KEYWORDS),
          typeof merged.notificationPdfLink === "string" ? merged.notificationPdfLink : undefined,
          typeof merged.applyOnlineLink === "string" ? merged.applyOnlineLink : undefined,
          typeof merged.officialWebsiteLink === "string" ? merged.officialWebsiteLink : undefined
        ) ?? draft.sourceUrl,
      sourceUrl: draft.sourceUrl,
      importantDatesText: merged.importantDatesText,
      howToDownload: ensureOptionalArray(merged.howToApply),
      // "Documents Required" is the same heading/keyword bucket a job
      // posting's own document checklist uses — reused here for an
      // admit card's exam-day essentials (documents to carry, dress
      // code) since sources commonly publish that under the same kind
      // of heading right alongside the release announcement.
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

  // draftType === "job" (default, and the original Phase 3/4 behavior)
  // Partial<Job> alone rejects reading `postDetails` below — it's a
  // raw bot-only field (the postDetails pipe-table string) that never
  // becomes its own Job column; it only exists to be parsed into
  // vacancyBreakdown. The intersection lets known Job fields keep their
  // real types while still allowing that one raw read.
  const merged = { ...cleanedExtractedFields, ...cleanedEdits } as Partial<Job> & Record<string, unknown>;
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
    // merged.qualification only ever comes from the bot's crude
    // title-keyword guess (extractFields.ts) or an admin edit — most
    // titles don't literally contain a qualification word, so this
    // fell back to the generic "As per notification" string far more
    // often than not. Since that string isn't one of the taxonomy
    // buckets the eligibility checker compares against, it silently
    // defaulted to the LOWEST rank there — meaning every candidate,
    // regardless of what they selected, "passed" the qualification
    // check for a job the bot never actually classified. Trying the
    // full Eligibility section text (far more likely to actually state
    // the requirement) before falling back to the title itself fixes
    // that for the common case; "As per notification" only remains for
    // when neither source mentions a recognizable qualification level
    // at all — and the checker below now treats that honestly (as
    // "unknown", not "no requirement") rather than auto-passing it.
    qualification:
      merged.qualification ??
      classifyQualification(typeof merged.eligibility === "string" ? merged.eligibility : undefined) ??
      classifyQualification(title) ??
      "As per notification",
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
    // source_order_key column not migrated in yet (see
    // supabase/migrations/009_source_order_key.sql) — drop it and
    // retry rather than let every bot run fail to create any drafts
    // at all until that migration is run.
    delete row.source_order_key;
    ({ data, error } = await supabase.from("bot_drafts").insert(row).select().single());
  }
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

export interface BotRunSummary {
  ranAt: string;
  newCount: number;
  duplicateCount: number;
  expiredCount: number;
  errorCount: number;
}

// Matches the exact message run.ts logs once at the end of every run
// (see its own comment for why a dedicated summary entry exists at
// all) — kept in sync with that format by hand, since bot_log has no
// separate "kind" column to query by instead.
const RUN_SUMMARY_PATTERN =
  /^Bot run summary: (\d+) new draft\(s\), (\d+) duplicate\(s\) skipped, (\d+) expired skipped, (\d+) error\(s\)/;

/** The most recent full-run summary, for "when did the bot last run,
 * and how did it go" at a glance on the admin dashboard — as opposed
 * to getBotLog's raw per-source/per-draft entries, which a single run
 * can produce 100+ of and which bury this exact question immediately. */
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