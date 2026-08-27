-- Run this in the Supabase SQL Editor after 003_job_details_expansion.sql.
--
-- postDetails and ageLimit were previously *only* fed into structured
-- parsers (vacancyBreakdown, ageLimitByGrade/ageRelaxationBreakdown) —
-- when a source table wasn't in the exact shape those parsers expect
-- (e.g. a single post-name/pay-scale/participating-banks row with no
-- per-category vacancy numbers at all), the whole section silently
-- never appeared on the job page, unlike exam_pattern/
-- documents_required, which always render (parsed table, or the raw
-- text as-is). These two columns store the raw table text verbatim so
-- the job page can fall back to it the same way.
--
-- Additive and backward compatible: both columns are nullable.

alter table jobs add column if not exists post_details_text text;
alter table jobs add column if not exists age_limit_text text;
