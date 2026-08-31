import { NextResponse } from "next/server";

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

  if (res.status === 204) {
    return NextResponse.json({ ok: true, triggeredAt: new Date().toISOString() });
  }

  const bodyText = await res.text().catch(() => "");
  return NextResponse.json(
    { ok: false, error: `GitHub API returned ${res.status}`, detail: bodyText },
    { status: 502 }
  );
}
