import { ExtractedStructuredFields, extractStructuredFields } from "./extractStructuredFields";
import { TABLE_SEP } from "../../lib/pipeTables";


const HEADING_PATTERN = /<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi;
const TABLE_PATTERN = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
const ROW_PATTERN = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
const CELL_PATTERN = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
const LIST_ITEM_PATTERN = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
const LINK_PATTERN = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", nbsp: " ", quot: '"', apos: "'", lt: "<", gt: ">",
  ldquo: "\u201C", rdquo: "\u201D", lsquo: "\u2018", rsquo: "\u2019",
  hellip: "\u2026", mdash: "\u2014", ndash: "\u2013",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

function stripDecorativeEmoji(text: string): string {
  return text.replace(/\u{1F525}️?/gu, "").replace(/[ \t]{2,}/g, " ").trim();
}

function stripTags(html: string): string {
  return stripDecorativeEmoji(decodeEntities(html.replace(/<[^>]+>/g, " ")))
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\|/g, "｜");
}

const HEADING_FIELD_MAP: { field: MatchableSection; keywords: string[] }[] = [
  { field: "importantDatesRaw", keywords: ["important dates", "महत्वपूर्ण तिथ"] },
  { field: "applicationFeeRaw", keywords: ["application fee", "आवेदन शुल्क"] },
  { field: "ageLimitRaw", keywords: ["age limit", "आयु सीमा"] },
  { field: "postDetailsRaw", keywords: ["post details", "vacancy", "seat distribution", "पद विवरण", "सीट वितरण"] },
  { field: "eligibilityRaw", keywords: ["eligibility", "योग्यता"] },
  { field: "selectionProcessRaw", keywords: ["selection process", "चयन प्रक्रिया"] },
  {
    field: "howToApplyRaw",
    keywords: [
      "how to apply",
      "आवेदन कैसे करें",
      "how to check result",
      "how to check the result",
      "रिजल्ट कैसे चेक करें",
      "परिणाम कैसे देखें",
      "how to download admit card",
      "how to download the admit card",
      "एडमिट कार्ड कैसे डाउनलोड करें",
      "प्रवेश पत्र कैसे डाउनलोड करें",
    ],
  },
  { field: "importantLinksRaw", keywords: ["important links", "महत्वपूर्ण लिंक"] },
  { field: "documentsRequiredRaw", keywords: ["documents required", "required documents", "आवश्यक दस्तावेज"] },
  { field: "examPatternRaw", keywords: ["exam pattern", "syllabus", "परीक्षा पैटर्न", "पाठ्यक्रम"] },
  {
    field: "faqRaw",
    keywords: [
      "faq",
      "frequently asked",
      "प्रश्नोत्तर",
      "अक्सर पूछे जाने वाले प्रश्न",
      "सामान्य प्रश्न",
    ],
  },
  { field: "conclusionRaw", keywords: ["conclusion", "निष्कर्ष"] },
];

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

const FEE_AMOUNT_PATTERN = /(?:₹|rs\.?|inr)\s*[.:]?\s*([\d,]{1,7})/i;

