-- Run this in the Supabase SQL Editor (or via the Supabase CLI) after
-- 010_result_admitcard_notification_fields.sql.
--
-- Every detail page rendered its sections in one fixed template order
-- (Important Dates, Fee, Age Limit, Vacancy, Eligibility, Selection
-- Process, ...) regardless of what order the source itself used —
-- a source's own "Physical Eligibility" table, say, always landed at
-- the bottom of the page instead of wherever the source actually put
-- it (often right after Education Eligibility). This column carries
-- the source's own top-to-bottom section order through to the
-- published record, so the page can render sections in that order —
-- see extractHtmlNotificationFields.ts's ParsedSections.sectionOrder
-- and lib/sectionOrder.ts's resolveSectionOrder.
--
-- Additive and backward compatible: nullable, so existing rows (and
-- the page's own fallback to the old fixed order for any record with
-- no sectionOrder) are unaffected until a record actually sets it.

alter table jobs add column if not exists section_order jsonb;
alter table results add column if not exists section_order jsonb;
alter table admit_cards add column if not exists section_order jsonb;
