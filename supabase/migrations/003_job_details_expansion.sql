-- Run this in the Supabase SQL Editor (or via the Supabase CLI) after
-- 001_initial_schema.sql and 002_draft_type.sql.
--
-- Two things happen here:
--
-- 1. `documents_required` was already being read/written by
--    lib/server/mappers.ts and lib/server/data.ts (approveDraft) but was
--    never actually added to the `jobs` table in 001 — so any draft
--    whose extraction included a "Documents Required" section would
--    fail to publish with a "column does not exist" error. Adding it
--    now, additively, fixes that silently-broken path.
--
-- 2. New columns to carry the rest of a full notification's detail
--    through to the published job (cadre-wise age limits, per-post
--    eligibility bullets, exam-pattern footnotes like negative marking,
--    FAQs, and a closing summary) — the fields a source like the BOB SO
--    2026 notification publishes that the original schema had no place
--    for.
--
-- All additive and backward compatible: every new column is nullable,
-- so existing rows and existing code paths are unaffected until a job
-- actually sets them.

alter table jobs add column if not exists documents_required text;
alter table jobs add column if not exists age_as_on_date date;
alter table jobs add column if not exists age_limit_by_grade jsonb;
alter table jobs add column if not exists eligibility_details jsonb;
alter table jobs add column if not exists exam_pattern_notes jsonb;
alter table jobs add column if not exists faqs jsonb;
alter table jobs add column if not exists conclusion text;
