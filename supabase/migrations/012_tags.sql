alter table jobs add column if not exists tags jsonb;
alter table results add column if not exists tags jsonb;
alter table admit_cards add column if not exists tags jsonb;
