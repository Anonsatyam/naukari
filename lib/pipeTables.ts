// Shared parser for the "cell | cell || row || row" pipe-encoded tables
// the bot's HTML extractor produces (extractHtmlNotificationFields.ts)
// for free-form notification sections — Post Details, Age Limit, Exam
// Pattern, Eligibility, Selection Process, Documents Required,
// Important Dates. Used by both the public job page (server component)
// and the admin draft review page (client component), so this has no
// server-only imports.
//
// Why this exists: every job source structures these sections
// differently — one table vs two, a caption sentence before the real
// header vs not, identical vs different sub-table headers (see the
// job-details-page work this session: IBPS's Exam Pattern is two
// tables with identical headers, its Age Limit is one category table,
// SBI's Age Limit is a grade table *and* a differently-headed
// relaxation table). Trying to re-detect table boundaries after the
// fact (e.g. "does a header row reappear later?") only works for the
// shapes it was written against and breaks on the next one. The actual
// fix is to never lose the boundary in the first place: the extractor
// now joins multiple tables under one heading with TABLE_SEP (a marker
// that can only come from an actual `<table>` tag boundary), so parsing
// here is exact, not heuristic.
//
// Data captured before this fix has no TABLE_SEP in it at all — for
// that legacy shape, parsePipeTables falls back to the old heuristic
// (a header row reappearing verbatim marks a second table) so already-
// published jobs keep rendering correctly without needing re-scraping.
//
// TABLE_SEP is deliberately pipe-free and highly distinctive — it must
// never be producible by ROW_SEP/CELL_SEP splitting a normal cell's
// text, and stays legible in the admin's "Raw extracted data" JSON dump.
export const TABLE_SEP = "\n<<<TABLE_BREAK>>>\n";
const ROW_SEP = " || ";
const CELL_SEP = " | ";

export interface PipeTable {
  caption?: string;
  header: string[];
  body: string[][];
}

function parseRows(tableText: string): string[][] {
  return tableText
    .split(ROW_SEP)
    .map((row) => row.split(CELL_SEP).map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));
}

const normalizeRow = (row: string[]) => row.map((c) => c.trim().toLowerCase()).join("|");

/** One table's rows -> {caption?, header, body}, pulling out a leading
 * single-cell caption row (a source table's colspan intro sentence,
 * which the extractor's tableToPairs has no notion of colspan for)
 * ahead of the real (multi-cell) header. */
function toPipeTable(rows: string[][]): PipeTable | null {
  if (rows.length === 0) return null;
  let caption: string | undefined;
  let rest = rows;
  if (rows.length > 2 && rows[0].length === 1 && rows[1].length > 1) {
    caption = rows[0][0];
    rest = rows.slice(1);
  }
  if (rest.length < 2) return null;
  const [header, ...body] = rest;
  return { caption, header, body };
}

/** Legacy fallback for text captured before TABLE_SEP existed: splits a
 * single flattened row list into multiple tables wherever its header
 * row reappears verbatim later on. */
function splitByRepeatedHeader(rows: string[][]): string[][][] {
  if (rows.length < 2) return rows.length ? [rows] : [];
  const [header, ...restBody] = rows;
  const headerKey = normalizeRow(header);
  const groups: string[][][] = [[header]];
  for (const row of restBody) {
    if (row.length === header.length && normalizeRow(row) === headerKey) {
      groups.push([row]);
    } else {
      groups[groups.length - 1].push(row);
    }
  }
  return groups;
}

/** Parses one field's full raw text into one or more distinct tables,
 * in source order. Returns [] for text that isn't table-shaped at all
 * (caller should show it as plain text instead). */
export function parsePipeTables(text: string): PipeTable[] {
  if (!text || !text.includes(CELL_SEP)) return [];

  if (text.includes(TABLE_SEP)) {
    return text
      .split(TABLE_SEP)
      .map((chunk) => toPipeTable(parseRows(chunk)))
      .filter((t): t is PipeTable => t !== null);
  }

  // Legacy path (text captured before TABLE_SEP existed): fall back to
  // detecting a second table by its header row reappearing verbatim.
  const groups = splitByRepeatedHeader(parseRows(text));
  return groups.map((rows) => toPipeTable(rows)).filter((t): t is PipeTable => t !== null);
}

export type PipeBlock = { type: "table"; table: PipeTable } | { type: "list"; items: string[] };

