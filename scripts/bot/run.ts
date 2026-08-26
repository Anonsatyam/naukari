import { loadEnvLocal } from "./loadEnv";
import { SOURCES } from "./sources";
import { extractCandidates } from "./extract";
import { extractFields } from "./extractFields";

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
      const res = await fetch(source.url, {
        headers: { "User-Agent": "BiharSarkariNaukriBot/1.0" },
      });

      if (!res.ok) {
        await logActivity("warning", `${source.name}: fetch failed (HTTP ${res.status})`);
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
        const result = await postJson("/api/bot/drafts", draftInput);

        if (!result.ok) {
          console.error(`  ✗ Failed to submit "${candidate.title}": ${JSON.stringify(result.data)}`);
          errors++;
        } else if (result.data.skipped) {
          skipped++;
        } else {
          created++;
          console.log(`  ✓ Draft created (${draftInput.confidence} confidence): ${candidate.title}`);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logActivity("error", `${source.name}: ${message}`);
      errors++;
    }
  }

  console.log(`\nDone. ${created} draft(s) created, ${skipped} skipped (already known), ${errors} error(s).`);
}

run();