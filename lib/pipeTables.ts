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

// Matches a table's own "Total" row label — deliberately just the bare
// word (plus its common Hindi equivalents), not "total vacancies" /
// "total posts" / "grand total" as fixed whole phrases: those all
// still match (each contains the word "total"), but so does a plain
// "Total" row with nothing else in it — which a Vacancy table's row
// might spell out in full while an Exam Pattern or Fee table's just
// calls "Total". A row-label pattern this narrow was fine back when
// this only had to find one specific table's total row; it stopped
// being fine once the same constant took on bolding a total row in
// ANY table (see PipeTableOrText below) regardless of what section
// it's in. Shared by the vacancy-breakdown parser (lib/server/data.ts,
// which uses it to find the count column and to skip the total row
// when building a category list) and PipeTableOrText, so both stay in
// sync on what counts as "a total row" instead of drifting apart.
export const TOTAL_ROW_LABEL = /\btotal\b|कुल|योग/i;

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

// This source writes FAQs in two different shapes depending on the
// page's own markup — most commonly one <p> for the question and a
// SEPARATE following <p> for the answer (captured as two consecutive
// faqText entries: "प्रश्न 1: ...?" then "उत्तर: ..."), but sometimes
// as one block combining both ("Q1. <question>? Ans: <answer>.", seen
// where a source wraps each FAQ in a <div> with a <br/> between them —
// the bot's leaf-div fallback collapses that br into a plain space).
// Treating every line as already "combined" (the original assumption
// here) silently mis-paired the far more common two-line shape: each
// question line matched too (its own "Ans:"/"उत्तर:" marker just
// doesn't exist in it, so the regex fails to match at all and it fell
// back to being its own zero-answer FAQ), and separately each answer
// line ALSO "matched" as a combined line with an empty question — the
// उत्तर marker sits at the very start with nothing before it. Real
// backfill data on already-published pages caught this directly: every
// SBI/NICL-shaped FAQ list came out as alternating empty-answer and
// empty-question entries instead of one Q+A pair each.
//
// ANSWER_ONLY matches a line that IS the answer, and only the answer —
// the marker sits right at the start (nothing meaningful precedes it).
// COMBINED matches a line carrying both a real question AND its answer
// (requires a non-empty, real question portion before the marker, so
// it can't accidentally match an answer-only line the way the old
// single regex did). Both require the marker's own colon/period right
// after it — "उत्तर" bare (no punctuation immediately following) also
// turns up as an ordinary WORD inside a question itself ("गलत उत्तरों
// के लिए" — "for wrong answers", part of a negative-marking question,
// not the marker), which an unpunctuated match wrongly split mid-
// question. Every real marker instance seen in practice ("उत्तर:",
// "Ans:", "प्रश्न 1:") does carry the colon, so requiring it costs
// nothing on the intended matches while ruling out this collision.
const ANSWER_ONLY = /^\s*(?:ans(?:wer)?|उत्तर)\s*[:.]\s*(.+)$/i;
const COMBINED = /^\s*(?:q\.?\s*\d*\s*[.):]?\s*)?(.+?)\s*(?:ans(?:wer)?|उत्तर)\s*[:.]\s*(.+)$/i;
const QUESTION_PREFIX = /^\s*(?:q\.?\s*\d*\s*[.):]?\s*|प्रश्न\s*\d*\s*[:.]?\s*)/i;

// Shared by the draft review page's own FAQ editor (pre-filling it from
// the bot's raw faqText) and approveDraft's default (see lib/server/
// data.ts) — the same parse either way, so an admin-reviewed FAQ list
// and one that skipped review entirely (e.g. bulk-approve) look the
// same, not "reviewed" vs "one big unsplit paragraph".
export function parseFaqLines(lines: string[]): { question: string; answer: string }[] {
  const result: { question: string; answer: string }[] = [];
  let pendingQuestion: string | null = null;

  const flushPending = () => {
    if (pendingQuestion !== null) {
      result.push({ question: pendingQuestion, answer: "" });
      pendingQuestion = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const answerOnly = line.match(ANSWER_ONLY);
    if (answerOnly && pendingQuestion !== null) {
      result.push({ question: pendingQuestion, answer: answerOnly[1].trim() });
      pendingQuestion = null;
      continue;
    }

    const combined = line.match(COMBINED);
    if (combined) {
      flushPending();
      result.push({ question: combined[1].trim().replace(QUESTION_PREFIX, "").trim(), answer: combined[2].trim() });
      continue;
    }

    // Plain question line (no answer marker anywhere in it, or an
    // answer marker with no question pending to attach it to) — starts
    // a new pending question; any earlier pending one that never got
    // its answer is flushed as a zero-answer entry.
    flushPending();
    pendingQuestion = line.replace(QUESTION_PREFIX, "").trim();
  }
  flushPending();

  // A source's FAQ block routinely ends with one extra promotional
  // line ("👉 Bihar Job Portal", "...biharjob.co.in पर विजिट करते
  // रहें।") with no answer marker of its own — captured as a real
  // faqText entry (it genuinely is part of that section), but it isn't
  // a question, so it always comes out with no answer (or, for a bare
  // trailing answer marker with nothing pending, no question). Neither
  // half is useful to show as an FAQ; dropping only the entries with a
  // missing half — never ones with both — can't remove a genuinely
  // answered FAQ.
  return result.filter((faq) => faq.question && faq.answer);
}
