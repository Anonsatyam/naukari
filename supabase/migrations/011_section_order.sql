
alter table jobs add column if not exists section_order jsonb;
alter table results add column if not exists section_order jsonb;
alter table admit_cards add column if not exists section_order jsonb;