function extractCanonicalFee(rows: string[]): { general?: number; reserved?: number } {
  const fee: { general?: number; reserved?: number } = {};
  for (const row of rows) {
    const lower = row.toLowerCase();
    const amountMatch = row.match(FEE_AMOUNT_PATTERN);
    if (!amountMatch) continue;
    const amount = parseInt(amountMatch[1].replace(/,/g, ""), 10);
    if (Number.isNaN(amount)) continue;

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

const VACANCY_TOTAL_ROW_LABEL = /total\s*vacanc\w*|total\s*posts?|grand\s*total|कुल\s*रिक्तिय|कुल\s*योग|कुल\s*पद/i;

const WP_POST_META_ROW = /^post\s*(author|published|category|comments?)\s*:/i;

function firstNumberInText(text: string | undefined): number | undefined {
  const match = text?.match(/\d[\d,]*/);
  if (!match) return undefined;
  const n = parseInt(match[0].replace(/,/g, ""), 10);
  return Number.isNaN(n) ? undefined : n;
}

function lastNumberInRow(row: string): number | undefined {
  const matches = row.match(/\d[\d,]*/g);
  if (!matches || matches.length === 0) return undefined;
  const n = parseInt(matches[matches.length - 1].replace(/,/g, ""), 10);
  return Number.isNaN(n) ? undefined : n;
}

function extractCanonicalVacancies(rows: string[]): number | undefined {
  const header = rows[0]?.split(" | ");
  const countColIndex = header?.findIndex((h) => VACANCY_TOTAL_ROW_LABEL.test(h)) ?? -1;

  for (const row of rows) {
    const cells = row.split(" | ");
    const label = cells[0];
    if (!label || !VACANCY_TOTAL_ROW_LABEL.test(label)) continue;

    if (countColIndex > 0) {
      const byColumn = firstNumberInText(cells[countColIndex]);
      if (byColumn) return byColumn;
    }
    const inLabel = lastNumberInRow(label);
    if (inLabel) return inLabel;

    const total = lastNumberInRow(row);
    if (total) return total;
  }

  const combined = rows.join(" ");
  const patterns = [
    /(?:total\s*post|total\s*vacanc\w*)[^\d]{0,25}(\d[\d,]{1,7})/i,
    /\(\s*(\d[\d,]{2,7})\s*\)/,
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
  importantDatesRaw: string[][];
  applicationFeeRaw: string[][];
  ageLimitRaw: string[][];
  postDetailsRaw: string[][];
  eligibilityRaw: string[][];
  selectionProcessRaw: string[][];
  howToApplyRaw: string[];
  importantLinksRaw: { label: string; url: string }[];
  documentsRequiredRaw: string[][];
  examPatternRaw: string[][];
  faqRaw: string[][];
  conclusionRaw: string[][];
  genericSections: { heading: string; blocks: string[][] }[];
  sectionOrder: string[];
  headingStats: { total: number; covered: number };
}

type MatchableSection = Exclude<keyof ParsedSections, "genericSections" | "sectionOrder" | "headingStats">;

const ELIGIBILITY_EXCLUDE = ["physical", "शारीरिक"];

function classifyHeading(headingText: string): MatchableSection | null {
  const lower = headingText.toLowerCase();
  const eligibilityExcluded = ELIGIBILITY_EXCLUDE.some((kw) => lower.includes(kw));
  let best: { field: MatchableSection; keywordLength: number; position: number } | null = null;
  for (const { field, keywords } of HEADING_FIELD_MAP) {
    if (field === "eligibilityRaw" && eligibilityExcluded) continue;
    for (const kw of keywords) {
      if (kw.toLowerCase() === "vacancy" && eligibilityExcluded) continue;
      const idx = lower.indexOf(kw.toLowerCase());
      if (idx === -1) continue;
      if (!best || idx < best.position || (idx === best.position && kw.length > best.keywordLength)) {
        best = { field, keywordLength: kw.length, position: idx };
      }
    }
  }
  return best ? best.field : null;
}

const CELL_WITH_TAG_PATTERN = /<(td|th)\b([^>]*)>([\s\S]*?)<\/(?:td|th)>/gi;
const THEAD_PATTERN = /<thead\b[^>]*>[\s\S]*?<\/thead>/i;

function parseSpanAttr(attrs: string, name: "colspan" | "rowspan"): number {
  const match = attrs.match(new RegExp(`${name}\\s*=\\s*["']?(\\d+)`, "i"));
  const n = match ? parseInt(match[1], 10) : 1;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

interface RawCell {
  tag: "td" | "th";
  value: string;
  colspan: number;
  rowspan: number;
}

interface TableCell {
  tag: "td" | "th";
  value: string;
}

function expandRow(rawCells: RawCell[], carry: (TableCell & { remaining: number })[]): TableCell[] {
  const out: TableCell[] = [];
  let cellIndex = 0;
  let col = 0;
  const MAX_COLS = 300;
  while (col < MAX_COLS && (cellIndex < rawCells.length || carry[col])) {
    const carried = carry[col];
    if (carried) {
      out.push({ tag: carried.tag, value: carried.value });
      carried.remaining--;
      if (carried.remaining <= 0) delete carry[col];
      col++;
      continue;
    }
    const cell = rawCells[cellIndex];
    if (!cell) break;
    cellIndex++;
    for (let i = 0; i < cell.colspan; i++) {
      out.push({ tag: cell.tag, value: cell.value });
      if (cell.rowspan > 1) carry[col] = { tag: cell.tag, value: cell.value, remaining: cell.rowspan - 1 };
      col++;
    }
  }
  return out;
}

function tableToPairs(tableHtml: string): string[] {
  const theadMatch = tableHtml.match(THEAD_PATTERN);
  const theadEnd = theadMatch ? tableHtml.indexOf(theadMatch[0]) + theadMatch[0].length : -1;

  const rowPattern = new RegExp(ROW_PATTERN.source, "gi");
  const headerRows: TableCell[][] = [];
  const bodyRows: TableCell[][] = [];
  const carry: (TableCell & { remaining: number })[] = [];
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowPattern.exec(tableHtml)) !== null) {
    const cellPattern = new RegExp(CELL_WITH_TAG_PATTERN.source, "gi");
    const rawCells: RawCell[] = [];
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellPattern.exec(rowMatch[1])) !== null) {
      rawCells.push({
        tag: cellMatch[1].toLowerCase() as "td" | "th",
        value: stripTags(cellMatch[3]),
        colspan: parseSpanAttr(cellMatch[2], "colspan"),
        rowspan: parseSpanAttr(cellMatch[2], "rowspan"),
      });
    }
    if (rawCells.length === 0) continue;

    const expanded = expandRow(rawCells, carry);
    if (expanded.length === 0) continue;

    const isHeaderRow = theadEnd >= 0 ? rowMatch.index < theadEnd : rawCells.every((c) => c.tag === "th");
    (isHeaderRow ? headerRows : bodyRows).push(expanded);
  }

  const rows: string[] = [];
  if (headerRows.length > 0) {
    const width = Math.max(...headerRows.map((r) => r.length));
    const combined: string[] = [];
    for (let c = 0; c < width; c++) {
      const levels: string[] = [];
      let prev = "";
      for (const headerRow of headerRows) {
        const text = headerRow[c]?.value ?? "";
        if (text && text !== prev) levels.push(text);
        prev = text;
      }
      combined.push(levels.join(" - "));
    }
    rows.push(combined.join(" | "));
  }
  for (const bodyRow of bodyRows) {
    rows.push(bodyRow.map((c) => c.value).join(" | "));
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

const BLOCK_PATTERN = /<(p|li|h[3-6])\b[^>]*>([\s\S]*?)<\/\1>/gi;

function extractPlainBlocks(segmentHtml: string): string[] {
  const blocks: string[] = [];
  const blockPattern = new RegExp(BLOCK_PATTERN.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = blockPattern.exec(segmentHtml)) !== null) {
    const text = stripTags(m[2]);
    if (text) blocks.push(text);
  }
  return blocks;
}

const LEAF_DIV_PATTERN = /<div\b[^>]*>((?:(?!<div\b)[\s\S])*?)<\/div>/gi;

function stripScriptsAndStyles(html: string): string {
  return html.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<style\b[\s\S]*?<\/style>/gi, "");
}

