import { loadEnvLocal } from "./loadEnv";
import { fetchInsecure } from "./fetchInsecure";
import { fetchPageWithPlaywright, closeSharedBrowser } from "./fetchWithPlaywright";
import { SOURCES } from "./sources";
import { extractCandidates, splitSectionsFromListings, Candidate } from "./extract";
import { extractTableCandidates } from "./extractTableCandidates";
import { extractFields } from "./extractFields";
import { extractPdfText } from "./parsePdf";
import { extractStructuredFields, ExtractedStructuredFields } from "./extractStructuredFields";
import { extractHtmlNotificationFields } from "./extractHtmlNotificationFields";

loadEnvLocal();

const SITE_URL = process.env.BOT_SITE_URL || "http://localhost:3000";
const BOT_API_SECRET = process.env.BOT_API_SECRET;
// Raised from 15 now that the bot actually crawls into a source's full
// "View More" listing page (see extract.ts's VIEW_MORE_PATTERN) rather
// than only ever seeing the homepage widget's ~10 most-recent links —
// biharjob.co.in's combined Jobs/Results/Admit Card listings measured
// at 77 unique candidates in one live check, so this needs real
// headroom above that to avoid silently truncating, not just enough
// to cover today's count exactly.
const MAX_CANDIDATES_PER_SOURCE = 120;
const MAX_SECTIONS_PER_SOURCE = 5;
// Playwright page loads take several seconds each, versus milliseconds
// for the normal fetch — a lower section limit keeps the added cost of
// testing this hypothesis bounded rather than multiplying it by 5.
const MAX_SECTIONS_PER_SOURCE_PLAYWRIGHT = 2;

// A single isolated request to a candidate's detail page reliably
// returns the full page; a burst of many fired back-to-back within
// under a minute reliably came back with nothing extractable, with no
// HTTP error at all — the signature of a rate-limiter/WAF issuing a
// soft-blocked (still HTTP 200) response to a burst rather than an
// outright block. Spacing requests out is the direct fix for that, not
// a network/extraction bug — and matters even more now that a single
// source can have dozens of candidates instead of a handful.
const DETAIL_FETCH_DELAY_MS = 1200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Skips drafting a posting whose application deadline has *definitely*
// already passed — nobody can still apply to it. Deliberately only
// acts when a clean "Application End" date was actually extracted and
// parses; a posting with a messy/relative/missing date is kept rather
// than guessed at, since wrongly dropping a still-open posting is
// worse than occasionally drafting one that turns out to be expired
// (a human reviews every draft before it goes live anyway).
function isDefinitelyExpired(extractedFields: { importantDates?: { label: string; date: string }[] }): boolean {
  const endDate = extractedFields.importantDates?.find((d) => d.label === "Application End")?.date;
  if (!endDate) return false;
  const end = new Date(endDate).getTime();
  if (Number.isNaN(end)) return false;
  // Compared against the start of today, not the current instant, so a
  // deadline of "today" is never treated as already expired.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return end < startOfToday.getTime();
}

/**
 * These sources all share one government CMS platform
 * (state.bihar.gov.in) and have shown a mix of redirect loops and
 * timeouts against a plain HTTP fetch. The hypothesis: a real browser's
 * cookie/session handling resolves what a stateless HTTP client can't.
 * Scoped by hostname rather than a hand-picked list, so it
 * automatically covers this whole platform, including anything added
 * to it later.
 */
function shouldUsePlaywright(url: string): boolean {
  try {
    return new URL(url).hostname === "state.bihar.gov.in";
  } catch {
    return false;
  }
}

/**
 * When a section link's own URL identifies what kind of listing it
 * is (biharjob.co.in's /result/ or /admit-card/ pages), every
 * candidate crawled from it gets tagged with that as a sectionHint —
 * see Candidate.sectionHint in extract.ts for why that beats guessing
 * from the posting's own title. Anything else (the homepage's generic
 * "Latest Jobs" listing, a "View More" link whose target doesn't
 * match either pattern) is left unhinted, falling back to title-
 * keyword classification exactly as before.
 */
function inferSectionDraftTypeHint(sectionUrl: string): "result" | "admit_card" | undefined {
  try {
    const path = new URL(sectionUrl).pathname.toLowerCase();
    if (path.includes("admit-card") || path.includes("admit_card")) return "admit_card";
    if (path.includes("result")) return "result";
  } catch {
    // ignore — no hint
  }
  return undefined;
}

