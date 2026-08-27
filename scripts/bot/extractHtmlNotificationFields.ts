import { ExtractedStructuredFields, extractStructuredFields } from "./extractStructuredFields";

/**
 * Sites like biharjob.co.in put every structured field directly in the
 * post's own HTML (as a run of "<h2>Important Dates</h2><table>...")
 * rather than in a linked PDF — parsePdf.ts / extractStructuredFields.ts
 * only fire on PDFs, so a source like this needs its own pass that reads
 * the *page* instead. Deliberately regex-over-raw-HTML, matching the
 * style of extractTableCandidates.ts, rather than pulling in a DOM
 * parser dependency for one extra source.
 */

const HEADING_PATTERN = /<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi;
const TABLE_PATTERN = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
const ROW_PATTERN = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
const CELL_PATTERN = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
const LIST_ITEM_PATTERN = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
const LINK_PATTERN = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// English + Hindi keyword match, same idea as the site's own bilingual
// headings ("Important Dates / महत्वपूर्ण तिथियां") — matched loosely by
// substring so slight heading variants ("Important Dates for X 2026")
// still classify correctly.
const HEADING_FIELD_MAP: { field: keyof ParsedSections; keywords: string[] }[] = [
  { field: "importantDatesRaw", keywords: ["important dates", "महत्वपूर्ण तिथ"] },
  { field: "applicationFeeRaw", keywords: ["application fee", "आवेदन शुल्क"] },
  { field: "ageLimitRaw", keywords: ["age limit", "आयु सीमा"] },
  { field: "postDetailsRaw", keywords: ["post details", "vacancy", "seat distribution", "पद विवरण", "सीट वितरण"] },
  { field: "eligibilityRaw", keywords: ["eligibility", "योग्यता"] },
  { field: "selectionProcessRaw", keywords: ["selection process", "चयन प्रक्रिया"] },
  { field: "howToApplyRaw", keywords: ["how to apply", "आवेदन कैसे करें"] },
  { field: "importantLinksRaw", keywords: ["important links", "महत्वपूर्ण लिंक"] },
];

// --- Hindi/English canonical date-field mapping --------------------------
// The PDF pipeline's DATE_LABELS in extractStructuredFields.ts only
// matches English phrasing ("last date", "exam date", ...), which never
// appears in this site's mostly-Hindi date table rows. Since we already
// have each row split cleanly as "label | value" (from tableToPairs),
// classifying by the row's OWN label text is far more reliable than
// running generic regex over a wall of free text — so this works off
// the parsed rows directly rather than reusing the PDF-oriented matcher.
const HINDI_MONTHS: Record<string, number> = {
  "जनवरी": 1, "फरवरी": 2, "मार्च": 3, "अप्रैल": 4, "मई": 5, "जून": 6,
  "जुलाई": 7, "अगस्त": 8, "सितंबर": 9, "सितम्बर": 9, "अक्टूबर": 10,
  "नवंबर": 11, "नवम्बर": 11, "दिसंबर": 12, "दिसम्बर": 12,
};
const ENGLISH_MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};
const HINDI_DATE_PATTERN = new RegExp(
  `(\\d{1,2})\\s+(${Object.keys(HINDI_MONTHS).join("|")})\\s+(\\d{4})`
);
const NUMERIC_DATE_PATTERN = /(\d{1,2})\s*[/\-.]\s*(\d{1,2}|[A-Za-z]{3,9})\s*[/\-.]\s*(\d{2,4})/;

