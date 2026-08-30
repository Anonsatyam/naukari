-- Run this in the Supabase SQL Editor (or via the Supabase CLI) after
-- 009_source_order_key.sql.
--
-- Results and Admit Cards were still missing the Application Fee, Age
-- Limit, Post/Vacancy Details, Selection Process (and, for Results,
-- Exam Pattern + Documents Required) fields Jobs already have — even
-- though the bot's extractor uses the exact same heading buckets for
-- all three draft types and already captured this content, it was
-- silently discarded on approval for Result/AdmitCard because nothing
-- read it into the published record. See lib/types.ts's
-- ResultItem/AdmitCardItem comments and lib/server/data.ts's
-- extractSharedNotificationFields.
--
-- All additive and backward compatible: every new column is nullable,
-- so existing rows and existing code paths are unaffected until a
-- result/admit card actually sets them.

alter table results add column if not exists application_fee jsonb;
alter table results add column if not exists application_fee_text text;
alter table results add column if not exists age_limit_by_grade jsonb;
alter table results add column if not exists age_relaxation_breakdown jsonb;
alter table results add column if not exists age_limit_text text;
alter table results add column if not exists total_vacancies integer;
alter table results add column if not exists vacancy_breakdown jsonb;
alter table results add column if not exists post_details_text text;
alter table results add column if not exists selection_process jsonb;
alter table results add column if not exists selection_process_text text;
alter table results add column if not exists exam_pattern text;
alter table results add column if not exists exam_pattern_notes jsonb;
alter table results add column if not exists documents_required text;

alter table admit_cards add column if not exists application_fee jsonb;
alter table admit_cards add column if not exists application_fee_text text;
alter table admit_cards add column if not exists age_limit_by_grade jsonb;
alter table admit_cards add column if not exists age_relaxation_breakdown jsonb;
alter table admit_cards add column if not exists age_limit_text text;
alter table admit_cards add column if not exists total_vacancies integer;
alter table admit_cards add column if not exists vacancy_breakdown jsonb;
alter table admit_cards add column if not exists post_details_text text;
alter table admit_cards add column if not exists selection_process jsonb;
alter table admit_cards add column if not exists selection_process_text text;
alter table admit_cards add column if not exists exam_pattern_notes jsonb;
