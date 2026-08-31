
alter table bot_drafts add column if not exists source_order_key double precision;
alter table jobs add column if not exists source_order_key double precision;
alter table results add column if not exists source_order_key double precision;
alter table admit_cards add column if not exists source_order_key double precision;
