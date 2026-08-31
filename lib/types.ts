export type JobStatus = "draft" | "published" | "closed";

export interface ImportantDate {
  label: string;
  date: string;
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
  grade?: string;
}

export interface AgeRelaxationRow {
  category: string;
  relaxation: string;
}

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

export type AdditionalSectionKind = "table" | "list" | "links" | "dates" | "chips" | "text";

export type TableCellValue =
  | { type: "text"; value: string }
  | { type: "link"; label: string; url: string }
  | { type: "button"; label: string; url: string }
  | { type: "list"; items: string[] };

export interface AdditionalSection {
  heading: string;
  kind?: AdditionalSectionKind;
  content?: string;
  tableHeader?: string[];
  tableRows?: TableCellValue[][];
  links?: ImportantLink[];
  dates?: ImportantDate[];
  chips?: string[];
}

export interface Job {
  id: string;
  slug: string;
  state: string;
  title: string;
  shortInfo: string;
  organization: string;
  department: string;
  category: string;
  tags?: string[];
  totalVacancies: number;
  vacancyBreakdown?: VacancyBreakdown[];
  postDetailsText?: string;
  qualification: string;
  minAge: number;
  maxAge: number;
  ageRelaxation?: string;
  ageRelaxationBreakdown?: AgeRelaxationRow[];
  ageAsOnDate?: string;
  ageLimitByGrade?: AgeLimitRow[];
  ageLimitText?: string;
  salaryMin: number;
  salaryMax: number;
  applicationFee: {
    general: number;
    reserved: number;
    note?: string;
  };
  applicationFeeText?: string;
  selectionProcess: string[];
  selectionProcessText?: string;
  examPattern?: string;
  examPatternNotes?: string[];
  documentsRequired?: string;
  syllabusSummary?: string;
  eligibilityDetails?: string[];
  eligibilityText?: string;
  howToApply: string[];
  officialNotificationUrl: string;
  officialApplyUrl: string;
  sourceUrl: string;
  importantLinks?: ImportantLink[];
  importantDates: ImportantDate[];
  importantDatesText?: string;
  eligibilityRules: EligibilityRule[];
  faqs?: FaqItem[];
  conclusion?: string;
  additionalSections?: AdditionalSection[];
  sectionOrder?: string[];
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
  tags?: string[];
  resultDate: string;
  officialLink: string;
  sourceUrl: string;
  summary: string;
  importantDatesText?: string;
  howToCheck?: string[];
  cutoffText?: string;
  totalVacancies?: number;
  vacancyBreakdown?: VacancyBreakdown[];
  postDetailsText?: string;
  ageLimitByGrade?: AgeLimitRow[];
  ageRelaxationBreakdown?: AgeRelaxationRow[];
  ageLimitText?: string;
  applicationFee?: { general: number; reserved: number; note?: string };
  applicationFeeText?: string;
  selectionProcess?: string[];
  selectionProcessText?: string;
  examPattern?: string;
  examPatternNotes?: string[];
  documentsRequired?: string;
  eligibilityText?: string;
  importantLinks?: ImportantLink[];
  faqs?: FaqItem[];
  conclusion?: string;
  additionalSections?: AdditionalSection[];
  sectionOrder?: string[];
  sourceOrderKey?: number;
}

export interface AdmitCardItem {
  id: string;
  slug: string;
  title: string;
  organization: string;
  category: string;
  tags?: string[];
  examDate: string;
  releaseDate: string;
  officialLink: string;
  sourceUrl: string;
  importantDatesText?: string;
  howToDownload?: string[];
  examDayInstructionsText?: string;
  examPattern?: string;
  examPatternNotes?: string[];
  totalVacancies?: number;
  vacancyBreakdown?: VacancyBreakdown[];
  postDetailsText?: string;
  ageLimitByGrade?: AgeLimitRow[];
  ageRelaxationBreakdown?: AgeRelaxationRow[];
  ageLimitText?: string;
  applicationFee?: { general: number; reserved: number; note?: string };
  applicationFeeText?: string;
  selectionProcess?: string[];
  selectionProcessText?: string;
  eligibilityText?: string;
  importantLinks?: ImportantLink[];
  faqs?: FaqItem[];
  conclusion?: string;
  additionalSections?: AdditionalSection[];
  sectionOrder?: string[];
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
  origin: "bot" | "manual";
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