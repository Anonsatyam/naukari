-- Run this in the Supabase SQL Editor after 004_job_raw_text_fallbacks.sql.
--
-- Same idea as post_details_text/age_limit_text: `important_dates`
-- (jsonb) only ever holds the handful of canonical, fully-parsed dates
-- (Application Start/End, Exam Date, ...) — a source's actual dates
-- table routinely has several more rows than that (pre-exam training,
-- provisional allotment, a month-only value with no day, an edit
-- window given as relative text like "2 days after registration
-- closes") that never fit the canonical {label, date} shape and were
-- silently dropped, even though the bot already captures them verbatim
-- as importantDatesText. This column lets the job page show the full
-- table instead.
--
-- Additive and backward compatible: nullable, existing rows unaffected.

alter table jobs add column if not exists important_dates_text text;
