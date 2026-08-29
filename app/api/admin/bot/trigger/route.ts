import { NextResponse } from "next/server";

// Lets an admin fire an on-demand bot run from the dashboard, instead
// of needing to go to GitHub's Actions tab or the Cloudflare Worker's
// URL directly. Auth is already handled for every /api/admin/* route
// by proxy.ts (session-cookie check) — nothing extra needed here.
//
// This calls the exact same GitHub API endpoint the Cloudflare cron
// Worker does (see cloudflare-cron-trigger/worker.js) — a
// workflow_dispatch run of bot.yml — just from this site's own server
// instead of from the Worker. Needs its own token, since Vercel's
// server environment is a different runtime with different secrets
// than the Cloudflare Worker; reuse the same GitHub token value you
// already generated (workflow scope) rather than creating a second one.
const OWNER = "Anonsatyam";
const REPO = "naukari";
const WORKFLOW_FILE = "bot.yml";
const BRANCH = "main";

export async function POST() {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "GITHUB_DISPATCH_TOKEN is not configured on the server." },
      { status: 500 }
    );
  }

  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "bihar-jobs-admin-dashboard",
      },
      body: JSON.stringify({ ref: BRANCH }),
    }
  );

  // A successful dispatch call returns 204 No Content.
  if (res.status === 204) {
    return NextResponse.json({ ok: true, triggeredAt: new Date().toISOString() });
  }

  const bodyText = await res.text().catch(() => "");
  return NextResponse.json(
    { ok: false, error: `GitHub API returned ${res.status}`, detail: bodyText },
    { status: 502 }
  );
}
