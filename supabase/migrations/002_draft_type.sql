-- Run this in the Supabase SQL Editor after 001_initial_schema.sql.
-- Adds classification so the bot can create Result and Admit Card
-- drafts, not just Job drafts — existing rows default to 'job' so
-- nothing already in the table is affected.

alter table bot_drafts
  add column if not exists draft_type text not null default 'job'
  check (draft_type in ('job', 'result', 'admit_card'));

create index if not exists bot_drafts_draft_type_idx on bot_drafts (draft_type);
