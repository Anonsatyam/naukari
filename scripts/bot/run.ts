import { loadEnvLocal } from "./loadEnv";
import { fetchInsecure } from "./fetchInsecure";
import { fetchPageWithPlaywright, closeSharedBrowser } from "./fetchWithPlaywright";
import { SOURCES } from "./sources";
import { extractCandidates, splitSectionsFromListings, Candidate } from "./extract";
import { extractTableCandidates } from "./extractTableCandidates";
import { extractFields } from "./extractFields";
import { extractPdfText } from "./parsePdf";
import { extractStructuredFields, ExtractedStructuredFields } from "./extractStructuredFields";

loadEnvLocal();

const SITE_URL = process.env.BOT_SITE_URL || "http://localhost:3000";
const BOT_API_SECRET = process.env.BOT_API_SECRET;
const MAX_CANDIDATES_PER_SOURCE = 15;
const MAX_SECTIONS_PER_SOURCE = 5;
// Playwright page loads take several seconds each, versus milliseconds
// for the normal fetch — a lower section limit keeps the added cost of
// testing this hypothesis bounded rather than multiplying it by 5.
const MAX_SECTIONS_PER_SOURCE_PLAYWRIGHT = 2;

/**
 * These sources all share one government CMS platform
 * (state.bihar.gov.in) and have shown a mix of redirect loops and
 * timeouts against a plain HTTP fetch. The hypothesis: a real browser's
 * cookie/session handling resolves what a stateless HTTP client can't.
 * Scoped by hostname rather than a hand-picked list, so it
 * automatically covers this whole platform, including anything added
 * to it later — not just the specific sources that happened to fail on
 * the last run (the exact set of which pages fail has been flapping
 * between redirect-loop and timeout run to run, which is itself a sign
 * this is a platform-level thing, not 27 unrelated problems).
 */
function shouldUsePlaywright(url: string): boolean {
  try {
    return new URL(url).hostname === "state.bihar.gov.in";
  } catch {
    return false;
  }
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
 * results: `extractCandidates` for simple anchor-based listings (e.g.
 * BTSC's homepage), and `extractTableCandidates` for pages structured
 * as a table where the real subject text and the PDF link live in
 * separate cells (e.g. BPSC's /advertisement/ page — see the comment
 * on extractTableCandidates for why that needed its own logic). A page
 * without a matching table structure simply yields nothing extra from
 * the second pass, so this is safe to run on every page unconditionally
 * rather than needing a per-source flag for which sites use tables.
 */
function mergeCandidateSources(html: string, baseUrl: string): Candidate[] {
  const fromTables = extractTableCandidates(html, baseUrl);
  if (fromTables.length > 0) {
    // This page is structured as a table with descriptive subject cells
    // separate from generically-labeled PDF links (see the comment on
    // extractTableCandidates). Skip the plain link scan here — it would
    // otherwise also pick up the very same PDFs under their unhelpful
    // generic link text ("Advertisement," "District-wise Roster
    // Vacancies") as redundant, worse-titled duplicates of what the
    // table-aware pass already got right.
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
  let errors = 0;

  try {
    for (const source of SOURCES) {
      try {
        // Certificate validation is intentionally relaxed here — many
        // Indian government sites have known TLS misconfigurations (a
        // missing intermediate certificate, an expired cert, a self-signed
        // cert in the chain). Browsers quietly work around these, so the
        // sites look completely fine to a human visitor; a strict client
        // correctly refuses instead. This is a deliberate, narrow
        // tradeoff: these are read-only GET requests for public
        // information, from sources verified against an official
        // government website list, and every result is reviewed by a
        // human admin before anything goes live — so a worst-case spoofed
        // response just becomes a draft that gets rejected, not a real
        // risk. Our own API calls (postJson, above) stay fully verified.
        const homepageResult = await fetchAndExtractCandidates(source.url);

        if ("error" in homepageResult) {
          await logActivity("warning", `${source.name}: ${homepageResult.error}`);
          errors++;
          continue;
        }

        const { listings: directListings, sections } = splitSectionsFromListings(
          homepageResult.candidates
        );

        // A generic nav link like "Recruitment" or "Result" points at a
        // LISTING page with the real, individual notifications — crawl
        // into a bounded number of these instead of treating the nav
        // link itself as if it were a posting (that was the exact bug:
        // a draft titled just "Recruitments" with no real data, because
        // the bot never actually visited the page that link points to).
        const crawledListings: Candidate[] = [];
        const sectionLimit = shouldUsePlaywright(source.url)
          ? MAX_SECTIONS_PER_SOURCE_PLAYWRIGHT
          : MAX_SECTIONS_PER_SOURCE;
        for (const section of sections.slice(0, sectionLimit)) {
          const sectionResult = await fetchAndExtractCandidates(section.url);
          if ("candidates" in sectionResult) {
            // Only take real listings from the section page — don't
            // recurse into any further nav links it might itself contain.
            const { listings } = splitSectionsFromListings(sectionResult.candidates);
            crawledListings.push(...listings);
          }
          // A single section page failing to fetch isn't a failure of the
          // whole source (the homepage itself already succeeded) — skip
          // it quietly rather than counting it as an error.
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

        for (const candidate of allListings.slice(0, MAX_CANDIDATES_PER_SOURCE)) {
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
    // Only actually launched if a state.bihar.gov.in source was hit —
    // this is a no-op otherwise. Always close it, success or failure,
    // so a crashed run doesn't leave an orphaned browser process behind.
    await closeSharedBrowser();
  }

  console.log(`\nDone. ${created} draft(s) created, ${skipped} skipped (already known), ${errors} error(s).`);
}

run();