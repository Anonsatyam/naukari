
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
alter table results add column if not exists eligibility_text text;

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
alter table admit_cards add column if not exists eligibility_text text;