function parseAnyDate(text: string): string | null {
  const hindiMatch = text.match(HINDI_DATE_PATTERN);
  if (hindiMatch) {
    const day = parseInt(hindiMatch[1], 10);
    const month = HINDI_MONTHS[hindiMatch[2]];
    const year = parseInt(hindiMatch[3], 10);
    if (day && month && year) return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const numMatch = text.match(NUMERIC_DATE_PATTERN);
  if (numMatch) {
    const day = parseInt(numMatch[1], 10);
    const monthRaw = numMatch[2].toLowerCase();
    const month = ENGLISH_MONTHS[monthRaw] ?? parseInt(monthRaw, 10);
    let year = parseInt(numMatch[3], 10);
    if (year < 100) year += 2000;
    if (day && month && year && day <= 31 && month <= 12) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  return null;
}

// Order matters: more specific/exclusionary checks first, so e.g. a fee
// payment deadline row doesn't get misread as the general application
// deadline, and a pre-exam training row doesn't get misread as the exam
// date itself.
const CANONICAL_DATE_RULES: { label: string; include: string[]; exclude?: string[] }[] = [
  { label: "Correction Date", include: ["सुधार", "एडिट", "correction", "edit window"] },
  {
    label: "Admit Card Release",
    include: ["प्रवेश पत्र", "एडमिट कार्ड", "admit card"],
  },
  { label: "Result Date", include: ["परिणाम", "result"] },
  {
    label: "Exam Date",
    include: ["परीक्षा", "exam"],
    exclude: ["पूर्व", "प्रशिक्षण", "training", "परिणाम"],
  },
  {
    label: "Application End",
    include: ["अंतिम तिथि", "last date", "closing date"],
    exclude: ["शुल्क", "fee"],
  },
  {
    label: "Application Start",
    include: ["प्रारंभ तिथि", "शुरू", "start date", "registration start"],
    exclude: ["शुल्क", "fee", "सुधार"],
  },
];

function classifyDateRow(label: string): string | null {
  const lower = label.toLowerCase();
  for (const rule of CANONICAL_DATE_RULES) {
    const included = rule.include.some((kw) => lower.includes(kw.toLowerCase()));
    if (!included) continue;
    const excluded = rule.exclude?.some((kw) => lower.includes(kw.toLowerCase()));
    if (excluded) continue;
    return rule.label;
  }
  return null;
}

/**
 * Converts raw "label | value" important-dates rows (Hindi or English)
 * into the canonical {label, date} shape the review-draft form's
 * APPLICATION START / APPLICATION END / CORRECTION DATE / EXAM DATE /
 * ADMIT CARD RELEASE / RESULT DATE inputs expect — same shape the PDF
 * pipeline already produces, so both paths feed the same form fields.
 * First matching row wins per canonical label (e.g. Prelims exam date
 * beats Mains, since the form only has one Exam Date slot).
 */
function extractCanonicalDates(rows: string[]): { label: string; date: string }[] {
  const results: { label: string; date: string }[] = [];
  for (const row of rows) {
    const [rowLabel, ...rest] = row.split(" | ");
    if (!rowLabel) continue;
    const canonical = classifyDateRow(rowLabel);
    if (!canonical || results.some((r) => r.label === canonical)) continue;
    const valueText = rest.join(" ");
    const date = parseAnyDate(valueText) ?? parseAnyDate(row);
    if (date) results.push({ label: canonical, date });
  }
  return results;
}

const FEE_AMOUNT_PATTERN = /(?:₹|rs\.?|inr)\s*[.:]?\s*([\d,]{2,7})/i;

/**
 * Converts raw fee-table rows into {general, reserved} numbers, the
 * same shape the PDF pipeline's applicationFee field uses. Matches
 * English abbreviations (General/OBC/EWS, SC/ST/PwBD) since those
 * appear in parentheses even in otherwise-Hindi category labels on
 * this site, plus the Hindi category words directly as a fallback.
 */
function extractCanonicalFee(rows: string[]): { general?: number; reserved?: number } {
  const fee: { general?: number; reserved?: number } = {};
  for (const row of rows) {
    const lower = row.toLowerCase();
    const amountMatch = row.match(FEE_AMOUNT_PATTERN);
    if (!amountMatch) continue;
    const amount = parseInt(amountMatch[1].replace(/,/g, ""), 10);
    if (!amount) continue;

    const isGeneral = /general|obc|ews|unreserved|सामान्य|ओबीसी/.test(lower);
    const isReserved = /sc\s*\/?\s*st|pwbd|pwd|reserved|एससी|एसटी|दिव्यांग/.test(lower);

    if (isReserved && fee.reserved === undefined) {
      fee.reserved = amount;
    } else if (isGeneral && fee.general === undefined) {
      fee.general = amount;
    }
  }
  return fee;
}

/**
 * Pulls a total vacancy count out of the post-details/vacancy table —
 * looks for a "Total Post(s)"/"कुल पद"/"कुल योग" style row or
 * parenthetical number, same field the PDF pipeline's totalVacancies
 * uses.
 */
function extractCanonicalVacancies(rows: string[]): number | undefined {
  const combined = rows.join(" ");
  const patterns = [
    /(?:total\s*post|total\s*vacanc\w*|कुल\s*पद|कुल\s*योग)[^\d]{0,25}(\d[\d,]{1,7})/i,
    /\(\s*(\d[\d,]{2,7})\s*\)/, // a bare parenthetical count, e.g. "Total Post ( 11403 )"
  ];
  for (const pattern of patterns) {
    const match = combined.match(pattern);
    if (match) {
      const n = parseInt(match[1].replace(/,/g, ""), 10);
      if (n) return n;
    }
  }
  return undefined;
}

interface ParsedSections {
  importantDatesRaw: string[];
  applicationFeeRaw: string[];
  ageLimitRaw: string[];
  postDetailsRaw: string[];
  eligibilityRaw: string[];
  selectionProcessRaw: string[];
  howToApplyRaw: string[];
  importantLinksRaw: { label: string; url: string }[];
}

function classifyHeading(headingText: string): keyof ParsedSections | null {
  const lower = headingText.toLowerCase();
  for (const { field, keywords } of HEADING_FIELD_MAP) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) return field;
  }
  return null;
}

