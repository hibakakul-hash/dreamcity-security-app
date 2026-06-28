-- Run in Supabase SQL Editor

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  unit text references residents(unit) on delete cascade,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;
create policy "Allow all" on push_subscriptions for all using (true) with check (true);
