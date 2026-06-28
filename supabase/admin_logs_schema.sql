-- ================================================================
-- Run in Supabase SQL Editor
-- Adds: admin_logs table for SuperAdmin activity tracking
-- ================================================================

create table if not exists admin_logs (
  id          uuid default gen_random_uuid() primary key,
  admin_id    uuid references profiles(id) on delete set null,
  admin_name  text not null,
  action      text not null,
  target_id   uuid,
  target_name text,
  target_unit text,
  target_role text,
  notes       text,
  created_at  timestamptz default now()
);

-- Index for fast queries by admin or time
create index if not exists admin_logs_admin_id_idx on admin_logs(admin_id);
create index if not exists admin_logs_created_at_idx on admin_logs(created_at desc);

-- RLS: only admins can read
alter table admin_logs enable row level security;

drop policy if exists "Admins can read logs" on admin_logs;
create policy "Admins can read logs" on admin_logs
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Admins can insert logs" on admin_logs;
create policy "Admins can insert logs" on admin_logs
  for insert with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
