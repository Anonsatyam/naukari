-- Run this in the Supabase SQL Editor (or via the Supabase CLI) after
-- 006_more_raw_text_fallbacks.sql.
--
-- Results and Admit Cards only ever carried a handful of basic fields
-- (title, organization, category, one date, a link, a one-line
-- summary) — nowhere near the depth Jobs have (Important Dates,
-- How to Apply, Important Links, FAQs, Conclusion, ...), even though
-- the bot's extractor already captures all of that generically for
-- every posting regardless of type. These columns give Results and
-- Admit Cards somewhere to actually keep it.
--
-- All additive and backward compatible: every new column is nullable,
-- so existing rows and existing code paths are unaffected until a
-- result/admit card actually sets them.

alter table results add column if not exists important_dates_text text;
alter table results add column if not exists how_to_check jsonb;
alter table results add column if not exists cutoff_text text;
alter table results add column if not exists important_links jsonb;
alter table results add column if not exists faqs jsonb;
alter table results add column if not exists conclusion text;

alter table admit_cards add column if not exists important_dates_text text;
alter table admit_cards add column if not exists how_to_download jsonb;
alter table admit_cards add column if not exists exam_day_instructions_text text;
alter table admit_cards add column if not exists exam_pattern text;
alter table admit_cards add column if not exists important_links jsonb;
alter table admit_cards add column if not exists faqs jsonb;
alter table admit_cards add column if not exists conclusion text;
