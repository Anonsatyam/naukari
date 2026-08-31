export const TABLE_SEP = "\n<<<TABLE_BREAK>>>\n";
const ROW_SEP = " || ";
const CELL_SEP = " | ";

export interface PipeTable {
  caption?: string;
  header: string[];
  body: string[][];
}

export function buildPipeTable(header: string[], rows: string[][]): string {
  const allRows = [header, ...rows].filter((row) => row.some((cell) => cell.trim()));
  return allRows.map((row) => row.map((c) => c.trim()).join(CELL_SEP)).join(ROW_SEP);
}

function parseRows(tableText: string): string[][] {
  return tableText
    .split(ROW_SEP)
    .map((row) => row.split(CELL_SEP).map((cell) => cell.trim()))
    .filter((row) => row.some(Boolean));
}

const normalizeRow = (row: string[]) => row.map((c) => c.trim().toLowerCase()).join("|");

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

export function parsePipeTables(text: string): PipeTable[] {
  if (!text || !text.includes(CELL_SEP)) return [];

  if (text.includes(TABLE_SEP)) {
    return text
      .split(TABLE_SEP)
      .map((chunk) => toPipeTable(parseRows(chunk)))
      .filter((t): t is PipeTable => t !== null);
  }

  const groups = splitByRepeatedHeader(parseRows(text));
  return groups.map((rows) => toPipeTable(rows)).filter((t): t is PipeTable => t !== null);
}

export type PipeBlock = { type: "table"; table: PipeTable } | { type: "list"; items: string[] };

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

export const TOTAL_ROW_LABEL = /\btotal\b|कुल|योग/i;

export function firstNumber(text: string | undefined): number | undefined {
  const match = text?.match(/\d[\d,]*/);
  if (!match) return undefined;
  const n = parseInt(match[0].replace(/,/g, ""), 10);
  return Number.isNaN(n) ? undefined : n;
}

export function deriveAgeRange(ageLimit: unknown): { minAge?: number; maxAge?: number } {
  if (typeof ageLimit !== "string") return {};
  const table = parsePipeTables(ageLimit)[0];
  const row = table?.body[0];
  if (!row) return {};
  const minAge = firstNumber(row[1]);
  const maxAge = firstNumber(row.length > 2 ? row[row.length - 1] : row[1]);
  return { minAge, maxAge };
}

const SALARY_RANGE = /(?:₹|rs\.?|inr)\s*[\d,]+(?:\/-)?\s*(?:–|-|to|se)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/i;
const SALARY_FIRST_AMOUNT = /(?:₹|rs\.?|inr)\s*([\d,]+)/i;

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

const ANSWER_ONLY = /^\s*(?:ans(?:wer)?|उत्तर)\s*[:.]\s*(.+)$/i;
const COMBINED = /^\s*(?:q\.?\s*\d*\s*[.):]?\s*)?(.+?)\s*(?:ans(?:wer)?|उत्तर)\s*[:.]\s*(.+)$/i;
const QUESTION_PREFIX = /^\s*(?:q\.?\s*\d*\s*[.):]?\s*|प्रश्न\s*\d*\s*[:.]?\s*)/i;

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

    flushPending();
    pendingQuestion = line.replace(QUESTION_PREFIX, "").trim();
  }
  flushPending();

  return result.filter((faq) => faq.question && faq.answer);
}
