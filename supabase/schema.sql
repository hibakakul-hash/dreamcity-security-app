-- Dreamcity Society Security App — Supabase Schema
-- Run this in Supabase SQL Editor (supabase.com → SQL Editor → New query)

-- Residents table
create table if not exists residents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null unique,
  phone text,
  email text,
  created_at timestamptz default now()
);

-- Visitors log
create table if not exists visitors (
  id uuid primary key default gen_random_uuid(),
  visitor_name text not null,
  vehicle_number text,
  purpose text not null default 'Guest',
  unit text not null references residents(unit),
  resident_name text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  logged_by text,
  approved_at timestamptz,
  created_at timestamptz default now()
);

-- Pre-approvals (residents whitelist expected guests)
create table if not exists pre_approvals (
  id uuid primary key default gen_random_uuid(),
  visitor_name text not null,
  purpose text not null default 'Guest',
  unit text not null references residents(unit),
  resident_name text,
  valid_from timestamptz default now(),
  valid_until timestamptz not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table residents enable row level security;
alter table visitors enable row level security;
alter table pre_approvals enable row level security;

-- Policies: allow all reads/writes via anon key (tighten later with auth)
create policy "Allow all" on residents for all using (true) with check (true);
create policy "Allow all" on visitors for all using (true) with check (true);
create policy "Allow all" on pre_approvals for all using (true) with check (true);

-- Enable realtime on visitors (for live gate updates)
alter publication supabase_realtime add table visitors;

-- Seed some residents
insert into residents (name, unit, phone) values
  ('Sara Ali',      'A-201', '0300-1234567'),
  ('Usman Malik',   'B-105', '0301-2345678'),
  ('Bilal Sheikh',  'C-302', '0302-3456789'),
  ('Nadia Hussain', 'A-104', '0303-4567890'),
  ('Kamran Iqbal',  'D-401', '0304-5678901')
on conflict do nothing;
