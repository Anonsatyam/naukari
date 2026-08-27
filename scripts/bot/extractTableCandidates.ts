import { Candidate } from "./extract";

const TABLE_ROW_PATTERN = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
const CELL_PATTERN = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
const LINK_PATTERN = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

// When a row's "View/Download" column has several PDFs (a main notice,
// a roster breakdown, a declaration form, answer keys...), pick the one
// most likely to be the actual notification — in this preference order —
// rather than creating one near-duplicate draft per attachment.
const PREFERRED_LINK_LABELS = ["advertisement", "important notice", "notification", "notice"];

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Strips out entire <a>...</a> blocks (tag AND their text content),
// leaving only whatever plain text sits outside any link. A cell like
// "View/Download" that's composed almost entirely of link labels
// reduces to nearly nothing under this — which is exactly the signal
// needed to tell it apart from a genuinely descriptive subject cell.
function stripLinksEntirely(html: string): string {
  return stripTags(html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, " "));
}

function countLinks(html: string): number {
  return (html.match(/<a\b[^>]*>/gi) || []).length;
}

const MIN_SUBJECT_LENGTH = 25;

/**
 * Identifies which cell in a row holds the real descriptive subject,
 * as distinct from a "View/Download" style cell that's mostly a list
 * of generically-labeled links.
 *
 * Primary case (the common one): the subject cell has little or no
 * link content of its own, so the cell with the most text *outside*
 * any links wins — this is what a naive "longest cell" comparison gets
 * wrong, since concatenating several link labels together can easily
 * out-length the actual subject sentence.
 *
 * Fallback case: some rows put the entire subject inside one link
 * itself (e.g. "Click to view/download ..."). There, prefer a cell
 * with at most one link and substantial raw text, over a cell with
 * several short links.
 */
function findSubjectCell(cellHtmls: string[]): string | null {
  let best: string | null = null;
  for (const cellHtml of cellHtmls) {
    const plain = stripLinksEntirely(cellHtml);
    if (plain.length >= MIN_SUBJECT_LENGTH && (!best || plain.length > best.length)) {
      best = plain;
    }
  }
  if (best) return best;

  let fallback: string | null = null;
  for (const cellHtml of cellHtmls) {
    if (countLinks(cellHtml) > 1) continue;
    const raw = stripTags(cellHtml);
    if (raw.length >= MIN_SUBJECT_LENGTH && (!fallback || raw.length > fallback.length)) {
      fallback = raw;
    }
  }
  return fallback;
}

function isPdfHref(href: string): boolean {
  return href.toLowerCase().split("?")[0].endsWith(".pdf");
}

function pickPrimaryLink(rowHtml: string, baseUrl: string): string | null {
  const pattern = new RegExp(LINK_PATTERN.source, "gi");
  const pdfLinks: { label: string; url: string }[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(rowHtml)) !== null) {
    const href = match[1];
    if (!isPdfHref(href)) continue;
    try {
      pdfLinks.push({ label: stripTags(match[2]).toLowerCase(), url: new URL(href, baseUrl).toString() });
    } catch {
      continue;
    }
  }

  if (pdfLinks.length === 0) return null;

  for (const preferred of PREFERRED_LINK_LABELS) {
    const found = pdfLinks.find((l) => l.label.includes(preferred));
    if (found) return found.url;
  }

  return pdfLinks[0].url;
}

/**
 * Extracts candidates from table-based listing pages, where the real
 * descriptive subject ("For the Post of School Teacher under Education
 * Department...") sits in its own table cell, entirely separate from
 * the PDF download links — which are typically labeled generically
 * ("Important Notice", "Advertisement") rather than descriptively.
 * `extractCandidates` alone would either miss these links (generic
 * labels rarely match a keyword on their own) or, worse, use the
 * useless generic label as the title instead of the real subject
 * sitting right next to it in the row.
 *
 * Heuristic: within each table row, the longest plain-text cell is
 * treated as the subject — this reliably picks out the descriptive
 * column over a date, a serial number, or a short category label,
 * without needing to know any particular site's specific column
 * layout.
 */
export function extractTableCandidates(html: string, baseUrl: string): Candidate[] {
  const candidates: Candidate[] = [];
  const rowPattern = new RegExp(TABLE_ROW_PATTERN.source, "gi");
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const rowHtml = rowMatch[1];

    const cellPattern = new RegExp(CELL_PATTERN.source, "gi");
    const cellHtmls: string[] = [];
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellPattern.exec(rowHtml)) !== null) {
      cellHtmls.push(cellMatch[1]);
    }

    if (cellHtmls.length === 0) continue;

    const subject = findSubjectCell(cellHtmls);
    if (!subject) continue;

    const primaryLink = pickPrimaryLink(rowHtml, baseUrl);
    if (!primaryLink) continue;

    candidates.push({ title: subject, url: primaryLink });
  }

  const seen = new Set<string>();
  return candidates.filter((c) => {
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });
}