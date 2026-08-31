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
const MAX_CANDIDATES_PER_SOURCE = 120;
const MAX_SECTIONS_PER_SOURCE = 5;
const MAX_SECTIONS_PER_SOURCE_PLAYWRIGHT = 2;

const DETAIL_FETCH_DELAY_MS = 1200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isDefinitelyExpired(extractedFields: { importantDates?: { label: string; date: string }[] }): boolean {
  const endDate = extractedFields.importantDates?.find((d) => d.label === "Application End")?.date;
  if (!endDate) return false;
  const end = new Date(endDate).getTime();
  if (Number.isNaN(end)) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return end < startOfToday.getTime();
}

function shouldUsePlaywright(url: string): boolean {
  try {
    return new URL(url).hostname === "state.bihar.gov.in";
  } catch {
    return false;
  }
}

function inferSectionDraftTypeHint(sectionUrl: string): "result" | "admit_card" | undefined {
  try {
    const path = new URL(sectionUrl).pathname.toLowerCase();
    if (path.includes("admit-card") || path.includes("admit_card")) return "admit_card";
    if (path.includes("result")) return "result";
  } catch {
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

  const runOrderBase = Date.now();

  let created = 0;
  let skipped = 0;
  let expired = 0;
  let errors = 0;

  try {
    for (const source of SOURCES) {
      try {
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
          draftInput.sourceOrderKey = runOrderBase - i;

          const pdfFields = await tryExtractPdfFields(candidate);
          const fieldsFoundInPdf = Object.keys(pdfFields).length;
          if (fieldsFoundInPdf > 0) {
            draftInput.extractedFields = { ...draftInput.extractedFields, ...pdfFields };
            draftInput.confidence = fieldsFoundInPdf >= 2 ? "high" : "medium";
          }

          if (fieldsFoundInPdf === 0) {
            const { organization, fields: htmlFields } = await tryExtractHtmlFields(candidate);
            const fieldsFoundInHtml = Object.keys(htmlFields).length;
            if (fieldsFoundInHtml > 0) {
              draftInput.extractedFields = { ...draftInput.extractedFields, ...htmlFields };
              draftInput.confidence = fieldsFoundInHtml >= 2 ? "high" : "medium";
            }
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

  await logActivity(
    "success",
    `Bot run summary: ${created} new draft(s), ${skipped} duplicate(s) skipped, ${expired} expired skipped, ${errors} error(s)`
  );
}

run();