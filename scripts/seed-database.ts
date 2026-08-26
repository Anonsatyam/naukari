import { loadEnvLocal } from "./bot/loadEnv";
loadEnvLocal();

import { getSupabaseAdmin } from "@/lib/server/supabaseClient";
import { jobToRow, resultToRow, admitCardToRow } from "@/lib/server/mappers";
import { jobs, results, admitCards } from "@/lib/mock-data";

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

async function preflightCheck() {
  const url = process.env.SUPABASE_URL;
  console.log(`Checking connectivity to ${url} ...`);
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY ?? "" },
    });
    console.log(`  Reached it. HTTP status: ${res.status}\n`);
  } catch (err) {
    console.error(`  Could not reach it at all: ${extractErrorDetail(err)}\n`);
    console.error(
      "  This means the problem is network-level (DNS, firewall, VPN, or a\n" +
        "  wrong URL) rather than a Supabase permissions issue — fix this\n" +
        "  first before worrying about the seed data itself.\n"
    );
  }
}

async function seed() {
  await preflightCheck();

  const supabase = getSupabaseAdmin();

  console.log(`Seeding ${jobs.length} jobs...`);
  for (const job of jobs) {
    const { error } = await supabase.from("jobs").upsert(jobToRow(job), { onConflict: "slug" });
    console.log(error ? `  ✗ ${job.title}: ${JSON.stringify(error)}` : `  ✓ ${job.title}`);
  }

  console.log(`\nSeeding ${results.length} results...`);
  for (const result of results) {
    const { error } = await supabase.from("results").upsert(resultToRow(result), { onConflict: "slug" });
    console.log(error ? `  ✗ ${result.title}: ${JSON.stringify(error)}` : `  ✓ ${result.title}`);
  }

  console.log(`\nSeeding ${admitCards.length} admit cards...`);
  for (const card of admitCards) {
    const { error } = await supabase.from("admit_cards").upsert(admitCardToRow(card), { onConflict: "slug" });
    console.log(error ? `  ✗ ${card.title}: ${JSON.stringify(error)}` : `  ✓ ${card.title}`);
  }

  console.log("\nDone. Safe to re-run any time — matching slugs update in place instead of duplicating.");
}

seed();