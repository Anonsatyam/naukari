import { ExtractedStructuredFields, extractStructuredFields } from "./extractStructuredFields";
import { TABLE_SEP } from "../../lib/pipeTables";

/**
 * Sites like abc.com put every structured field directly in the
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

// Bilingual notification pages lean on curly quotes and other named
// entities inside plain-text list items (how-to-apply steps in
// particular tend to quote a UI label, e.g. "&#8220;Apply Online&#8221;")
// — decoding only &nbsp;/&amp; left every other entity showing up
// verbatim as its numeric code in the stored text. Numeric entities
// (decimal and hex) cover the long tail; the named-entity table covers
// the handful WordPress/CMS editors actually emit.
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

// Source pages routinely prefix a title/description line with a
// decorative "🔥" flag — meaningless on our site, stripped at the same
// choke point every piece of extracted text already funnels through.
function stripDecorativeEmoji(text: string): string {
  return text.replace(/\u{1F525}️?/gu, "").replace(/[ \t]{2,}/g, " ").trim();
}

function stripTags(html: string): string {
  return stripDecorativeEmoji(decodeEntities(html.replace(/<[^>]+>/g, " ")))
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\|/g, "｜"); // U+FF5C fullwidth vertical line — visually
  // identical to a real "|", but a distinct codepoint. Every cell/row of
  // content extracted from HTML funnels through this one function
  // before being joined with our own " | "/" || " delimiters — a
  // source author routinely types a literal "|" as their own mini-list
  // separator *inside* one table cell (seen on a Patna High Court
  // notification's CPT row: "Word: 20 | Spread Sheets: 20 | Internet:
  // 10"), which otherwise reads as extra cell boundaries and shifts
  // that whole row out of alignment with its header. Neutralizing at
  // the source, once, protects every consumer of this format instead
  // of needing an escaping scheme at every join/split site.
}

// English + Hindi keyword match, same idea as the site's own bilingual
// headings ("Important Dates / महत्वपूर्ण तिथियां") — matched loosely by
// substring so slight heading variants ("Important Dates for X 2026")
// still classify correctly.
const HEADING_FIELD_MAP: { field: MatchableSection; keywords: string[] }[] = [
  { field: "importantDatesRaw", keywords: ["important dates", "महत्वपूर्ण तिथ"] },
  { field: "applicationFeeRaw", keywords: ["application fee", "आवेदन शुल्क"] },
  { field: "ageLimitRaw", keywords: ["age limit", "आयु सीमा"] },
  { field: "postDetailsRaw", keywords: ["post details", "vacancy", "seat distribution", "पद विवरण", "सीट वितरण"] },
  { field: "eligibilityRaw", keywords: ["eligibility", "योग्यता"] },
  { field: "selectionProcessRaw", keywords: ["selection process", "चयन प्रक्रिया"] },
  // Same bucket covers a Job's "How to Apply", a Result's "How to
  // Check Result", and an Admit Card's "How to Download Admit Card" —
  // structurally the same thing (a numbered procedure), just worded
  // differently depending on what the posting actually is. Without
  // these extra phrasings, a Result/Admit Card page's own how-to
  // section matched none of the heading keywords at all and was
  // silently dropped rather than captured under any field.
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
      "अक्सर पूछे जाने वाले प्रश्न", // "questions frequently asked" — a
      // full-phrase Hindi heading this source actually uses, distinct
      // from the words above.
      "सामान्य प्रश्न",
    ],
  },
  { field: "conclusionRaw", keywords: ["conclusion", "निष्कर्ष"] },
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

// {1,7} not {2,7} — a free-of-cost row is commonly written as a bare
// "₹0", which is a single digit. The old 2-digit minimum silently
// dropped every such row instead of recording the fee as zero.
const FEE_AMOUNT_PATTERN = /(?:₹|rs\.?|inr)\s*[.:]?\s*([\d,]{1,7})/i;

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
    // NOT `if (!amount) continue` — 0 is a legitimate, common fee value
    // (SC/ST/PwBD categories are frequently fee-exempt) and `!0` is
    // true, so that check was silently discarding every free-of-cost
    // row it managed to match at all.
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

// WordPress themes commonly render a small "Post author: X / Post
// published: Y / Post category: Z / Post comments: N" meta block right
// at the top of the post body — which, depending on where the theme
// places it in the markup, can land inside whichever heading's segment
// happens to wrap around it (observed under "Post Details" on this
// site), landing as a handful of stray one-cell rows *before* the real
// table. That shifts the real header row out of position 0, which is
// exactly what parseVacancyBreakdown()/the review page's "additional
// details" panel assume the header row to be — so it's filtered out
// here, generically, rather than only for one field.
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

/**
 * Pulls the grand-total vacancy count out of the post-details/vacancy
 * table, same field the PDF pipeline's totalVacancies uses.
 *
 * Resolves the count column by its OWN header text first, then reads
 * that specific column off the row whose label is the actual grand
 * total ("कुल रिक्तियां (Total Vacancies)" / "कुल योग (Total
 * Vacancies)" / "Total Vacancies") — not by position. Different
 * notification templates put the count column in different places: a
 * pure UR/EWS/OBC/SC/ST breakdown puts it last, but a table with a
 * trailing Women's Quota or Pay Scale column puts it second. Taking
 * "the last number in the total row" (an earlier version of this fix)
 * silently grabbed the Women's Quota figure instead of the actual
 * total on exactly that second layout.
 *
 * Falls back to the last number in the matched row when the header
 * can't be resolved or the total row has fewer cells than the header
 * (a merged/short summary row) — still far better than the very first
 * version's whole-table blob scan, which matched the column HEADER
 * itself (containing the same "total" words) and returned the first
 * category's count instead of the grand total.
 */
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
    // The matched "total" phrase can be this row's own dedicated label
    // ("कुल योग (Total Vacancies)", with the count in a separate cell —
    // handled by countColIndex above) OR embedded inline within a
    // longer post-name cell, e.g. "... Total Post ( 11403 )" (a
    // single-row post table with no separate grand-total row at all).
    // In the inline case the count sits right next to the phrase in
    // THIS cell — checked first, before scanning the whole row, since a
    // later cell (a pay-scale column, in that exact layout) can also
    // contain numbers and get mistaken for the count otherwise.
    const inLabel = lastNumberInRow(label);
    if (inLabel) return inLabel;

    const total = lastNumberInRow(row);
    if (total) return total;
  }

  // Fallback for pages with no dedicated total row — same best-effort
  // blob scan as before, but restricted to unambiguous English phrasing
  // only, so it can no longer collide with a Hindi column header.
  const combined = rows.join(" ");
  const patterns = [
    /(?:total\s*post|total\s*vacanc\w*)[^\d]{0,25}(\d[\d,]{1,7})/i,
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

// Every field below except howToApplyRaw/importantLinksRaw holds one
// entry per *distinct table (or plain-text block)* found under that
// heading, not a flattened list of rows — preserving real `<table>`
// boundaries is what lets parsePipeTables (lib/pipeTables.ts) split
// multi-table sections (e.g. Exam Pattern's Prelims+Mains, or Age
// Limit's grade table + a differently-headed relaxation table)
// correctly regardless of whether their headers happen to match, one
// source's markup and never guessed at again downstream.
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
  // Every heading on the page that doesn't match any of the specific
  // buckets above — captured with its OWN heading text rather than
  // being silently discarded (which is what happened before this
  // existed: any section whose heading didn't happen to contain one of
  // the keywords tracked above simply never made it into extraction at
  // all, however genuinely different it was from the sections that DO
  // have a bucket — a "Physical Eligibility" table, a "Reservation
  // Policy" note, anything). Rendered generically, one section per
  // entry, in source order, using the source's own heading as the
  // title — the fix for one specific missing heading shouldn't require
  // a matching fix for the next one nobody's seen yet.
  genericSections: { heading: string; blocks: string[][] }[];
  // The source's own top-to-bottom section order — one entry per
  // matched field the FIRST time it's encountered (a field can only
  // appear once here even if the source somehow repeats a heading,
  // since the final `fields` object collapses repeats into one joined
  // value anyway), plus one "generic:<index>" entry per genericSections
  // entry at the exact point it was encountered. Lets the public pages
  // render sections in the source's own order instead of a fixed
  // template — see components using resolveSectionOrder.
  sectionOrder: string[];
  // A cheap, always-computed signal for whether extraction likely left
  // something out — NOT a diagnosis of what, just a count: how many
  // real (non-boilerplate) headings were found on the page vs how many
  // of them ended up with actual captured content. A heading matching
  // several times into the same field (e.g. two Exam Pattern phase
  // headings) counts as two "covered" headings here, not one — this
  // is a per-HEADING tally, not a per-FIELD one, so that legitimate
  // multi-heading sections don't look like a gap. See Tier 2 of the
  // discrepancy-reduction plan: surfaced on the admin drafts list/
  // review page as a "might be missing something, please check"
  // warning, not a block on approving.
  headingStats: { total: number; covered: number };
}

