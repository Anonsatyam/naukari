# Reliable 4-hourly bot trigger (Cloudflare Worker)

## Why this exists

GitHub Actions' own `schedule` trigger isn't guaranteed — checking this
repo's actual run history showed only 8 of the ~16 runs expected over a
~65 hour window ever fired, with gaps growing past 13 hours between
some of them. GitHub's own docs say scheduled workflows queue up (and
get delayed or dropped under load) most at the top of every hour,
since every repo's cron piles onto the same minute.

`worker.js` runs on Cloudflare's free tier and does exactly one thing
on its own schedule: call GitHub's API to fire a `workflow_dispatch` on
`bot.yml`. A `workflow_dispatch`-triggered run starts promptly — it
isn't competing in that same shared `schedule`-event queue. The bot
itself keeps running on GitHub Actions exactly as before (same
Playwright setup, same 6-hour execution ceiling); this only fixes
*getting it to actually start* every 4 hours.

Cloudflare Workers' free plan was chosen over Vercel Cron specifically
because Vercel's Hobby plan only allows once-a-day cron jobs — every-4-
hours needs a paid Pro plan there. Cloudflare's free tier has no such
restriction (cron triggers can fire as often as once a minute) and
this worker's one quick `fetch()` call comfortably fits inside its
10ms-CPU-time free-tier budget (CPU time only counts actual execution,
not time spent waiting on the network call's response).

## One-time setup (all via the Cloudflare dashboard — no CLI needed)

### 1. Create a GitHub token (if you don't already have one from the
   earlier cron-job.org setup — reuse the same one if you do)

1. Go to https://github.com/settings/tokens/new
2. Note: "Trigger bihar-bot workflow"
3. Expiration: pick something long (e.g. 1 year) — you'll need to
   regenerate it when it expires
4. Scopes: check **`workflow`** only
5. Generate, and copy the token (`ghp_...`) immediately — GitHub won't
   show it again

### 2. Create the Worker

1. Sign up free at https://dash.cloudflare.com (no card required)
2. Workers & Pages → Create → **Create Worker**
3. Give it a name (e.g. `bihar-bot-cron`), click **Deploy** to create
   the placeholder
4. Click **Edit code** and replace the entire default script with the
   contents of `worker.js` in this folder
5. Click **Deploy**

### 3. Add the secret

1. On the Worker's page → **Settings** → **Variables and Secrets**
2. Add variable: name `GITHUB_TOKEN`, value = the token from step 1,
   type **Secret** (encrypted) — not plain text
3. Save (this redeploys the Worker with the secret available)

### 4. Add the Cron Trigger

1. Same Worker → **Settings** → **Trigger Events** (or **Triggers**
   tab, naming varies slightly by dashboard version) → **Cron Triggers**
   → **Add Cron Trigger**
2. Enter: `17 */4 * * *` (same off-the-hour minute as `bot.yml`'s own
   schedule, for consistency — not load-bearing here since Cloudflare
   doesn't have GitHub's specific top-of-hour congestion problem, but
   no reason to change it)
3. Save

### 5. Verify it works

Open the Worker's own URL (shown at the top of its dashboard page,
looks like `https://bihar-bot-cron.<your-subdomain>.workers.dev`) in a
browser. Visiting it directly runs the `fetch` handler immediately
(not the schedule) — you should see:

```json
{ "ok": true, "status": 204, "triggeredAt": "..." }
```

Then check the repo's **Actions** tab — a new "Run recruitment bot"
run should appear with event `workflow_dispatch`. If you see
`{"ok": false, ...}` instead, the error message tells you what's
wrong (usually a missing/incorrect secret).

## From here

Once this is confirmed working, the `cron:` schedule inside
`.github/workflows/bot.yml` becomes redundant (this Worker is now what
actually keeps it running on time) but is harmless to leave in place
as a backup trigger — GitHub will just sometimes fire it too, and
`draftExistsForSource` dedup means an extra run never creates
duplicate drafts.
