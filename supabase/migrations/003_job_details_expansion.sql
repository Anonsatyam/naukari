
alter table jobs add column if not exists documents_required text;
alter table jobs add column if not exists age_as_on_date date;
alter table jobs add column if not exists age_limit_by_grade jsonb;
alter table jobs add column if not exists eligibility_details jsonb;
alter table jobs add column if not exists exam_pattern_notes jsonb;
alter table jobs add column if not exists faqs jsonb;
alter table jobs add column if not exists conclusion text;