function extractLeafDivBlocks(segmentHtml: string): string[] {
  const blocks: string[] = [];
  const pattern = new RegExp(LEAF_DIV_PATTERN.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(segmentHtml)) !== null) {
    const text = stripTags(stripScriptsAndStyles(m[1]));
    if (text) blocks.push(text);
  }
  return blocks;
}

function extractLinkPairs(sectionHtml: string): { label: string; url: string }[] {
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
    documentsRequiredRaw: [],
    examPatternRaw: [],
    faqRaw: [],
    conclusionRaw: [],
    genericSections: [],
    sectionOrder: [],
    headingStats: { total: 0, covered: 0 },
  };
  const recordOrder = (key: string) => {
    if (!sections.sectionOrder.includes(key)) sections.sectionOrder.push(key);
  };

  const headingPositions: { field: MatchableSection | null; text: string; start: number; end: number }[] = [];
  const headingPattern = new RegExp(HEADING_PATTERN.source, "gi");
  let headingMatch: RegExpExecArray | null;
  while ((headingMatch = headingPattern.exec(html)) !== null) {
    const text = stripTags(headingMatch[1]);
    if (!text) continue;
    headingPositions.push({
      field: classifyHeading(text),
      text,
      start: headingMatch.index,
      end: headingPattern.lastIndex,
    });
  }

  const NUMBERED_SUBHEADING = /^\s*\d+\s*[.):]/;
  const MAX_ABSORBED_SUBHEADINGS = 6;

  const GENERIC_SECTION_EXCLUDE = [
    "related",
    "recent post",
    "recent comment",
    "you might also like",
    "leave a comment",
    "leave a reply",
    "share this",
    "share on",
    "follow us",
    "subscribe",
    "newsletter",
    "categories",
    "tags",
    "search",
    "comments",
    "post navigation",
    "similar post",
    "about the author",
    "about author",
    "you may also check",
    "you might also check",
  ];
  const isBoilerplateHeading = (text: string) => {
    const lower = text.toLowerCase();
    return GENERIC_SECTION_EXCLUDE.some((kw) => lower.includes(kw));
  };

  const firstBoilerplateIndex = headingPositions.findIndex((h) => isBoilerplateHeading(h.text));
  if (firstBoilerplateIndex !== -1) headingPositions.length = firstBoilerplateIndex;

  const extractBlocksFromSegment = (segment: string): string[][] => {
    const tablePattern = new RegExp(TABLE_PATTERN.source, "gi");
    let tableMatch: RegExpExecArray | null;
    const blocks: string[][] = [];
    while ((tableMatch = tablePattern.exec(segment)) !== null) {
      const rows = tableToPairs(tableMatch[1]).filter((row) => !WP_POST_META_ROW.test(row));
      if (rows.length > 0) blocks.push(rows);
    }
    if (blocks.length === 0) {
      const plain = extractPlainBlocks(segment).filter((row) => !WP_POST_META_ROW.test(row));
      if (plain.length > 0) blocks.push(plain);
    }
    if (blocks.length === 0) {
      const leafDivs = extractLeafDivBlocks(segment).filter((row) => !WP_POST_META_ROW.test(row));
      if (leafDivs.length > 0) blocks.push(leafDivs);
    }
    return blocks;
  };

  let reachedFirstField = false;

  for (let i = 0; i < headingPositions.length; i++) {
    const { field, end, text: headingText } = headingPositions[i];

    if (!field) {
      if (!isBoilerplateHeading(headingText)) {
        const segmentEnd = i + 1 < headingPositions.length ? headingPositions[i + 1].start : html.length;
        const segment = html.slice(end, segmentEnd);
        const blocks = extractBlocksFromSegment(segment);
        const hasSubstantialContent = blocks.length > 0 || stripTags(segment).trim().length >= 15;
        if (hasSubstantialContent && reachedFirstField) sections.headingStats.total++;

        const hasRealTable = /<table\b/i.test(segment);
        const linkPairs = hasRealTable ? extractLinkPairs(segment) : [];
        const rowCount = blocks.reduce((sum, block) => sum + block.length, 0);
        if (linkPairs.length > 0 && linkPairs.length >= rowCount - 1) {
          sections.importantLinksRaw.push(...linkPairs);
          recordOrder("importantLinksRaw");
          sections.headingStats.covered++;
          continue;
        }

        if (blocks.length > 0) {
          sections.genericSections.push({ heading: headingText, blocks });
          recordOrder(`generic:${sections.genericSections.length - 1}`);
          sections.headingStats.covered++;
        } else if (hasSubstantialContent && process.env.DEBUG_SECTIONS) {
          console.error(`[DEBUG-MISS] generic-no-blocks heading="${headingText}" segLen=${segment.length} text="${stripTags(segment).slice(0, 200)}"`);
        }
      }
      continue;
    }

    reachedFirstField = true;
    const startIdx = i;
    let j = i + 1;
    let absorbed = 0;
    while (
      j < headingPositions.length &&
      !headingPositions[j].field &&
      NUMBERED_SUBHEADING.test(headingPositions[j].text) &&
      absorbed < MAX_ABSORBED_SUBHEADINGS
    ) {
      j++;
      absorbed++;
    }
    const segmentEnd = j < headingPositions.length ? headingPositions[j].start : html.length;
    const segment = html.slice(end, segmentEnd);
    const hadAbsorbedSubheadings = j > startIdx + 1;
    i = j - 1;
    if (stripTags(segment).trim().length >= 15) sections.headingStats.total++;

    if (field === "importantLinksRaw") {
      const linkPairs = extractLinkPairs(segment);
      sections.importantLinksRaw.push(...linkPairs);
      recordOrder(field);
      if (linkPairs.length > 0) sections.headingStats.covered++;
      else if (process.env.DEBUG_SECTIONS) console.error(`[DEBUG-MISS] importantLinksRaw heading="${headingText}" segLen=${segment.length}`);
      continue;
    }
    if (field === "howToApplyRaw") {
      const listMatch = segment.match(/<ol\b[^>]*>([\s\S]*?)<\/ol>/i);
      const items = listMatch ? listToItems(listMatch[1]) : [];
      sections[field].push(...items);
      recordOrder(field);
      if (items.length > 0) sections.headingStats.covered++;
      else if (process.env.DEBUG_SECTIONS) console.error(`[DEBUG-MISS] howToApplyRaw heading="${headingText}" segLen=${segment.length}`);
      continue;
    }

    if (!hadAbsorbedSubheadings) {
      const contentBlocks = extractBlocksFromSegment(segment);
      sections[field].push(...contentBlocks);
      recordOrder(field);
      if (contentBlocks.length > 0) sections.headingStats.covered++;
      else if (process.env.DEBUG_SECTIONS) console.error(`[DEBUG-MISS] ${field} heading="${headingText}" segLen=${segment.length}`);
      continue;
    }

    const preambleEnd = headingPositions[startIdx + 1].start;
    const preamble = html.slice(end, preambleEnd);
    const preambleBlocks = extractBlocksFromSegment(preamble);
    sections[field].push(...preambleBlocks);
    recordOrder(field);
    if (preambleBlocks.length > 0) sections.headingStats.covered++;
    else if (process.env.DEBUG_SECTIONS) console.error(`[DEBUG-MISS] preamble field=${field} heading="${headingText}" preambleLen=${preamble.length}`);

    for (let k = startIdx + 1; k <= j - 1; k++) {
      sections.headingStats.total++;
      const subEnd = k + 1 <= j - 1 ? headingPositions[k + 1].start : segmentEnd;
      const subSegment = html.slice(headingPositions[k].end, subEnd);
      const subBlocks = extractBlocksFromSegment(subSegment);
      if (subBlocks.length === 0) {
        if (process.env.DEBUG_SECTIONS) console.error(`[DEBUG-MISS] subheading="${headingPositions[k].text}" subLen=${subSegment.length}`);
        continue;
      }
      sections.headingStats.covered++;
      subBlocks[0] = [headingPositions[k].text, ...subBlocks[0]];
      sections[field].push(...subBlocks);
    }
  }

  return sections;
}

