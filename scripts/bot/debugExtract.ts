/**
 * Standalone debug script — NOT part of the bot's normal run.
 * Fetches one URL and prints exactly what extractHtmlNotificationFields
 * finds, with no database, no dedup, no draft creation involved. Use
 * this to answer one question: is extraction itself broken, or is the
 * bot pipeline just skipping already-known URLs?
 *
 * Usage:
 *   npx tsx scripts/bot/debugExtract.ts https://biharjob.co.in/ibps-csa-recruitment-2026/
 *
 * (adjust the path to wherever you placed extractHtmlNotificationFields.ts
 * and fetchInsecure.ts — this assumes the same folder as run.ts)
 */
import { fetchInsecure } from "./fetchInsecure";
import { extractHtmlNotificationFields } from "./extractHtmlNotificationFields";

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error("Usage: npx tsx debugExtract.ts <url>");
    process.exit(1);
  }

  console.log(`Fetching: ${url}`);
  const res = await fetchInsecure(url, {
    headers: { "User-Agent": "BiharSarkariNaukriBot/1.0" },
  });
  console.log(`HTTP status: ${res.status}, ok: ${res.ok}`);

  const html = await res.text();
  console.log(`HTML length: ${html.length} chars`);

  // Quick sanity checks on the raw markup itself, independent of our
  // extractor's assumptions — tells us immediately if the page has ANY
  // headings/tables at all, or if what we got back isn't the real page
  // (e.g. a Cloudflare challenge page, a 404 template, etc.)
  const h2Count = (html.match(/<h2\b/gi) || []).length;
  const h3Count = (html.match(/<h3\b/gi) || []).length;
  const tableCount = (html.match(/<table\b/gi) || []).length;
  console.log(`Raw markup counts: <h2> x${h2Count}, <h3> x${h3Count}, <table> x${tableCount}`);

  if (tableCount === 0) {
    console.log("\n⚠️  Zero <table> tags found in the fetched HTML.");
    console.log("This means either:");
    console.log("  (a) the real page uses a different markup for its tables");
    console.log("      (e.g. a shortcode/widget div-grid, not a real <table>), or");
    console.log("  (b) fetchInsecure did not get the real page (bot-blocked,");
    console.log("      redirected, cached differently for non-browser requests).");
    console.log("Dumping the first 2000 chars of what was actually fetched:\n");
    console.log(html.slice(0, 2000));
  }

  const extraction = extractHtmlNotificationFields(html);
  console.log("\n--- extractHtmlNotificationFields result ---");
  console.log(JSON.stringify(extraction, null, 2));
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});