# Bihar Sarkari Naukri — Phase 3 (Backend)

A modern, mobile-first government jobs information platform for Bihar,
built with a design and architecture that can later scale to other
Indian states. This is **Phase 3**: a real backend — API routes, admin
authentication, and a working bot script — sitting on a temporary
in-memory data store. Phase 4 swaps that store for real Supabase
persistence without touching any API route or page.

## Getting started

Requires Node.js 18.18+ (Node 20 LTS recommended).

```bash
npm install
cp .env.local.example .env.local   # then fill in real values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Admin panel is at
`/admin/login`, using the password you set in `.env.local`.

Other scripts:

```bash
npm run build   # production build
npm run start   # run the production build locally
npm run lint    # eslint
npm run bot     # run the recruitment bot once, locally
```

## Required environment variables

See `.env.local.example` for the full list with instructions. In short:

| Variable | Used for |
|---|---|
| `ADMIN_PASSWORD` | Logging into `/admin/login` |
| `SESSION_SECRET` | Signing admin session cookies (HMAC) |
| `BOT_API_SECRET` | Authenticating the bot script to `/api/bot/*` |

The app will throw a clear error on startup if `SESSION_SECRET` is
missing — there's no insecure fallback default.

## Tech stack

- **Next.js 16** (App Router, TypeScript) — API routes double as the
  backend, so there's no separate server/repo to deploy or manage
- **Tailwind CSS v4** for styling, design tokens as CSS variables
- **lucide-react** for icons
- **tsx** (dev dependency) to run the bot script directly

## Project structure

```
app/
  (public)/            Public site — Header + Footer layout
  admin/
    (auth)/login/       Real login, posts to /api/auth/login
    (dashboard)/         Protected by proxy.ts (Next's middleware)
  api/
    jobs/, results/, admit-cards/    Public read APIs
    admin/                            Protected — drafts, jobs, stats
    auth/                             login / logout
    bot/                              Bearer-token protected bot ingestion
  robots.ts / sitemap.ts

components/             Shared UI + admin/* + tools/*
lib/
  types.ts              Data model
  mock-data.ts           Seed data (still used directly by Results,
                          Admit Cards, Closing Soon, Home — see below)
  server/
    store.ts              In-memory data store — see caveat below
    data.ts                All server-side data access goes through here
    session.ts             Signed-cookie auth helpers (Web Crypto)
scripts/bot/
  run.ts                 Orchestrator: fetch → extract → post
  extract.ts              Rule-based HTML link extraction
  extractFields.ts         Rule-based category/qualification guessing
  sources.ts               Configured official Bihar recruitment sources
proxy.ts                 Next 16's middleware — guards /admin/* and
                          /api/admin/*
.github/workflows/bot.yml  Scheduled bot run (every 6 hours)
```

## ⚠️ Phase 3 storage caveat — read this before deploying

`lib/server/store.ts` is an **in-memory store**, not a real database.
It's seeded fresh from `lib/mock-data.ts` and lives for the lifetime of
one Node process.

- **Local dev / `npm run start`**: works correctly. One process stays
  alive, so approving a draft, publishing a job, etc. all persist for
  your whole session.
- **Deployed to Vercel**: writes are **not guaranteed to persist**
  between requests, since serverless function instances aren't
  guaranteed to be the same process. This is expected, not a bug — it
  gets fixed by Phase 4's real Supabase persistence.

## What's wired to the real backend vs. still on mock data

Given the size of this phase, wiring was prioritized around the core
loop — bot creates a draft → admin reviews and approves it → it appears
publicly — rather than touching every page in one pass.

**Wired to real APIs / server data:**
- Admin: login, logout, dashboard (real stats + real bot log), drafts
  list, draft review (approve/reject), job management (publish/unpublish)
- Public: Jobs listing (`/jobs`, debounced server-side search + filters)
  and Job detail pages
- The bot: real HTTP fetch, real rule-based HTML parsing, real dedup,
  posts to a real (if temporary) store

**Still reading `lib/mock-data.ts` directly (not yet wired):**
- Results, Admit Cards, Closing Soon listing pages
- Home page's "Latest Results" / "Latest Admit Cards" / "Hot Right Now"
  sections
- Eligibility Checker (this one's arguably fine to stay client-side
  permanently — no sensitive data, faster for the user)

These all still work and look identical — they just aren't reading from
the same store the admin panel writes to yet. Rewiring them follows the
exact same pattern already used for Jobs, so it's a mechanical next step
whenever you want it done.

## The bot

`npm run bot` fetches each configured source in `scripts/bot/sources.ts`,
extracts links that look like recruitment notifications (keyword +
`.pdf` matching — no OCR/AI, per the Phase 1 decision to keep this
free-tier), guesses category/qualification from the link text, and
posts a draft to `/api/bot/drafts`. Confidence is always "low" or
"medium" from this pass — it never claims "high," since that's reserved
for extraction that actually reads structured fields out of the
notification document itself, which this rule-based pass doesn't
attempt.

**Honest limitation:** the extraction heuristics are untested against
real government site markup (my sandbox can't reach external sites to
verify this) — they're verified correct against fixture HTML, and the
full pipeline (fetch → parse → dedupe → post → admin visibility) is
verified working end-to-end. Real-world tuning against actual Bihar
government pages is expected next-step work once you run it for real.

The GitHub Actions workflow (`.github/workflows/bot.yml`) runs this on
a 6-hour schedule once you add `BOT_API_SECRET` and `BOT_SITE_URL` as
repository secrets.
