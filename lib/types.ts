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
}

export interface AgeRelaxationRow {
  category: string;
  relaxation: string;
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
  salaryMin: number;
  salaryMax: number;
  applicationFee: {
    general: number;
    reserved: number;
    note?: string;
  };
  selectionProcess: string[];
  examPattern?: string;
  documentsRequired?: string;
  syllabusSummary?: string;
  howToApply: string[];
  officialNotificationUrl: string;
  officialApplyUrl: string;
  sourceUrl: string;
  importantLinks?: ImportantLink[];
  importantDates: ImportantDate[];
  eligibilityRules: EligibilityRule[];
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