export interface HtmlNotificationExtraction {
  organization?: string;
  fields: ExtractedStructuredFields;
}

function scopeToArticleBody(html: string): string {
  const startMarker = 'itemprop="text"';
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf("</article>", startIdx);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return html;
  return html.slice(startIdx, endIdx);
}

export function extractHtmlNotificationFields(html: string): HtmlNotificationExtraction {
  const sections = parseSections(scopeToArticleBody(html));

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
    sections.documentsRequiredRaw.length > 0 ||
    sections.examPatternRaw.length > 0 ||
    sections.faqRaw.length > 0 ||
    sections.conclusionRaw.length > 0 ||
    sections.genericSections.length > 0 ||
    importantLinks.length > 0;

  const fallbackFields: ExtractedStructuredFields = sectionsHadAnyMatch
    ? {}
    : extractStructuredFields(stripTags(html));

  const canonicalDates = extractCanonicalDates(sections.importantDatesRaw.flat());
  const canonicalFee = extractCanonicalFee(sections.applicationFeeRaw.flat());
  const canonicalVacancies = extractCanonicalVacancies(sections.postDetailsRaw.flat());

  const joinBlocks = (blocks: string[][]) => blocks.map((rows) => rows.join(" || ")).join(TABLE_SEP);

  const fields: ExtractedStructuredFields = {
    ...fallbackFields,
    ...(canonicalDates.length ? { importantDates: canonicalDates } : {}),
    ...(Object.keys(canonicalFee).length ? { applicationFee: canonicalFee } : {}),
    ...(canonicalVacancies !== undefined ? { totalVacancies: canonicalVacancies } : {}),
    ...(sections.importantDatesRaw.length ? { importantDatesText: joinBlocks(sections.importantDatesRaw) } : {}),
    ...(sections.applicationFeeRaw.length ? { applicationFeeText: joinBlocks(sections.applicationFeeRaw) } : {}),
    ...(sections.ageLimitRaw.length ? { ageLimit: joinBlocks(sections.ageLimitRaw) } : {}),
    ...(sections.postDetailsRaw.length ? { postDetails: joinBlocks(sections.postDetailsRaw) } : {}),
    ...(sections.eligibilityRaw.length ? { eligibility: joinBlocks(sections.eligibilityRaw) } : {}),
    ...(sections.selectionProcessRaw.length ? { selectionProcess: joinBlocks(sections.selectionProcessRaw) } : {}),
    ...(sections.genericSections.length
      ? {
          genericSections: sections.genericSections.map((s) => ({
            heading: s.heading,
            content: joinBlocks(s.blocks),
          })),
        }
      : {}),
    ...(sections.howToApplyRaw.length ? { howToApply: sections.howToApplyRaw } : {}),
    ...(sections.documentsRequiredRaw.length ? { documentsRequired: joinBlocks(sections.documentsRequiredRaw) } : {}),
    ...(sections.examPatternRaw.length ? { examPattern: joinBlocks(sections.examPatternRaw) } : {}),
    ...(sections.faqRaw.length ? { faqText: sections.faqRaw.flat() } : {}),
    ...(sections.conclusionRaw.length ? { conclusionText: sections.conclusionRaw.flat().join(" ") } : {}),
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
    ...(sections.sectionOrder.length ? { sectionOrder: sections.sectionOrder } : {}),
    verification: {
      sourceHeadingCount: sections.headingStats.total,
      capturedHeadingCount: sections.headingStats.covered,
      possibleGap: sections.headingStats.total - sections.headingStats.covered >= 1,
    },
  };

  return { organization, fields };
}