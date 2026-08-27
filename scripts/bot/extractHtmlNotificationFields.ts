import { ExtractedStructuredFields } from "./extractStructuredFields";

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

  const fields: ExtractedStructuredFields = {
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