async function postJson(path: string, body: unknown) {
  const res = await fetch(`${SITE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BOT_API_SECRET}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function logActivity(status: "success" | "warning" | "error", message: string) {
  console.log(`[${status}] ${message}`);
  await postJson("/api/bot/log", { status, message }).catch(() => {
    // Logging is best-effort — don't let a logging failure crash the run.
  });
}

function extractErrorDetail(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  const cause =
    err instanceof Error && "cause" in err && err.cause
      ? ` (cause: ${
          typeof err.cause === "object" && err.cause && "message" in err.cause
            ? (err.cause as { message: string }).message
            : String(err.cause)
        })`
      : "";
  return `${message}${cause}`;
}

/**
 * If the candidate links directly to a PDF, download it and try to
 * pull structured fields (dates, fees, vacancy count) out of its text.
 * Returns an empty object for non-PDF links, scanned/image PDFs with
 * no extractable text, or anything that fails — this is a best-effort
 * enhancement, not something the rest of the run should depend on.
 */
async function tryExtractPdfFields(candidate: Candidate): Promise<ExtractedStructuredFields> {
  if (!candidate.url.toLowerCase().endsWith(".pdf")) return {};

  try {
    const res = await fetchInsecure(candidate.url, {
      headers: { "User-Agent": "BiharSarkariNaukriBot/1.0" },
    });
    if (!res.ok) return {};

    const buffer = await res.buffer();
    const text = await extractPdfText(buffer);
    return extractStructuredFields(text);
  } catch {
    return {};
  }
}

/**
 * Sibling to tryExtractPdfFields: for sources whose structured fields
 * live directly in the post's own HTML (abc.com -style pages,
 * which never link out to a separate notification PDF — everything is
 * on the page itself) rather than a linked PDF, fetch the candidate's
 * own page and pull fields out of it directly via
 * extractHtmlNotificationFields. Same best-effort contract as the PDF
 * version — any failure just yields {} rather than aborting the run.
 */
async function tryExtractHtmlFields(
  candidate: Candidate
): Promise<{ organization?: string; fields: ExtractedStructuredFields }> {
  if (candidate.url.toLowerCase().endsWith(".pdf")) return { fields: {} };

  try {
    const res = await fetchInsecure(candidate.url, {
      headers: { "User-Agent": "BiharSarkariNaukriBot/1.0" },
    });
    if (!res.ok) return { fields: {} };

    const html = await res.text();
    return extractHtmlNotificationFields(html);
  } catch {
    return { fields: {} };
  }
}

/** Fetches a page and extracts candidates from it, or a warning detail on failure. */
async function fetchAndExtractCandidates(
  url: string
): Promise<{ candidates: Candidate[] } | { error: string }> {
  if (shouldUsePlaywright(url)) {
    try {
      const result = await fetchPageWithPlaywright(url);
      if (!result.ok) {
        return { error: `fetch failed (HTTP ${result.status}) [playwright]` };
      }
      return { candidates: mergeCandidateSources(result.html, result.finalUrl) };
    } catch (err) {
      return { error: `${extractErrorDetail(err)} [playwright]` };
    }
  }

  const res = await fetchInsecure(url, {
    headers: { "User-Agent": "BiharSarkariNaukriBot/1.0" },
  });

  if (!res.ok) {
    const detail =
      res.status >= 300 && res.status < 400
        ? res.headers.location
          ? ` — still redirecting after 5 hops (likely a loop), last target: ${res.headers.location}`
          : " — redirect response had no Location header to follow"
        : "";
    return { error: `fetch failed (HTTP ${res.status})${detail}` };
  }

  const html = await res.text();
  return { candidates: mergeCandidateSources(html, url) };
}

/**
 * Runs both extraction strategies on the same page and merges the
 * results: `extractCandidates` for simple anchor-based listings, and
 * `extractTableCandidates` for pages structured as a table where the
 * real subject text and the PDF link live in separate cells. A page
 * without a matching table structure simply yields nothing extra from
 * the second pass, so this is safe to run on every page unconditionally.
 */
function mergeCandidateSources(html: string, baseUrl: string): Candidate[] {
  const fromTables = extractTableCandidates(html, baseUrl);
  if (fromTables.length > 0) {
    return fromTables;
  }
  return extractCandidates(html, baseUrl);
}

async function run() {
  if (!BOT_API_SECRET) {
    console.error("BOT_API_SECRET is not set. Add it to your environment before running the bot.");
    process.exitCode = 1;
    return;
  }

  console.log(`Bihar Sarkari Naukri bot — checking ${SOURCES.length} source(s) against ${SITE_URL}\n`);

  let created = 0;
  let skipped = 0;
  let expired = 0;
  let errors = 0;

  try {
    for (const source of SOURCES) {
      try {
        // Certificate validation is intentionally relaxed here — see
        // fetchInsecure.ts for the full reasoning. These are read-only
        // GET requests, and every result is reviewed by a human admin
        // before anything goes live.
        const homepageResult = await fetchAndExtractCandidates(source.url);

        if ("error" in homepageResult) {
          await logActivity("warning", `${source.name}: ${homepageResult.error}`);
          errors++;
          continue;
        }

        const { listings: directListings, sections } = splitSectionsFromListings(
          homepageResult.candidates
        );

        const crawledListings: Candidate[] = [];
        const sectionLimit = shouldUsePlaywright(source.url)
          ? MAX_SECTIONS_PER_SOURCE_PLAYWRIGHT
          : MAX_SECTIONS_PER_SOURCE;
        for (const section of sections.slice(0, sectionLimit)) {
          const sectionResult = await fetchAndExtractCandidates(section.url);
          if ("candidates" in sectionResult) {
            const { listings } = splitSectionsFromListings(sectionResult.candidates);
            const sectionHint = inferSectionDraftTypeHint(section.url);
            crawledListings.push(
              ...(sectionHint ? listings.map((c) => ({ ...c, sectionHint })) : listings)
            );
          }
        }

        const seenUrls = new Set<string>();
        const allListings = [...directListings, ...crawledListings].filter((c) => {
          if (seenUrls.has(c.url)) return false;
          seenUrls.add(c.url);
          return true;
        });

        if (allListings.length === 0) {
          await logActivity(
            "success",
            `${source.name}: checked, no notification-like links found${shouldUsePlaywright(source.url) ? " [playwright]" : ""}`
          );
          continue;
        }

        const candidatesToProcess = allListings.slice(0, MAX_CANDIDATES_PER_SOURCE);
        for (let i = 0; i < candidatesToProcess.length; i++) {
          const candidate = candidatesToProcess[i];
          if (i > 0) await sleep(DETAIL_FETCH_DELAY_MS);

          const draftInput = extractFields(candidate, source.orgHint);

          const pdfFields = await tryExtractPdfFields(candidate);
          const fieldsFoundInPdf = Object.keys(pdfFields).length;
          if (fieldsFoundInPdf > 0) {
            draftInput.extractedFields = { ...draftInput.extractedFields, ...pdfFields };
            // Now genuinely reading structured fields out of the actual
            // notification document, not just guessing from link text —
            // this is exactly the case "high" confidence is reserved for.
            draftInput.confidence = fieldsFoundInPdf >= 2 ? "high" : "medium";
          }

          // Sources like abc.com carry their structured fields in
          // the post's own HTML rather than a linked PDF — only attempt
          // this when the PDF pass came up empty, so a source that has
          // both (rare) doesn't do two fetches for nothing.
          if (fieldsFoundInPdf === 0) {
            const { organization, fields: htmlFields } = await tryExtractHtmlFields(candidate);
            const fieldsFoundInHtml = Object.keys(htmlFields).length;
            if (fieldsFoundInHtml > 0) {
              draftInput.extractedFields = { ...draftInput.extractedFields, ...htmlFields };
              draftInput.confidence = fieldsFoundInHtml >= 2 ? "high" : "medium";
            }
            // Prefer the organization actually printed on the post over
            // the source's generic orgHint fallback.
            if (organization) {
              draftInput.organization = organization;
            }
          }

          if (isDefinitelyExpired(draftInput.extractedFields)) {
            expired++;
            console.log(
              `  ⏭ [${source.name}] Skipped (application deadline passed): ${candidate.title}`
            );
            continue;
          }

          const result = await postJson("/api/bot/drafts", draftInput);

          if (!result.ok) {
            console.error(`  ✗ [${source.name}] Failed to submit "${candidate.title}": ${JSON.stringify(result.data)}`);
            errors++;
          } else if (result.data.skipped) {
            skipped++;
          } else {
            created++;
            console.log(
              `  ✓ [${source.name}] ${draftInput.draftType} draft created (${draftInput.confidence} confidence): ${candidate.title}`
            );
          }
        }
      } catch (err) {
        await logActivity("error", `${source.name}: ${extractErrorDetail(err)}`);
        errors++;
      }
    }
  } finally {
    await closeSharedBrowser();
  }

  console.log(
    `\nDone. ${created} draft(s) created, ${skipped} skipped (already known), ${expired} skipped (deadline passed), ${errors} error(s).`
  );
}

run();