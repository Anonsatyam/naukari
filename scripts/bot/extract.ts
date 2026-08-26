export interface Candidate {
  title: string;
  url: string;
}

const NOTIFICATION_KEYWORDS = [
  "recruitment",
  "vacancy",
  "vacancies",
  "notification",
  "bharti",
  "niyukti",
  "advertisement",
  "notice",
  "result",
  "admit card",
];

/**
 * Rule-based extraction: scans anchor tags for links that look like
 * recruitment notifications, by keyword match on link text or a .pdf
 * href. This is intentionally simple (per the Phase 1 decision to use
 * free, rule-based extraction rather than an AI/OCR pipeline) — it will
 * need real-world tuning once run against actual source pages, since
 * government site markup varies a lot.
 */
export function extractCandidates(html: string, baseUrl: string): Candidate[] {
  const candidates: Candidate[] = [];
  const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(html)) !== null) {
    const href = match[1];
    const text = match[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!text || text.length < 10) continue;

    const lowerText = text.toLowerCase();
    const lowerHref = href.toLowerCase();
    const isNotificationLike =
      NOTIFICATION_KEYWORDS.some((kw) => lowerText.includes(kw)) || lowerHref.endsWith(".pdf");

    if (!isNotificationLike) continue;

    let absoluteUrl: string;
    try {
      absoluteUrl = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }

    candidates.push({ title: text, url: absoluteUrl });
  }

  const seen = new Set<string>();
  return candidates.filter((c) => {
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });
}
