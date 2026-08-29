// Cloudflare Worker: fires the bot's GitHub Actions workflow on a
// reliable, self-controlled cron — see cloudflare-cron-trigger/README.md
// for why this exists and how to deploy it.
//
// This worker does exactly one thing on its schedule: call GitHub's API
// to trigger a workflow_dispatch run of bot.yml. It does NOT run the bot
// itself (that still happens on GitHub Actions, which already has
// Playwright installed and a generous execution time limit) — it only
// solves "make sure the trigger actually fires reliably every 4 hours",
// which GitHub's own `schedule` event doesn't guarantee.
//
// Required secret (set via the Cloudflare dashboard, NOT in this file):
//   GITHUB_TOKEN — a GitHub Personal Access Token with the "workflow"
//   scope, scoped to this repo. See the README for how to create one.

const OWNER = "Anonsatyam";
const REPO = "naukari";
const WORKFLOW_FILE = "bot.yml";
const BRANCH = "main";

const cronTriggerWorker = {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(triggerBotWorkflow(env));
  },

  // Lets you hit this worker's own URL directly in a browser to fire
  // one test run on demand, without waiting for the next scheduled
  // tick — useful for confirming the token/config actually works.
  //
  // A browser opening that URL also auto-requests /favicon.ico, which
  // — since every request path used to hit this same handler — fired
  // a second real trigger a couple seconds after the first (confirmed:
  // two workflow runs landed from one page visit). Only the root path
  // actually triggers; anything else (favicon, devtools probing, etc.)
  // gets a cheap 204 with no GitHub call at all.
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname !== "/") {
      return new Response(null, { status: 204 });
    }
    const result = await triggerBotWorkflow(env);
    return new Response(JSON.stringify(result, null, 2), {
      status: result.ok ? 200 : 500,
      headers: { "content-type": "application/json" },
    });
  },
};

export default cronTriggerWorker;

async function triggerBotWorkflow(env) {
  if (!env.GITHUB_TOKEN) {
    return { ok: false, error: "GITHUB_TOKEN secret is not set on this Worker." };
  }

  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        // GitHub requires a User-Agent on API requests.
        "User-Agent": "bihar-jobs-cron-trigger-worker",
      },
      body: JSON.stringify({ ref: BRANCH }),
    }
  );

  // A successful dispatch call returns 204 No Content — there's no
  // body to read, just the status.
  if (res.status === 204) {
    return { ok: true, status: res.status, triggeredAt: new Date().toISOString() };
  }

  const bodyText = await res.text().catch(() => "");
  return { ok: false, status: res.status, body: bodyText };
}
