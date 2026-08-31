
const OWNER = "Anonsatyam";
const REPO = "naukari";
const WORKFLOW_FILE = "bot.yml";
const BRANCH = "main";

const cronTriggerWorker = {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(triggerBotWorkflow(env));
  },

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
        "User-Agent": "bihar-jobs-cron-trigger-worker",
      },
      body: JSON.stringify({ ref: BRANCH }),
    }
  );

  if (res.status === 204) {
    return { ok: true, status: res.status, triggeredAt: new Date().toISOString() };
  }

  const bodyText = await res.text().catch(() => "");
  return { ok: false, status: res.status, body: bodyText };
}
