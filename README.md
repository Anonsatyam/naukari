# Bihar Sarkari Naukri — Phase 2 (UI, Mock Data)

A modern, mobile-first government jobs information platform for Bihar,
built with a design and architecture that can later scale to other
Indian states. This is **Phase 2**: fully responsive UI running on mock
data, with no backend or database yet (that's Phase 3 and 4).

## Getting started

Requires Node.js 18.18+ (Node 20 LTS recommended).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts:

```bash
npm run build   # production build
npm run start   # run the production build locally
npm run lint    # eslint
```

## Tech stack

- **Next.js 16** (App Router, TypeScript) — chosen over a plain React SPA
  so job pages are server-rendered for SEO, per the Phase 1 plan
- **Tailwind CSS v4** for styling, with the project's design tokens wired
  in as CSS variables (see `app/globals.css`)
- **lucide-react** for icons
- No backend, no database, no auth yet — everything here reads from
  `lib/mock-data.ts`

## Design tokens

| Token | Value |
|---|---|
| Primary | `#3C44C2` |
| Text — Primary | `#181B25` |
| Text — Secondary | `#5E6475` |
| Background | `#F7F8FA` |

Defined in `app/globals.css` under `:root` and mapped into Tailwind's
`@theme`, so they're used as `bg-[var(--color-primary)]`,
`text-[var(--color-text-secondary)]`, etc. throughout the codebase.

## Project structure

```
app/
  (public)/          Public site — has its own layout with Header + Footer
    page.tsx          Home
    jobs/              Job listings (search + filters) and job detail
    closing-soon/      Jobs closing within 7 days
    results/           Results listing and detail
    admit-cards/       Admit card listing and detail
    eligibility-checker/  The reasoned eligibility checklist tool
    about/             About / Disclaimer / Contact
  admin/
    (auth)/login/       Admin login (mock — no real auth yet)
    (dashboard)/         Admin shell with sidebar + topbar
      dashboard/          Stats + bot monitoring log
      drafts/             Bot-detected draft queue + review/approve/reject
      jobs/               Publish/unpublish job listings
  sitemap.ts / robots.ts SEO routes

components/            Shared UI (Header, Footer, JobCard, Badge, Button,
                        JobsExplorer, EligibilityChecker, admin/*)
lib/
  types.ts             Data model (matches the Phase 1 planning doc)
  mock-data.ts          Mock jobs, results, admit cards, bot drafts
  utils.ts              Formatting helpers
```

## What's mocked vs. real

- **Real:** all UI, layout, responsiveness, search/filter logic, the
  eligibility-checking logic (rule-based, runs in the browser against
  mock data), routing and SEO metadata/sitemap.
- **Mocked:** all data (`lib/mock-data.ts`), the admin login (any
  input logs you in), and the approve/reject actions on drafts (they
  update local state only, not a real database).

Phase 3 replaces the mock data layer with real Node.js APIs and the
bot/admin workflow; Phase 4 wires in Supabase Postgres.