function tableToPairs(tableHtml: string): string[] {
  const rows: string[] = [];
  const rowPattern = new RegExp(ROW_PATTERN.source, "gi");
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowPattern.exec(tableHtml)) !== null) {
    const cellPattern = new RegExp(CELL_PATTERN.source, "gi");
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellPattern.exec(rowMatch[1])) !== null) {
      const text = stripTags(cellMatch[1]);
      if (text) cells.push(text);
    }
    if (cells.length > 0) rows.push(cells.join(" | "));
  }
  return rows;
}

function listToItems(listHtml: string): string[] {
  const items: string[] = [];
  const liPattern = new RegExp(LIST_ITEM_PATTERN.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = liPattern.exec(listHtml)) !== null) {
    const text = stripTags(m[1]);
    if (text) items.push(text);
  }
  return items;
}

function extractLinkPairs(sectionHtml: string): { label: string; url: string }[] {
  // Prefer table-row form (label cell + link cell), same layout the site
  // actually uses for its "Important Links" table; fall back to any raw
  // anchor in the section if it isn't a table.
  const pairs: { label: string; url: string }[] = [];
  const tablePattern = new RegExp(TABLE_PATTERN.source, "gi");
  let tableMatch: RegExpExecArray | null;
  let sawTable = false;

  while ((tableMatch = tablePattern.exec(sectionHtml)) !== null) {
    sawTable = true;
    const rowPattern = new RegExp(ROW_PATTERN.source, "gi");
    let rowMatch: RegExpExecArray | null;
    while ((rowMatch = rowPattern.exec(tableMatch[1])) !== null) {
      const cellPattern = new RegExp(CELL_PATTERN.source, "gi");
      const cellHtmls: string[] = [];
      let cellMatch: RegExpExecArray | null;
      while ((cellMatch = cellPattern.exec(rowMatch[1])) !== null) {
        cellHtmls.push(cellMatch[1]);
      }
      if (cellHtmls.length < 2) continue;
      const label = stripTags(cellHtmls[0]);
      const linkPattern = new RegExp(LINK_PATTERN.source, "i");
      const linkMatch = cellHtmls[1].match(linkPattern);
      if (label && linkMatch) pairs.push({ label, url: linkMatch[1] });
    }
  }

  if (!sawTable) {
    const linkPattern = new RegExp(LINK_PATTERN.source, "gi");
    let m: RegExpExecArray | null;
    while ((m = linkPattern.exec(sectionHtml)) !== null) {
      pairs.push({ label: stripTags(m[2]) || "link", url: m[1] });
    }
  }

  return pairs;
}

function guessLink(pairs: { label: string; url: string }[], keywords: string[]): string | undefined {
  const found = pairs.find((p) => keywords.some((kw) => p.label.toLowerCase().includes(kw)));
  return found?.url;
}

/**
 * Splits the body HTML into segments by heading, classifies each
 * heading (English/Hindi), and pulls the table/list content out of the
 * segment that follows it — mirroring how a human reads the page
 * top-to-bottom and buckets each block under the heading above it.
 */
function parseSections(html: string): ParsedSections {
  const sections: ParsedSections = {
    importantDatesRaw: [],
    applicationFeeRaw: [],
    ageLimitRaw: [],
    postDetailsRaw: [],
    eligibilityRaw: [],
    selectionProcessRaw: [],
    howToApplyRaw: [],
    importantLinksRaw: [],
  };

  const headingPositions: { field: keyof ParsedSections | null; start: number; end: number }[] = [];
  const headingPattern = new RegExp(HEADING_PATTERN.source, "gi");
  let headingMatch: RegExpExecArray | null;
  while ((headingMatch = headingPattern.exec(html)) !== null) {
    headingPositions.push({
      field: classifyHeading(stripTags(headingMatch[1])),
      start: headingMatch.index,
      end: headingPattern.lastIndex,
    });
  }

  for (let i = 0; i < headingPositions.length; i++) {
    const { field, end } = headingPositions[i];
    if (!field) continue;
    const segmentEnd = i + 1 < headingPositions.length ? headingPositions[i + 1].start : html.length;
    const segment = html.slice(end, segmentEnd);

    if (field === "importantLinksRaw") {
      sections.importantLinksRaw.push(...extractLinkPairs(segment));
      continue;
    }
    if (field === "howToApplyRaw") {
      // "How to Apply" is almost always a numbered <ol>, not a table
      const listMatch = segment.match(/<ol\b[^>]*>([\s\S]*?)<\/ol>/i);
      sections[field].push(...(listMatch ? listToItems(listMatch[1]) : []));
      continue;
    }

    const tablePattern = new RegExp(TABLE_PATTERN.source, "gi");
    let tableMatch: RegExpExecArray | null;
    while ((tableMatch = tablePattern.exec(segment)) !== null) {
      sections[field].push(...tableToPairs(tableMatch[1]));
    }
  }

  return sections;
}

