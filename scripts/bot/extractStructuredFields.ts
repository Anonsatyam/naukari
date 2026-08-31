export interface ExtractedStructuredFields {
  importantDates?: { label: string; date: string }[];
  applicationFee?: { general?: number; reserved?: number };
  totalVacancies?: number;

  importantDatesText?: string;
  applicationFeeText?: string;
  ageLimit?: string;
  postDetails?: string;
  eligibility?: string;
  selectionProcess?: string;
  howToApply?: string[];
  importantLinks?: { label: string; url: string }[];
  applyOnlineLink?: string;
  notificationPdfLink?: string;
  officialWebsiteLink?: string;
  documentsRequired?: string;
  examPattern?: string;

  faqText?: string[];
  conclusionText?: string;

  genericSections?: { heading: string; content: string }[];

  sectionOrder?: string[];

  verification?: { sourceHeadingCount: number; capturedHeadingCount: number; possibleGap: boolean };
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};

function normalizeDate(day: string, monthRaw: string, year: string): string | null {
  const monthLower = monthRaw.toLowerCase();
  const month = MONTH_NAMES[monthLower] ?? parseInt(monthRaw, 10);
  const d = parseInt(day, 10);
  let y = parseInt(year, 10);
  if (y < 100) y += 2000;

  if (!month || month < 1 || month > 12 || !d || d < 1 || d > 31 || !y) return null;

  return `${y}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const DATE_PATTERN =
  /(\d{1,2})\s*[/\-.\s]\s*([A-Za-z]{3,9}|\d{1,2})\s*[/\-.,\s]+\s*(\d{2,4})/;

const DATE_LABELS: { label: string; pattern: RegExp }[] = [
  { label: "Application Start", pattern: /application\s+(begin|start)|registration\s+start|online\s+registration\s+start/i },
  { label: "Application End", pattern: /last\s+date|closing\s+date|application\s+(end|last)|apply\s+by|apply\s+online\s+last/i },
  { label: "Correction Date", pattern: /correction\s+(date|last\s+date|last)/i },
  { label: "Exam Date", pattern: /exam\s+date|examination\s+date|written\s+(test|exam)\s+date/i },
  { label: "Admit Card Release", pattern: /admit\s+card\s+(available|release|download|issue)/i },
  { label: "Result Date", pattern: /result\s+(date|declar)/i },
];

function findDatesNearLabels(text: string): { label: string; date: string }[] {
  const results: { label: string; date: string }[] = [];
  const lines = text.split(/\r?\n/);

  for (const { label, pattern } of DATE_LABELS) {
    for (const line of lines) {
      if (!pattern.test(line)) continue;
      const match = line.match(DATE_PATTERN);
      if (!match) continue;
      const iso = normalizeDate(match[1], match[2], match[3]);
      if (iso && !results.some((r) => r.label === label)) {
        results.push({ label, date: iso });
      }
      break;
    }
  }
  return results;
}

const FEE_AMOUNT = /(?:rs\.?|₹|inr)\s*[.:]?\s*(\d{1,5})/i;

function findApplicationFee(text: string): { general?: number; reserved?: number } {
  const fee: { general?: number; reserved?: number } = {};
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    if (!/fee/i.test(line)) continue;
    const match = line.match(FEE_AMOUNT);
    if (!match) continue;
    const amount = parseInt(match[1], 10);

    if (/general|ews|unreserved|obc/i.test(line) && fee.general === undefined) {
      fee.general = amount;
    } else if (/sc\s*\/?\s*st|reserved|pwd|ph\b/i.test(line) && fee.reserved === undefined) {
      fee.reserved = amount;
    }
  }
  return fee;
}

const VACANCY_PATTERN_A = /(\d{1,6})[ \t]*(?:total[ \t]+)?(?:vacancies|vacancy|posts?)\b/i;
const VACANCY_PATTERN_B = /(?:total[ \t]+)?(?:vacancies|vacancy|posts?)[ \t]*[:\-]?[ \t]*(\d{1,6})/i;

function findTotalVacancies(text: string): number | undefined {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const b = line.match(VACANCY_PATTERN_B);
    if (b) return parseInt(b[1], 10);
  }
  for (const line of lines) {
    const a = line.match(VACANCY_PATTERN_A);
    if (a) return parseInt(a[1], 10);
  }
  return undefined;
}

export function extractStructuredFields(text: string): ExtractedStructuredFields {
  if (!text || text.trim().length === 0) return {};

  const importantDates = findDatesNearLabels(text);
  const applicationFee = findApplicationFee(text);
  const totalVacancies = findTotalVacancies(text);

  return {
    ...(importantDates.length > 0 ? { importantDates } : {}),
    ...(Object.keys(applicationFee).length > 0 ? { applicationFee } : {}),
    ...(totalVacancies !== undefined ? { totalVacancies } : {}),
  };
}