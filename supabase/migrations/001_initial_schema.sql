-- Phase 4 schema. Run this once in the Supabase SQL Editor (or via the
-- Supabase CLI) against a fresh project. Column names are snake_case per
-- Postgres/Supabase convention — lib/server/data.ts maps these to the
-- camelCase fields the rest of the app already uses, so nothing above
-- the data layer needs to know this table structure exists.

create extension if not exists pgcrypto; -- for gen_random_uuid()

-- ---------------------------------------------------------------------
-- jobs
-- ---------------------------------------------------------------------
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  state text not null default 'Bihar',
  title text not null,
  short_info text not null default '',
  organization text not null,
  department text not null,
  category text not null,
  total_vacancies integer not null default 0,
  vacancy_breakdown jsonb,
  qualification text not null,
  min_age integer not null default 18,
  max_age integer not null default 40,
  age_relaxation text,
  age_relaxation_breakdown jsonb,
  salary_min integer not null default 0,
  salary_max integer not null default 0,
  application_fee jsonb not null default '{"general":0,"reserved":0}',
  selection_process jsonb not null default '[]',
  exam_pattern text,
  syllabus_summary text,
  how_to_apply jsonb not null default '[]',
  official_notification_url text not null,
  official_apply_url text not null,
  source_url text not null,
  important_links jsonb,
  important_dates jsonb not null default '[]',
  eligibility_rules jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  created_by_bot boolean not null default false,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_status_idx on jobs (status);
create index if not exists jobs_category_idx on jobs (category);
create index if not exists jobs_department_idx on jobs (department);
create index if not exists jobs_qualification_idx on jobs (qualification);
create index if not exists jobs_source_url_idx on jobs (source_url);

-- ---------------------------------------------------------------------
-- results
-- ---------------------------------------------------------------------
create table if not exists results (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  organization text not null,
  category text not null,
  result_date date not null,
  official_link text not null,
  source_url text not null,
  summary text not null default ''
);

create index if not exists results_result_date_idx on results (result_date desc);

-- ---------------------------------------------------------------------
-- admit_cards
-- ---------------------------------------------------------------------
create table if not exists admit_cards (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  organization text not null,
  category text not null,
  exam_date date not null,
  release_date date not null,
  official_link text not null,
  source_url text not null
);

create index if not exists admit_cards_release_date_idx on admit_cards (release_date desc);

-- ---------------------------------------------------------------------
-- bot_drafts
-- ---------------------------------------------------------------------
create table if not exists bot_drafts (
  id uuid primary key default gen_random_uuid(),
  job_title text not null,
  organization text not null,
  source_url text not null,
  detected_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  extracted_fields jsonb not null default '{}'
);

create index if not exists bot_drafts_status_idx on bot_drafts (status);
create index if not exists bot_drafts_source_url_idx on bot_drafts (source_url);

-- ---------------------------------------------------------------------
-- bot_log
-- ---------------------------------------------------------------------
create table if not exists bot_log (
  id uuid primary key default gen_random_uuid(),
  "timestamp" timestamptz not null default now(),
  status text not null check (status in ('success', 'warning', 'error')),
  message text not null
);

create index if not exists bot_log_timestamp_idx on bot_log ("timestamp" desc);

-- ---------------------------------------------------------------------
-- Row Level Security — public can only ever read published/visible data;
-- every write goes through the server-side service role key (used by
-- our Next.js API routes and the bot), which bypasses RLS by design.
-- This is a defense-in-depth layer: even if a future bug in our own
-- query code forgot to filter by status, a direct request using the
-- public anon key still could not see unpublished drafts or closed jobs.
-- ---------------------------------------------------------------------
alter table jobs enable row level security;
alter table results enable row level security;
alter table admit_cards enable row level security;
alter table bot_drafts enable row level security;
alter table bot_log enable row level security;

create policy "Public can read published jobs" on jobs
  for select using (status = 'published');

create policy "Public can read results" on results
  for select using (true);

create policy "Public can read admit cards" on admit_cards
  for select using (true);

-- No public policies on bot_drafts or bot_log at all — the anon key can
-- never read these tables under any condition; only the service role
-- key (which bypasses RLS entirely) can, and only our own admin-gated
-- API routes use that key.