/**
 * Like parsePipeTables, but recognizes when a chunk is actually a flat
 * list — every row has exactly one cell, i.e. no CELL_SEP anywhere in
 * it — rather than forcing it through the table shape. That mattered
 * for two real, observed failure modes: a pure bullet list (a GDS
 * posting's 3-sentence "Exam Pattern": no exam held, how merit is
 * decided, grade conversion) has no CELL_SEP anywhere at all, so
 * parsePipeTables' up-front guard rejected it entirely and the caller
 * fell back to dumping the whole raw " || "-joined string as one
 * paragraph — the literal "||" separators show up as visible text.
 * And a field spanning a genuine list block *and* a genuine table
 * block (the same posting's Eligibility section: education bullets,
 * then a separate Physical Eligibility table) needs each block kept
 * in its own shape, not the list's first bullet mistaken for a table
 * header the way parsePipeTables' single-column fallback would read
 * it. Table-shaped chunks behave exactly as parsePipeTables already
 * does; text with no CELL_SEP anywhere still returns [] so the caller
 * can show it as plain prose.
 */
export function parsePipeBlocks(text: string): PipeBlock[] {
  if (!text) return [];
  const chunks = text.includes(TABLE_SEP) ? text.split(TABLE_SEP) : [text];
  const blocks: PipeBlock[] = [];

  for (const chunk of chunks) {
    const rows = parseRows(chunk);
    if (rows.length === 0) continue;

    if (rows.every((row) => row.length <= 1)) {
      const items = rows.map((row) => row[0]).filter(Boolean);
      if (items.length > 0) blocks.push({ type: "list", items });
      continue;
    }

    const table = toPipeTable(rows);
    if (table) blocks.push({ type: "table", table });
  }

  return blocks;
}

export function firstNumber(text: string | undefined): number | undefined {
  const match = text?.match(/\d[\d,]*/);
  if (!match) return undefined;
  const n = parseInt(match[0].replace(/,/g, ""), 10);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * Derives a single representative {minAge, maxAge} from the Age Limit
 * table(s) — the job page's top "Age Limit" stat and the Age Limit
 * Details card's headline both need one plain number pair, not a whole
 * table (and the draft review page uses this same function to pre-fill
 * its Min/Max Age inputs with a sensible starting guess). Uses the
 * *first* row of the grade/age table when there is one (sources list
 * the general/unreserved category first, which is what "Age Limit: X
 * to Y years" conventionally means — relaxations for other categories
 * are shown separately in the Age Relaxation table, so folding the
 * widest relaxed value in here would be misleading, not more
 * complete). Falls back to the first row of a category-only table
 * when there's no separate grade table.
 */
export function deriveAgeRange(ageLimit: unknown): { minAge?: number; maxAge?: number } {
  if (typeof ageLimit !== "string") return {};
  const table = parsePipeTables(ageLimit)[0];
  const row = table?.body[0];
  if (!row) return {};
  // Shape 1 (grade table): columns are [label, minAge, maxAge, ...].
  // Shape 2 (category-only table): columns are [label, ..., ageValue] —
  // reuse the same relaxation-row reading (row[0] label, last cell the
  // age/relaxation text) and pull minAge from the *next* column, if the
  // table has one, so a 3+ column category table ("Category | Min |
  // Max") still yields both numbers.
  const minAge = firstNumber(row[1]);
  const maxAge = firstNumber(row.length > 2 ? row[row.length - 1] : row[1]);
  return { minAge, maxAge };
}

// Matches a pay/salary range anywhere in free text: "₹24,050 – ₹64,480",
// "Rs. 24050 to 64480", "INR 24,050-64,480", etc. Two numbers is assumed
// to be a min-max range (the common "Basic Pay: X – Y + allowances"
// phrasing); a single bare amount is intentionally NOT matched here, to
// avoid misreading an unrelated number (a vacancy count, a pin code) in
// the same free-text block as a salary.
const SALARY_RANGE = /(?:₹|rs\.?|inr)\s*[\d,]+(?:\/-)?\s*(?:–|-|to|se)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i;
const SALARY_FIRST_AMOUNT = /(?:₹|rs\.?|inr)\s*([\d,]+)/i;

/**
 * Pulls a salary min/max out of free text (typically the Post Details
 * table's Pay Scale cell/column, e.g. "बेसिक पे: ₹24,050 – ₹64,480/- +
 * नियमानुसार भत्ते") — there's no dedicated, separately-headed "Salary"
 * section on these sources the way there is for dates/fees/age, it's
 * always folded into the post-details prose, so this is a best-effort
 * free-text scan rather than a table-column read.
 */
export function deriveSalaryRange(postDetails: unknown): { salaryMin?: number; salaryMax?: number } {
  if (typeof postDetails !== "string") return {};
  const rangeMatch = postDetails.match(SALARY_RANGE);
  if (rangeMatch) {
    const firstAmount = postDetails.slice(0, rangeMatch.index! + rangeMatch[0].length).match(SALARY_FIRST_AMOUNT);
    const min = firstAmount ? firstNumber(firstAmount[1]) : undefined;
    const max = firstNumber(rangeMatch[1]);
    if (min !== undefined && max !== undefined && max >= min) return { salaryMin: min, salaryMax: max };
  }
  return {};
}
