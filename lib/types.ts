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
  qualification: string;
  minAge: number;
  maxAge: number;
  ageRelaxation?: string;
  ageRelaxationBreakdown?: AgeRelaxationRow[];
  ageAsOnDate?: string; // ISO date — the reckoning/cut-off date age is calculated as on
  ageLimitByGrade?: AgeLimitRow[];
  salaryMin: number;
  salaryMax: number;
  applicationFee: {
    general: number;
    reserved: number;
    note?: string;
  };
  selectionProcess: string[];
  examPattern?: string;
  examPatternNotes?: string[]; // bullet notes below the exam pattern table, e.g. negative marking / merit-list rules
  documentsRequired?: string;
  syllabusSummary?: string;
  eligibilityDetails?: string[]; // per-post detailed eligibility bullets, beyond the single `qualification` summary
  howToApply: string[];
  officialNotificationUrl: string;
  officialApplyUrl: string;
  sourceUrl: string;
  importantLinks?: ImportantLink[];
  importantDates: ImportantDate[];
  eligibilityRules: EligibilityRule[];
  faqs?: FaqItem[];
  conclusion?: string;
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