export interface Candidate {
  title: string;
  url: string;
  sectionHint?: "job" | "result" | "admit_card";
}

function stripDecorativeEmoji(text: string): string {
  return text.replace(/\u{1F525}️?/gu, "").replace(/[ \t]{2,}/g, " ").trim();
}

const NOTIFICATION_KEYWORDS = [
  "recruitment",
  "vacancy",
  "vacancies",
  "bharti",
  "niyukti",
  "result",
  "admit card",
  "e-admit",
  "call letter",
  "hall ticket",
  "advt",
  "advertisement",
  "for the post of",
  "for the posts of",
];

const EXCLUDE_KEYWORDS = [
  "notice board",
  "notice section",
  "model code of conduct",
  "handbook",
  "hr policy",
  "compendium",
  "election report",
  "annual report",
  "right to information",
  "rti ",
  "tender notice",
  "e-tender",
  "e- tender",
  "leased line",
  "hiring vehicles",
  "fraudulent",
  "current vacancies",
  "employers connect",
  "facility to",
];

export function isNotificationLike(title: string): boolean {
  const lowerText = title.toLowerCase();
  if (EXCLUDE_KEYWORDS.some((kw) => lowerText.includes(kw))) return false;
  return NOTIFICATION_KEYWORDS.some((kw) => lowerText.includes(kw));
}

const TRUSTED_LIST_CONTAINER_PATTERN = /<ul\b[^>]*class=["'][^"']*\blcp_catlist\b[^"']*["'][^>]*>([\s\S]*?)<\/ul>/gi;

function extractTrustedListLinks(html: string, baseUrl: string): { candidates: Candidate[]; remainingHtml: string } {
  const candidates: Candidate[] = [];
  let remainingHtml = html;
  const containerPattern = new RegExp(TRUSTED_LIST_CONTAINER_PATTERN.source, "gi");
  let containerMatch: RegExpExecArray | null;

  while ((containerMatch = containerPattern.exec(html)) !== null) {
    const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let linkMatch: RegExpExecArray | null;
    while ((linkMatch = linkPattern.exec(containerMatch[1])) !== null) {
      const text = stripDecorativeEmoji(
        linkMatch[2]
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      );
      if (!text) continue;
      try {
        candidates.push({ title: text, url: new URL(linkMatch[1], baseUrl).toString() });
      } catch {
        continue;
      }
    }
    remainingHtml = remainingHtml.replace(containerMatch[0], "");
  }

  return { candidates, remainingHtml };
}

export function extractCandidates(html: string, baseUrl: string): Candidate[] {
  const { candidates: trustedCandidates, remainingHtml } = extractTrustedListLinks(html, baseUrl);

  const candidates: Candidate[] = [...trustedCandidates];
  const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(remainingHtml)) !== null) {
    const href = match[1];
    const text = stripDecorativeEmoji(
      match[2]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    );

    if (!text) continue;

    if (!isSectionLink(text)) {
      if (text.length < 10) continue;
      if (!isNotificationLike(text)) continue;
    }

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

const SECTION_LABELS = new Set([
  "recruitment",
  "recruitments",
  "result",
  "results",
  "admit card",
  "admit cards",
  "admit card call letter",
  "call letter",
  "call letters",
  "notification",
  "notifications",
  "important notification",
  "important notifications",
  "notice",
  "notices",
  "important notice",
  "important notices",
  "vacancy",
  "vacancies",
  "current vacancy",
  "current vacancies",
  "career",
  "careers",
  "tender",
  "tenders",
  "advertisement",
  "advertisements",
]);

function normalizeForSectionCheck(text: string): string {
  return text
    .toLowerCase()
    .replace(/[/:,\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const VIEW_ALL_PATTERN =
  /^(view|see|show) all (recruitment|recruitments|result|results|admit card|admit cards|notification|notifications|notice|notices|vacancy|vacancies|advertisement|advertisements|tender|tenders)$/;

const VIEW_MORE_PATTERN = /^(view|see|show|read|load) more$/;

export function isSectionLink(title: string): boolean {
  const normalized = normalizeForSectionCheck(title);
  return SECTION_LABELS.has(normalized) || VIEW_ALL_PATTERN.test(normalized) || VIEW_MORE_PATTERN.test(normalized);
}

export interface SplitCandidates {
  listings: Candidate[];
  sections: Candidate[];
}

export function splitSectionsFromListings(candidates: Candidate[]): SplitCandidates {
  const listings: Candidate[] = [];
  const sections: Candidate[] = [];
  for (const c of candidates) {
    (isSectionLink(c.title) ? sections : listings).push(c);
  }
  return { listings, sections };
}