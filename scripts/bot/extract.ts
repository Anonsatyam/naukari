export interface Candidate {
  title: string;
  url: string;
}

// Source pages routinely prefix a title with a decorative "🔥" flag —
// meaningless on our site, so it's stripped right where every raw
// title first gets its tags stripped, before anything else ever sees it.
function stripDecorativeEmoji(text: string): string {
  return text.replace(/\u{1F525}️?/gu, "").replace(/[ \t]{2,}/g, " ").trim();
}

// Strong positive signals — a link is genuinely worth investigating further.
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
  "for the post of", // extremely common Indian govt job-posting phrasing
  "for the posts of", // plural variant of the same pattern
  // (e.g. "For the Post of School Teacher under Education Department...")
  // that doesn't itself contain any of the other keywords above.
];

// Explicit noise — even if a title happens to match something above, these
// patterns mean it's not a real job/result/admit-card notification (a
// department's navigation link, a policy document, tender for goods/
// services, an election/administrative report, etc.). Checked first.
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
  "current vacancies", // generic careers-page nav link, not a specific posting
  "employers connect",
  "facility to", // account/system-feature notices, e.g. "Facility to edit
  // GENDER in OTR", "Facility to Candidates to update data in Profile
  // Tab" — real BPSC notices, but administrative, not a job posting.
];

/**
 * Whether a title reads like a genuine job/result/admit-card
 * notification, independent of where it was found (a link's own
 * anchor text, or a table row's subject cell). Shared so both
 * extraction strategies apply the exact same judgment rather than
 * drifting apart over time.
 */
export function isNotificationLike(title: string): boolean {
  const lowerText = title.toLowerCase();
  if (EXCLUDE_KEYWORDS.some((kw) => lowerText.includes(kw))) return false;
  return NOTIFICATION_KEYWORDS.some((kw) => lowerText.includes(kw));
}

/**
 * Rule-based extraction: scans anchor tags for links that look like
 * recruitment notifications, by keyword match on link text or a .pdf
 * href. This is intentionally simple (per the Phase 1 decision to use
 * free, rule-based extraction rather than an AI/OCR pipeline) — it will
 * need real-world tuning once run against actual source pages, since
 * government site markup varies a lot.
 */
// WordPress's "List Category Posts" plugin renders a listing page's
// actual posts inside a <ul class="lcp_catlist"> — verified against
// biharjob.co.in's homepage widget, its full Jobs/Results/Admit Card
// listing pages, all consistently — and nothing else (nav, footer,
// sidebar widgets) ever lands inside it. That makes container
// membership alone sufficient proof a link is a real posting, which
// sidesteps keyword-matching entirely for anything found this way.
// Keyword matching is a fixed vocabulary that can only ever recognize
// phrasing someone thought to list in advance — real example that
// slipped through it: "Gramin Dak Sevak (GDS) Online Engagement
// Schedule-II July 2026", which is a genuine, current job posting that
// contains none of "recruitment"/"vacancy"/"bharti"/etc. India Post
// officially calls GDS positions "engaged", not "recruited" — a
// keyword list can be patched for THIS one case, but the same failure
// mode recurs for every other phrasing nobody's added yet (as seen on
// the very same run: two LNMU admission "Merit List" results, also
// missed, also genuinely on the page). Trusting the container this
// listing is actually rendered in has no such blind spot.
const TRUSTED_LIST_CONTAINER_PATTERN = /<ul\b[^>]*class=["'][^"']*\blcp_catlist\b[^"']*["'][^>]*>([\s\S]*?)<\/ul>/gi;

/**
 * Pulls every link out of each trusted-list container found on the
 * page, with no title filtering at all beyond "has visible text" —
 * and returns the page HTML with those container blocks blanked out,
 * so the keyword-based fallback pass below doesn't re-scan (and
 * potentially reject) the exact same links a second time.
 */
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

  // Everything outside a trusted-list container still goes through the
  // keyword/section-link filter below — that's what finds a "View
  // More" nav link (which lives in the page's surrounding chrome, not
  // inside the listing itself) and covers any page that doesn't use
  // this particular plugin at all.
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

    // A "View More"/"See All Results"-style nav link is admitted
    // regardless of the length/keyword filters below — those exist to
    // reject noise from being mistaken for an actual notification
    // title, but a section link is deliberately short and generic
    // (isSectionLink is the check that actually validates it), so
    // applying the notification-title filters to it first meant it
    // never survived long enough for splitSectionsFromListings to ever
    // see it and route it to the crawl-deeper path.
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

// Generic top-nav category labels (Recruitment, Result, Admit Card, ...)
// point at a LISTING page containing the real, individual notifications —
// they are not themselves a posting. Matched by exact normalized text,
// not a substring/length heuristic, so a genuinely specific title (even
// a short one, if any exist) is never misclassified.
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

// Handles "View All Advertisements", "See All Results", "View All
// Notices" etc. — a common "see more" nav pattern discovered from
// BPSC's real "View All Advertisements" link, which pointed at a full
// listing page the bot wasn't otherwise recognizing as worth crawling
// into. Generalized as a pattern rather than one hardcoded phrase, so
// it also catches the same convention on other sources.
const VIEW_ALL_PATTERN =
  /^(view|see|show) all (recruitment|recruitments|result|results|admit card|admit cards|notification|notifications|notice|notices|vacancy|vacancies|advertisement|advertisements|tender|tenders)$/;

// A bare "View More" / "See More" / "Read More" / "Load More" — no
// category named, unlike VIEW_ALL_PATTERN above — is the other common
// convention for "this box only shows the last handful, click through
// for the real, full listing" (seen on biharjob.co.in's homepage
// "Latest Jobs" widget, which links out to a ~50-posting listing page
// the bot was otherwise never discovering — only ever scraping the
// homepage widget's own ~10 links). Matched generically rather than
// tied to one exact phrase so it also catches whichever of these four
// verbs a given source happens to use.
const VIEW_MORE_PATTERN = /^(view|see|show|read|load) more$/;

export function isSectionLink(title: string): boolean {
  const normalized = normalizeForSectionCheck(title);
  return SECTION_LABELS.has(normalized) || VIEW_ALL_PATTERN.test(normalized) || VIEW_MORE_PATTERN.test(normalized);
}

export interface SplitCandidates {
  listings: Candidate[];
  sections: Candidate[];
}

/** Separates real, specific listing links from generic nav-category links. */
export function splitSectionsFromListings(candidates: Candidate[]): SplitCandidates {
  const listings: Candidate[] = [];
  const sections: Candidate[] = [];
  for (const c of candidates) {
    (isSectionLink(c.title) ? sections : listings).push(c);
  }
  return { listings, sections };
}