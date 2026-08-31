
alter table jobs add column if not exists additional_sections jsonb;
alter table results add column if not exists additional_sections jsonb;
alter table admit_cards add column if not exists additional_sections jsonb;
