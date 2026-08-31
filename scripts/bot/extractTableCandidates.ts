import { Candidate, isNotificationLike } from "./extract";

const TABLE_ROW_PATTERN = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
const CELL_PATTERN = /<td\b[^>]*>([\s\S]*?)<\/td>/gi;
const LINK_PATTERN = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

const PREFERRED_LINK_LABELS = ["advertisement", "important notice", "notification", "notice"];

function stripDecorativeEmoji(text: string): string {
  return text.replace(/\u{1F525}️?/gu, "").replace(/[ \t]{2,}/g, " ").trim();
}

function stripTags(html: string): string {
  return stripDecorativeEmoji(
    html
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function stripLinksEntirely(html: string): string {
  return stripTags(html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, " "));
}

function countLinks(html: string): number {
  return (html.match(/<a\b[^>]*>/gi) || []).length;
}

const MIN_SUBJECT_LENGTH = 25;

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

    if (!isNotificationLike(subject)) continue;

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