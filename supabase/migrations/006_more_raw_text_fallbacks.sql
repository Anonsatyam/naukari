-- Run this in the Supabase SQL Editor after 005_important_dates_text.sql.
--
-- Closes the last three gaps in the "always capture the source's raw
-- table, not just a reshaped/summarized version of it" fix applied to
-- Post Details / Age Limit / Important Dates:
--
-- - application_fee_text: the fee table was only ever reduced to two
--   numbers (general/reserved) — a source with a third PwBD/OH-only
--   fee row, or a payment-method footnote, lost that information
--   entirely with no way to recover it.
-- - eligibility_text: eligibilityDetails (bullets) requires an admin to
--   keep the review page's textarea populated; this captures the raw
--   text unconditionally on every approval, same as postDetailsText.
-- - selection_process_text: selectionProcess is a lossy one-line-per-
--   stage reformatting for the plain numbered StepList; this keeps the
--   source's own table verbatim as well.
--
-- Additive and backward compatible: all three nullable.

alter table jobs add column if not exists application_fee_text text;
alter table jobs add column if not exists eligibility_text text;
alter table jobs add column if not exists selection_process_text text;
