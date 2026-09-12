-- Subscribers who opted in to get an email when a new job, result,
-- or admit card is published.
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  mobile text,
  created_at timestamptz not null default now()
);

create unique index if not exists subscribers_email_idx on subscribers (lower(email));
