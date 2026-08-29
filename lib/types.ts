export type JobStatus = "draft" | "published" | "closed";

export interface ImportantDate {
  label: string;
  date: string; // ISO date string
}

export interface EligibilityRule {
  id: string;
  label: string;
  type: "education" | "age" | "experience" | "other";
  description: string;
}

export interface VacancyBreakdown {
  category: string;
  count: number;
  grade?: string; // e.g. "MMG/S-II" — the post's grade/scale, when the source table has one
}

export interface AgeRelaxationRow {
  category: string;
  relaxation: string;
}

// Cadre/grade-wise minimum-maximum age table (e.g. Officer 23–35,
// Manager 23–37) — distinct from AgeRelaxationRow, which is the
// category-wise (SC/ST/OBC/PwBD) *relaxation* applied on top of these.
// Kept as free text rather than numbers since sources routinely qualify
// a value ("23 से 25 वर्ष", "35–37 (पदवार)").
export interface AgeLimitRow {
  grade: string;
  minAge: string;
  maxAge: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ImportantLink {
  label: string;
  url: string;
}

// A source's own section that doesn't map to any of the specific
// fields below — e.g. "Physical Eligibility", "Reservation Policy",
// or literally anything else a source publishes that nobody's added a
// dedicated field for. Rendered generically, titled with the source's
// own heading text, on all three detail pages — see
// components/DetailSections.tsx's PipeTableOrText, which already
// handles both table- and list-shaped content. Shared across Job,
// ResultItem, and AdmitCardItem so every entity type gets this the
// same way, per the site's own philosophy of building the page from
// whatever data is actually there instead of a fixed template.
export interface AdditionalSection {
  heading: string;
  content: string;
}

export interface Job {
  id: string;
  slug: string;
  state: string; // e.g. "Bihar" — data-driven, never hardcoded in logic
  title: string;
  shortInfo: string;
  organization: string;
  department: string;
  category: string; // e.g. "Police", "Teaching", "Banking", "Engineering"
  totalVacancies: number;
  vacancyBreakdown?: VacancyBreakdown[];
  // Raw "cell | cell || row || row" post-details table, kept verbatim as
  // a fallback for when the source table isn't a category→count shape
  // parseVacancyBreakdown can turn into vacancyBreakdown (e.g. a single
  // post-name/pay-scale/participating-banks row with no per-category
  // numbers at all) — rendered as a plain table instead of the section
  // silently not appearing.
  postDetailsText?: string;
  qualification: string;
  minAge: number;
  maxAge: number;
  ageRelaxation?: string;
  ageRelaxationBreakdown?: AgeRelaxationRow[];
  ageAsOnDate?: string; // ISO date — the reckoning/cut-off date age is calculated as on
  ageLimitByGrade?: AgeLimitRow[];
  // Raw "Age Limit" table, kept verbatim as a fallback for whenever
  // parseAgeLimitSections can't confidently split it into
  // ageLimitByGrade/ageRelaxationBreakdown — same role as
  // postDetailsText above.
  ageLimitText?: string;
  salaryMin: number;
  salaryMax: number;
  applicationFee: {
    general: number;
    reserved: number;
    note?: string;
  };
  // Raw fee table verbatim, as a fallback/full display for whenever the
  // source publishes more than a plain general/reserved split (a third
  // PwBD/OH-only row, a payment-method footnote, ...) that the two
  // summary numbers above can't represent on their own.
  applicationFeeText?: string;
  selectionProcess: string[];
  // Raw "Selection Process" table verbatim — selectionProcess above is
  // a lossy one-line-per-stage rendering of it (built for the plain
  // numbered StepList, which has no table of its own); shown instead of
  // that when available, since it's literally what the source
  // published rather than a reformatting of it.
  selectionProcessText?: string;
  examPattern?: string;
  examPatternNotes?: string[]; // bullet notes below the exam pattern table, e.g. negative marking / merit-list rules
  documentsRequired?: string;
  syllabusSummary?: string;
  eligibilityDetails?: string[]; // per-post detailed eligibility bullets, beyond the single `qualification` summary
  // Raw "Eligibility" table/list verbatim — eligibilityDetails above is
  // an admin-curated bullet list seeded from this but requires manual
  // review-page action to keep; this is captured automatically on
  // every approval regardless, so eligibility content is never lost
  // just because nobody edited that textarea.
  eligibilityText?: string;
  howToApply: string[];
  officialNotificationUrl: string;
  officialApplyUrl: string;
  sourceUrl: string;
  importantLinks?: ImportantLink[];
  importantDates: ImportantDate[];
  // Raw "label | value" dates table, kept verbatim as a fallback/full
  // display for the job page's "Important Dates" section. `importantDates`
  // above only ever holds the handful of canonical, fully-parsed dates
  // (Application Start/End, Exam Date, ...) needed for closing-soon
  // logic and the eligibility checker — a source's actual dates table
  // routinely has several more rows than that (PET, provisional
  // allotment, a month-only "September 2026" with no day, an edit
  // window given as relative text) that never fit the canonical shape
  // and were silently dropped before this field existed.
  importantDatesText?: string;
  eligibilityRules: EligibilityRule[];
  faqs?: FaqItem[];
  conclusion?: string;
  additionalSections?: AdditionalSection[];
  // See BotDraft.sourceOrderKey — carried through on approval and used
  // to sort the public listing by the source's own order.
  sourceOrderKey?: number;
  status: JobStatus;
  createdByBot: boolean;
  publishedAt: string;
  updatedAt: string;
}

export interface ResultItem {
  id: string;
  slug: string;
  title: string;
  organization: string;
  category: string;
  resultDate: string;
  officialLink: string;
  sourceUrl: string;
  summary: string;
  // Raw "label | value" dates table (declaration date, document
  // verification / interview call-letter dates, next-round dates) —
  // same TABLE_SEP/pipe convention as the Job type's importantDatesText,
  // rendered the same way. Kept as free text rather than a canonical
  // array since a result's own set of relevant dates varies a lot more
  // than a job posting's fixed Application Start/End shape.
  importantDatesText?: string;
  // "How to Check Result" steps, when the source publishes a
  // step-by-step procedure rather than just a direct link.
  howToCheck?: string[];
  // Raw merit-list/cutoff table verbatim, when the source publishes
  // category-wise cutoff marks alongside the result declaration.
  cutoffText?: string;
  importantLinks?: ImportantLink[];
  faqs?: FaqItem[];
  conclusion?: string;
  additionalSections?: AdditionalSection[];
  sourceOrderKey?: number;
}

export interface AdmitCardItem {
  id: string;
  slug: string;
  title: string;
  organization: string;
  category: string;
  examDate: string;
  releaseDate: string;
  officialLink: string;
  sourceUrl: string;
  // Same raw pipe-table convention as ResultItem.importantDatesText —
  // exam date, admit card download window, exam-day reporting time.
  importantDatesText?: string;
  // "How to Download Admit Card" steps.
  howToDownload?: string[];
  // Exam-day essentials (documents to carry, reporting time, dress
  // code) when the source publishes them alongside the release
  // announcement — kept as the raw pipe-table/plain-text the extractor
  // already produces for this kind of section.
  examDayInstructionsText?: string;
  examPattern?: string;
  importantLinks?: ImportantLink[];
  faqs?: FaqItem[];
  conclusion?: string;
  additionalSections?: AdditionalSection[];
  sourceOrderKey?: number;
}

export type DraftType = "job" | "result" | "admit_card";

export interface BotDraft {
  id: string;
  jobTitle: string;
  organization: string;
  sourceUrl: string;
  detectedAt: string;
  status: "pending" | "approved" | "rejected";
  confidence: "high" | "medium" | "low";
  draftType: DraftType;
  // Encodes this posting's position in the source's own listing at
  // crawl time — see scripts/bot/run.ts for how it's computed. Carried
  // through to the published Job/Result/AdmitCard record and used to
  // sort the public listing pages, so their order matches the source's
  // own top-to-bottom order regardless of what order an admin happens
  // to approve drafts in (publishedAt/resultDate/releaseDate reflect
  // approval time or a parsed content date, neither of which is the
  // same thing as "where the source displays it").
  sourceOrderKey?: number;
  extractedFields: Record<string, unknown>;
}

export interface HotUpdateItem {
  type: "Job" | "Result" | "Admit Card";
  href: string;
  title: string;
  organization: string;
  category: string;
  date: string;
  isNew: boolean;
}

export interface BotLogEntry {
  id: string;
  timestamp: string;
  status: "success" | "warning" | "error";
  message: string;
}