-- Run this in the Supabase SQL Editor after 007_result_admitcard_expansion.sql.
--
-- A source publishes sections nobody's added a dedicated field for —
-- "Physical Eligibility", a reservation-policy note, or literally
-- anything else. Previously, any heading that didn't match one of the
-- specific bucket keywords (importantDates/eligibility/examPattern/...)
-- was silently discarded entirely rather than merged into the wrong
-- section or dropped-but-logged — the extractor had no fallback for
-- "heading recognized, but no field for it" at all.
--
-- additional_sections holds an ordered array of {heading, content}
-- pairs, using the source's OWN heading text as the title, rendered
-- generically on the public page instead of requiring a matching code
-- change for every new heading a source happens to use. Shared shape
-- across all three entity types.
--
-- Additive and backward compatible: nullable, existing rows unaffected.

alter table jobs add column if not exists additional_sections jsonb;
alter table results add column if not exists additional_sections jsonb;
alter table admit_cards add column if not exists additional_sections jsonb;