export interface HtmlNotificationExtraction {
  organization?: string;
  fields: ExtractedStructuredFields;
}

/**
 * Entry point: given a detail page's raw HTML (a page like biharjob.co.in
 * publishes for each job/result/admit-card post), returns the org name
 * guessed from the first notification table plus a populated
 * ExtractedStructuredFields — same shape run.ts already merges in from
 * PDF extraction, so this plugs into the existing pipeline without
 * changing anything downstream of extractFields.ts.
 */
export function extractHtmlNotificationFields(html: string): HtmlNotificationExtraction {
  const sections = parseSections(html);

  // The very first table on the page is the notification header block
  // (e.g. "EAST COAST RAILWAY (ECoR)") on every post on this site —
  // grabbed the same way before any classified heading is reached.
  let organization: string | undefined;
  const firstTableMatch = html.match(/<table\b[^>]*>([\s\S]*?)<\/table>/i);
  if (firstTableMatch) {
    const firstRowMatch = firstTableMatch[1].match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i);
    if (firstRowMatch) organization = stripTags(firstRowMatch[1]) || undefined;
  }

  const importantLinks = sections.importantLinksRaw;

  const sectionsHadAnyMatch =
    sections.importantDatesRaw.length > 0 ||
    sections.applicationFeeRaw.length > 0 ||
    sections.ageLimitRaw.length > 0 ||
    sections.postDetailsRaw.length > 0 ||
    sections.eligibilityRaw.length > 0 ||
    sections.selectionProcessRaw.length > 0 ||
    sections.howToApplyRaw.length > 0 ||
    importantLinks.length > 0;

  // Heading-based bucketing depends on this site's actual markup lining
  // up with the assumptions above (h2/h3 immediately followed by a
  // table/list). If a theme change or an unusual post layout means none
  // of that matched at all, fall back to the same plain-text pattern
  // matching used for PDFs (findDatesNearLabels / findApplicationFee /
  // findTotalVacancies via extractStructuredFields) run directly against
  // this page's own visible text — cruder, but far better than
  // returning nothing.
  const fallbackFields: ExtractedStructuredFields = sectionsHadAnyMatch
    ? {}
    : extractStructuredFields(stripTags(html));

  const fields: ExtractedStructuredFields = {
    ...fallbackFields,
    ...(sections.importantDatesRaw.length ? { importantDatesText: sections.importantDatesRaw } : {}),
    ...(sections.applicationFeeRaw.length ? { applicationFeeText: sections.applicationFeeRaw } : {}),
    ...(sections.ageLimitRaw.length ? { ageLimit: sections.ageLimitRaw.join(" || ") } : {}),
    ...(sections.postDetailsRaw.length ? { postDetails: sections.postDetailsRaw.join(" || ") } : {}),
    ...(sections.eligibilityRaw.length ? { eligibility: sections.eligibilityRaw.join(" || ") } : {}),
    ...(sections.selectionProcessRaw.length ? { selectionProcess: sections.selectionProcessRaw.join(" || ") } : {}),
    ...(sections.howToApplyRaw.length ? { howToApply: sections.howToApplyRaw } : {}),
    ...(importantLinks.length ? { importantLinks } : {}),
    ...(guessLink(importantLinks, ["apply online", "apply now", "online form", "click here"])
      ? { applyOnlineLink: guessLink(importantLinks, ["apply online", "apply now", "online form", "click here"]) }
      : {}),
    ...(guessLink(importantLinks, ["notification", "download pdf", "pdf"])
      ? { notificationPdfLink: guessLink(importantLinks, ["notification", "download pdf", "pdf"]) }
      : {}),
    ...(guessLink(importantLinks, ["official website", "official portal"])
      ? { officialWebsiteLink: guessLink(importantLinks, ["official website", "official portal"]) }
      : {}),
  };

  return { organization, fields };
}