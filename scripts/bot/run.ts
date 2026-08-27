import { loadEnvLocal } from "./loadEnv";
import { fetchInsecure } from "./fetchInsecure";
import { SOURCES } from "./sources";
import { extractCandidates, Candidate } from "./extract";
import { extractFields } from "./extractFields";
import { extractPdfText } from "./parsePdf";
import { extractStructuredFields, ExtractedStructuredFields } from "./extractStructuredFields";

loadEnvLocal();

const SITE_URL = process.env.BOT_SITE_URL || "http://localhost:3000";
const BOT_API_SECRET = process.env.BOT_API_SECRET;
const MAX_CANDIDATES_PER_SOURCE = 5;

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
      const res = await fetchInsecure(source.url, {
        headers: { "User-Agent": "BiharSarkariNaukriBot/1.0" },
      });

      if (!res.ok) {
        const detail =
          res.status >= 300 && res.status < 400
            ? res.headers.location
              ? ` — still redirecting after 5 hops (likely a loop), last target: ${res.headers.location}`
              : " — redirect response had no Location header to follow"
            : "";
        await logActivity("warning", `${source.name}: fetch failed (HTTP ${res.status})${detail}`);
        errors++;
        continue;
      }

      const html = await res.text();
      const candidates = extractCandidates(html, source.url);

      if (candidates.length === 0) {
        await logActivity("success", `${source.name}: checked, no notification-like links found`);
        continue;
      }

      for (const candidate of candidates.slice(0, MAX_CANDIDATES_PER_SOURCE)) {
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

  console.log(`\nDone. ${created} draft(s) created, ${skipped} skipped (already known), ${errors} error(s).`);
}

run();
