-- Track when a result/admit card was actually added to this site, so
-- listings can sort "latest added first" the same way jobs already do
-- via published_at. (jobs already has published_at from 001; results
-- and admit_cards never had an equivalent column - they were only
-- ever sorted by their own result_date/release_date, which is a
-- different thing from when the row was created here.)
alter table results add column if not exists created_at timestamptz not null default now();
alter table admit_cards add column if not exists created_at timestamptz not null default now();

create index if not exists results_created_at_idx on results (created_at desc);
create index if not exists admit_cards_created_at_idx on admit_cards (created_at desc);

-- New drafts are always created manually now (the bot is gone) -
-- match the default to what the app has always written since that
-- change instead of the old bot-era default.
alter table bot_drafts alter column origin set default 'manual';

-- The bot's own activity log has no reader left in the app - drop it.
drop table if exists bot_log;
