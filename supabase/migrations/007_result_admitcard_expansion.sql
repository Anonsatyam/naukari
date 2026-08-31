
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
