-- Run this in the Supabase SQL Editor after 008_generic_additional_sections.sql.
--
-- The public Jobs/Results/Admit Cards listing pages were sorted by
-- published_at/result_date/release_date -- respectively "when an admin
-- got around to approving it" and a date PARSED OUT OF the
-- notification's own text (result declaration date, exam date) --
-- neither of which is the same thing as "the order the source itself
-- displays these in" (biharjob.co.in orders its own listings by its
-- own post date, which we don't otherwise have any way to read back
-- out once a draft's been sitting around waiting for review).
--
-- source_order_key captures each candidate's position in the source's
-- own listing at bot-crawl time (see scripts/bot/run.ts) and is
-- carried straight through from bot_drafts to the published record on
-- approval, regardless of what order an admin happens to approve
-- drafts in. Sorted descending, nulls last, with the old date column
-- as a fallback/tiebreaker for anything that predates this column or
-- has no bot origin at all.
--
-- Additive and backward compatible: nullable, existing rows unaffected.

alter table bot_drafts add column if not exists source_order_key double precision;
alter table jobs add column if not exists source_order_key double precision;
alter table results add column if not exists source_order_key double precision;
alter table admit_cards add column if not exists source_order_key double precision;