// genericSections is populated directly (see the `!field` branch
// below), never reached via a HEADING_FIELD_MAP keyword match — this
// excludes it from the type a heading can classify as, so
// `sections[field].push(...)` for an actually-matched heading is known
// to be pushing into one of the `string[][]`/`string[]` fields above,
// not genericSections' different shape.
type MatchableSection = Exclude<keyof ParsedSections, "genericSections" | "sectionOrder" | "headingStats">;

// "शारीरिक योग्यता" (Physical Eligibility) and "शैक्षणिक योग्यता"
// (Education Eligibility) both contain "योग्यता" — matched here by the
// generic eligibilityRaw entry, they'd merge into one section instead
// of the two distinct ones a source actually publishes. Rather than
// hardcoding yet another named field+bucket for "physical" specifically
// (the same fix would still be needed the next time a source uses some
// other qualifying word nobody's excluded), excluding it here just
// stops the OVER-broad generic match from claiming it — letting it
// fall through to the generic, heading-text-preserving catch-all below
// instead, exactly like any other heading this map has no entry for.
const ELIGIBILITY_EXCLUDE = ["physical", "शारीरिक"];

function classifyHeading(headingText: string): MatchableSection | null {
  const lower = headingText.toLowerCase();
  // A heading can accidentally contain keywords from more than one
  // bucket — Indian govt-job sites often prefix every section heading
  // with the full post title ("SBI Apprentice VACANCY 2026 Important
  // Links"), so a short, common word like "vacancy" can collide with a
  // completely different section's own heading. Seen in practice: a
  // genuine "महत्वपूर्ण लिंक (Important Links For SBI Apprentice
  // Vacancy 2026)" heading was classified as postDetailsRaw purely
  // because its own branded title happened to contain "Vacancy".
  //
  // This site consistently leads each heading with its real topic word
  // ("FAQ-...", "Important Links...", "Physical Eligibility (...)")
  // and only tacks the branded post title on afterward/in parens — so
  // preferring whichever keyword matches EARLIEST in the heading (not
  // simply the longest one anywhere in it) picks the heading's actual,
  // intentional topic over an incidental word from its own branding.
  // Longest length only breaks a tie when two keywords start at the
  // same position. Two collisions this still can't resolve on
  // position alone get a narrow exclusion below: a heading already
  // excluded from eligibilityRaw (see ELIGIBILITY_EXCLUDE) — e.g.
  // "Physical Eligibility (... Vacancy 2026)" — has no other
  // candidate keyword at all, so without this, "vacancy" would
  // "rescue" it into postDetailsRaw instead of correctly falling
  // through to the generic catch-all it's meant to land in.
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

/**
 * Expands one <tr>'s own cells against any rowspan carried over from
 * earlier rows (mutated in place, keyed by final column position) into
 * a full-width row — every column position a sighted user would see
 * gets an entry, a rowspan cell's value repeated down into every row
 * it visually covers and a colspan cell's value repeated across every
 * column it visually covers. Without this, a row whose leading cell is
 * merged away by an earlier row's rowspan (very common: a "Circle"
 * column that only prints once per group of States under it) comes out
 * short by however many cells were merged, so it no longer lines up
 * under the same header its neighbors do.
 */
function expandRow(rawCells: RawCell[], carry: (TableCell & { remaining: number })[]): TableCell[] {
  const out: TableCell[] = [];
  let cellIndex = 0;
  let col = 0;
  const MAX_COLS = 300; // circuit breaker against malformed/runaway markup
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

/**
 * Flattens an HTML table into one pipe-joined row per data row,
 * respecting colspan/rowspan (see expandRow above) and collapsing a
 * multi-row grouped header (an explicit <thead> with several stacked
 * <tr>s, e.g. "Regular Vacancies" spanning 6 sub-columns above their
 * individual SC/ST/OBC/... headers) into a single combined header row
 * by joining each column's text across every header level. Without
 * this, a source's real per-column headers were being read as extra
 * (badly misaligned) data rows, while the actual header used for
 * rendering only had as many cells as the *coarsest* grouping row —
 * exactly what broke the SBI vacancy table's layout.
 */
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

    // A row counts as a header row if it's inside an explicit <thead>,
    // or — when a source doesn't use one — every one of its own cells
    // is a <th>, which is the other convention seen in the wild.
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
        // A level whose text repeats the level above it in this same
        // column (the natural result of expanding a single header cell
        // down through rowspan, e.g. "Circle" spanning all 3 header
        // rows) is only kept once rather than stuttering.
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

/**
 * Falls back to one entry per <p>/<li>/<h3-6> block for sections whose
 * content isn't a <table> — e.g. a bullet-list "Education Eligibility"
 * section, or an FAQ laid out as repeating question/answer paragraphs
 * rather than a table. Used only when the table-based pass above found
 * nothing in a given segment, so it never overrides or duplicates a
 * section that *is* table-shaped.
 */
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

// A leaf <div> — one containing no <div> of its own — used only as a
// last resort when a segment has neither a <table> nor any <p>/<li>/
// <h3-6> at all. Seen in practice: an FAQ section laid out as one
// <div style="..."><b>Q1. ...</b><br />Ans: ...</div> per question,
// with no other tag BLOCK_PATTERN recognizes — content that was
// otherwise silently discarded even though it's visibly a real,
// readable section on the page. Requiring "no nested <div>" is what
// keeps this from also matching a large wrapper <div> (an ad
// code-block, a whole section's outer container) as if it were one
// block — the non-greedy match would stop at that wrapper's first
// inner </div> and never reach its own closing tag, so it simply
// doesn't match instead of matching the wrong span.
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
    // A blank <h2>/<h3> — no real title text once stripped, seen used
    // purely as a decorative spacer before a second table under an
    // already-titled section (e.g. a syllabus breakdown table right
    // after "Exam Pattern & Syllabus") — isn't a real section boundary.
    // Skipping it entirely (rather than adding it as a heading with no
    // field) means its content stays part of whichever real, titled
    // section precedes it instead of being cut off into its own
    // generic section titled with an empty string.
    if (!text) continue;
    headingPositions.push({
      field: classifyHeading(text),
      text,
      start: headingMatch.index,
      end: headingPattern.lastIndex,
    });
  }

  // A numbered sub-heading ("1. प्रारंभिक / स्क्रीनिंग परीक्षा", "2. मुख्य
  // लिखित परीक्षा", ...) — e.g. Exam Pattern broken into a Prelims/Mains/
  // CPT sub-heading per stage, each with its own table. classifyHeading
  // won't recognize these (they don't contain "exam pattern" or any
  // other tracked keyword), so without this they'd end a classified
  // section's segment right after its intro sentence and silently
  // discard every table under them — exactly what happened on a Patna
  // High Court notification page. Capped so this can't run away and
  // swallow trailing unrelated content (a WordPress footer's "Recent
  // Posts"/"You Might Also Like" section is many headings deep and
  // never numbered, so the cap is never the thing standing between a
  // genuine multi-stage section and the footer either way).
  const NUMBERED_SUBHEADING = /^\s*\d+\s*[.):]/;
  const MAX_ABSORBED_SUBHEADINGS = 6;

  // Headings that are clearly navigational/boilerplate chrome — a
  // WordPress theme's "Related Posts", a comment-section prompt,
  // social-share buttons — rather than genuine notification content.
  // Checked before a heading falls through to the generic catch-all
  // below, so page furniture never gets rendered as if it were one of
  // the posting's own sections.
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

  // A boilerplate heading like "You Might Also Like" is always the
  // START of a trailing widget, never something real content resumes
  // after — but only ITS OWN heading text matches a GENERIC_SECTION_
  // EXCLUDE keyword; the individual post-title headings inside that
  // widget (a different, unpredictable title every time) don't, and
  // without this they were being scanned as if they were real content
  // headings — silently inflating the Tier 2 "possible gap" signal on
  // every single page (each one has this widget), and structurally
  // capable of leaking a related post's own excerpt text onto THIS
  // page as a bogus generic section if that post's card happens to
  // wrap its excerpt in a <p>/<li> the way real content does. Cutting
  // the heading list off at the first boilerplate marker — rather than
  // trying to keyword-match every possible post title that could
  // follow it — removes both risks in one place.
  const firstBoilerplateIndex = headingPositions.findIndex((h) => isBoilerplateHeading(h.text));
  if (firstBoilerplateIndex !== -1) headingPositions.length = firstBoilerplateIndex;

  // Shared by both the specific-field path below and the generic
  // catch-all: scans a segment for real <table>s first, falling back
  // to paragraph/list-item text only when there's no table at all —
  // same "never leave a matched heading's content empty" contract
  // either path relies on.
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

  // This site's post-title block runs the organization name, an
  // English branded subtitle, and a Hindi subtitle as separate
  // headings before the first real section (Important Dates) — always
  // just restating the title, in whatever tag that particular page
  // happens to wrap it in (a bare <div>/<span>, occasionally nothing
  // at all). Confirmed in practice both as truly empty segments AND as
  // real-length text that isn't wrapped in any tag extractBlocksFromSegment
  // recognizes as a block — either way, never something a reader would
  // notice as a "missing section" if it weren't captured. Once the
  // FIRST real field is reached, every heading after it counts
  // normally; before that, none of them count toward headingStats
  // (their content, if any, is still captured as a generic section as
  // usual — this only affects the Tier 2 signal, not what's shown).
  let reachedFirstField = false;

  // Set DEBUG_SECTIONS=1 (e.g. `DEBUG_SECTIONS=1 npx tsx scripts/bot/
  // debugExtract.ts <url>`) to print exactly which heading(s) tripped
  // headingStats' "no content found" case and why — the same tracing
  // used to calibrate the Tier 2 threshold against real pages so it
  // doesn't fire on this site's own decorative title-block headings.
  // Useful again if a future page shape produces a false positive/
  // negative and needs the same kind of investigation.
  for (let i = 0; i < headingPositions.length; i++) {
    const { field, end, text: headingText } = headingPositions[i];

    if (!field) {
      // A heading with no specific bucket — captured generically with
      // its own text as the title (see genericSections' own comment
      // for why: the alternative is silently discarding it, which is
      // exactly what happened to every "Physical Eligibility" table,
      // every section nobody had thought to add a keyword for yet).
      if (!isBoilerplateHeading(headingText)) {
        const segmentEnd = i + 1 < headingPositions.length ? headingPositions[i + 1].start : html.length;
        const segment = html.slice(end, segmentEnd);
        const blocks = extractBlocksFromSegment(segment);
        // A heading whose own segment is (near-)empty once stripped of
        // tags — not zero blocks despite real content, just genuinely
        // nothing there — is a decorative stacked title/org-name repeat
        // (this site's post-title block routinely runs "ORG NAME" /
        // "English Title" / "Hindi Title" as three separate headings
        // back to back before the real Important Dates section starts),
        // not a missed section. Counting it toward headingStats would
        // flag every single page as a false "possible gap" — confirmed
        // directly: before this check, every page in a manual spot
        // check came back flagged, entirely from headings exactly like
        // this. A heading WITH real stripped text just short of a full
        // section (rare) is still safely captured normally below; this
        // only affects whether it counts toward the Tier 2 signal.
        const hasSubstantialContent = blocks.length > 0 || stripTags(segment).trim().length >= 15;
        if (hasSubstantialContent && reachedFirstField) sections.headingStats.total++;

        // Structural fallback for an "Important Links"-shaped table
        // whose own heading wording isn't one importantLinksRaw's
        // keyword list covers (biharjob.co.in isn't consistent about
        // this — "Some Useful Links", "उपयोगी लिंक", a plain "लिंक"
        // column header with no distinct section heading at all).
        // Rather than hardcode yet another heading phrase — the exact
        // pattern this generic mechanism exists to avoid — detect it
        // by SHAPE instead: a table whose rows are (almost) entirely
        // label-cell-plus-link-cell pairs IS an important-links table
        // regardless of what its heading says, so it's captured the
        // same way important-links sections always are (and therefore
        // rendered as real, clickable sidebar buttons) instead of as
        // an inert text table with "Click Here" as unclickable prose.
        // The `- 1` tolerance allows for exactly one non-link row (the
        // table's own header row, e.g. "विवरण | लिंक", which never has
        // an anchor of its own).
        //
        // Gated on an actual `<table>` being present: extractLinkPairs
        // falls back to grabbing every inline `<a>` in the segment when
        // there's no table at all, which misfires on an ordinary intro
        // paragraph that happens to contain one contextual link (this
        // site's "Short Info" summary always has exactly one) — with
        // rowCount 1 for that single paragraph, the `- 1` tolerance let
        // a single inline link pass as if it were a whole links table,
        // silently swallowing the paragraph's real content into
        // importantLinksRaw instead of showing it as its own section.
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
    // Any numbered sub-headings just absorbed into this segment (e.g.
    // Exam Pattern's own "1. Phase-I ..." / "2. Phase-II ...") are now
    // part of THIS field's content — advancing i past them stops the
    // outer loop from also visiting them individually and, since they
    // have no field of their own, capturing the exact same content a
    // second time under the generic catch-all.
    i = j - 1;
    // One real heading matched a field — counted as "total" below,
    // same "is there actually anything here" gate the generic branch
    // uses. Needed even for a MATCHED heading: this site's own branded
    // post title routinely contains a field's own keyword by pure
    // coincidence (seen in practice — a page whose exam is literally
    // named "...Teachers Eligibility Test..." matches eligibilityRaw's
    // "eligibility" keyword on its own title heading, which has no
    // content of its own, it's immediately followed by the next
    // heading) — without this gate, that inflated the Tier 2 signal
    // with headings that were never going to have content to miss.
    // Any absorbed sub-headings are each their own real heading too,
    // counted individually below alongside their own content.
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
      // "How to Apply" is almost always a numbered <ol>, not a table
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

    // A section with absorbed sub-headings (e.g. "1. Phase-I:
    // Preliminary Examination Pattern" / "2. Phase-II: Main
    // Examination Pattern" under Exam Pattern) is visibly divided into
    // that many labeled parts on the source page — each with its own
    // <h3>, styled just as prominently as the parent heading. Scanning
    // the whole absorbed span as one blob (the pre-fix behavior) threw
    // that division away: two tables came out back-to-back with
    // nothing distinguishing which was Phase-I and which Phase-II.
    // Processing each sub-heading's own slice separately and stamping
    // its heading text onto its first table as a caption (reusing
    // toPipeTable's existing single-cell-row caption detection —
    // nothing new needed downstream) preserves that same division.
    const preambleEnd = headingPositions[startIdx + 1].start;
    const preamble = html.slice(end, preambleEnd);
    const preambleBlocks = extractBlocksFromSegment(preamble);
    sections[field].push(...preambleBlocks);
    recordOrder(field);
    if (preambleBlocks.length > 0) sections.headingStats.covered++;
    else if (process.env.DEBUG_SECTIONS) console.error(`[DEBUG-MISS] preamble field=${field} heading="${headingText}" preambleLen=${preamble.length}`);

    for (let k = startIdx + 1; k <= j - 1; k++) {
      // Each absorbed sub-heading (e.g. "1. Phase-I ...") is its own
      // real heading, same accounting as any other.
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

/**
 * Entry point: given a detail page's raw HTML (a page like abc.com
 * publishes for each job/result/admit-card post), returns the org name
 * guessed from the first notification table plus a populated
 * ExtractedStructuredFields — same shape run.ts already merges in from
 * PDF extraction, so this plugs into the existing pipeline without
 * changing anything downstream of extractFields.ts.
 */
// Scopes heading-scanning to the actual post body, not the whole page
// — needed specifically for genericSections (see parseSections):
// without it, a page's footer widgets ("Bihar Job Portal" branding
// blurb, a "Legal Pages" nav list) have headings too, and with no
// keyword to exclude them by (the whole point of the generic
// catch-all is to skip needing one), they'd get rendered as if they
// were sections of the posting itself. `itemprop="text"` marks where
// the actual article content starts and `</article>` where it ends —
// both standard WordPress theme conventions, verified consistent
// across this source's listing pages and individual post pages alike.
// Falls back to the full, unscoped page when either marker is
// missing, so a source that doesn't use this convention degrades to
// today's behavior rather than losing everything.
function scopeToArticleBody(html: string): string {
  const startMarker = 'itemprop="text"';
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf("</article>", startIdx);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return html;
  return html.slice(startIdx, endIdx);
}

export function extractHtmlNotificationFields(html: string): HtmlNotificationExtraction {
  const sections = parseSections(scopeToArticleBody(html));

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
    sections.documentsRequiredRaw.length > 0 ||
    sections.examPatternRaw.length > 0 ||
    sections.faqRaw.length > 0 ||
    sections.conclusionRaw.length > 0 ||
    sections.genericSections.length > 0 ||
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

  // These three do the same job the PDF pipeline's extractStructuredFields
  // does for a linked PDF: turn the raw "label | value" rows into the
  // canonical {label,date}[] / {general,reserved} / number shapes the
  // review-draft form's inputs actually read. The functions themselves
  // already existed above — they just weren't being called, which is why
  // Application Start/End, Correction/Exam/Admit Card/Result dates,
  // the fee inputs, and Total Vacancies stayed empty on the review page
  // even though the raw data (visible in "Raw extracted data") clearly
  // had everything needed to fill them in.
  // These flatten the per-table blocks back into one row list — the
  // canonical parsers don't care which table a "label | value" row came
  // from, they just want every row under the heading.
  const canonicalDates = extractCanonicalDates(sections.importantDatesRaw.flat());
  const canonicalFee = extractCanonicalFee(sections.applicationFeeRaw.flat());
  const canonicalVacancies = extractCanonicalVacancies(sections.postDetailsRaw.flat());

  // Joins each table's own rows with " || " (unchanged), then joins
  // multiple tables under one heading with TABLE_SEP — an explicit,
  // always-correct boundary marker (it comes straight from a real
  // `<table>` tag pair) that lib/pipeTables.ts's parsePipeTables splits
  // back apart, instead of the old approach of flattening every table
  // into one blob and trying to re-detect boundaries later by guessing
  // (e.g. "does a header row reappear?") — which only ever worked for
  // the specific shapes it was written against.
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