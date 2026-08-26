# Bihar Sarkari Naukri — Phase 4 (Real Database, No Mock Data)

A modern, mobile-first government jobs information platform for Bihar.
Every page reads from a real Supabase database — there is no mock or
seed data anywhere in this codebase. The site starts genuinely empty
and fills in only through the real pipeline: the bot finds a real
notification → creates a draft → an admin reviews and approves it →
it's live.

## Getting started

Requires Node.js 18.18+ (Node 20 LTS recommended) and a Supabase project.

```bash
npm install
cp .env.local.example .env.local   # then fill in real values
npm run dev
```

Since there's no seed data, the site will show empty states everywhere
until you run the bot and approve some drafts — that's expected, not a
bug.

## Required environment variables

See `.env.local.example` for the full list. In short:

| Variable | Used for |
|---|---|
| `ADMIN_PASSWORD` | Logging into `/admin/login` |
| `SESSION_SECRET` | Signing admin session cookies (HMAC) |
| `BOT_API_SECRET` | Authenticating the bot script to `/api/bot/*` |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Public-facing reads (respects Row Level Security) |
| `SUPABASE_SECRET_KEY` | Admin/bot writes (bypasses RLS) — never expose this |

## Database setup

Run both migrations, in order, in your Supabase project's SQL Editor:

1. `supabase/migrations/001_initial_schema.sql` — creates `jobs`,
   `results`, `admit_cards`, `bot_drafts`, `bot_log`, and RLS policies
2. `supabase/migrations/002_draft_type.sql` — adds the column that lets
   a bot draft be a Job, a Result, or an Admit Card

## Tech stack

- **Next.js 16** (App Router, TypeScript) — API routes double as the backend
- **Supabase** (Postgres) — the actual database, real persistence
- **Tailwind CSS v4** for styling
- **lucide-react** for icons

## Project structure

```
app/
  (public)/            Public site
  admin/                 Protected by proxy.ts
  api/
    jobs/, results/, admit-cards/    Public read APIs
    admin/                            Protected — drafts, jobs, stats
    auth/                             login / logout
    bot/                              Bearer-token protected bot ingestion
  sitemap.ts             Real routes, generated from the database

lib/
  types.ts                Data model
  dateHelpers.ts            Pure date logic (isClosingSoon, isRecent) —
                            no data dependency, safe for client components
  taxonomy.ts               Static filter option lists (categories,
                            departments, qualifications) — configuration,
                            not sample content
  server/
    supabaseClient.ts         Two clients: publishable (RLS-respecting,
                              public reads) and secret (full access,
                              admin/bot only)
    mappers.ts                 camelCase (app) <-> snake_case (Postgres)
    data.ts                    Every server-side data access goes
                              through here — the only place that
                              changes if the database ever changes again
    session.ts                 Signed-cookie auth helpers

scripts/bot/
  run.ts                   Orchestrator: fetch → classify → extract → post
  extract.ts                 Rule-based HTML link extraction
  extractFields.ts             Classifies each finding as a Job, Result,
                              or Admit Card, then guesses category/
                              qualification for Jobs
  sources.ts                   42 official Bihar government sources
  fetchInsecure.ts             Certificate-tolerant fetch (see comment
                              in the file for why this is necessary for
                              several of these sites)

supabase/migrations/       Schema, run these in order in a fresh project
proxy.ts                  Next 16's middleware — guards /admin/* and
                          /api/admin/*
.github/workflows/bot.yml  Scheduled bot run (every 4 hours)
```

## The real content pipeline

1. **Bot runs** (`npm run bot`, or automatically every 4 hours via
   GitHub Actions) — fetches each configured source, extracts links
   that look like notifications, classifies each as a Job/Result/Admit
   Card, and posts a draft
2. **Draft sits pending** in `/admin/drafts` — nothing is public yet
3. **Admin reviews and approves** — only then does it become a real,
   live row in the `jobs`/`results`/`admit_cards` table, visible on
   the public site

This is intentional, not a limitation — the bot is deliberately never
allowed to publish anything automatically.

## Known real-world constraints, not bugs

- **Several Bihar government sites have broken TLS certificates**
  (missing intermediate cert, expired cert, self-signed cert in the
  chain) — `fetchInsecure.ts` deliberately relaxes certificate
  validation for these specific known sources only, never for the
  bot's own calls back to this site's API. See the comment in that
  file for the full reasoning.
- **Some sources 404 or redirect** — the official URL list this
  project started from has drifted from what these department sites
  actually serve today. Fixing this means finding each department's
  current real URL, not a code change.
- **Some sources are unreachable specifically from GitHub Actions**
  (but work fine run locally) — likely IP-range-based blocking of
  cloud/datacenter traffic, which isn't something a code fix can
  route around.
