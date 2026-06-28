-- Run in Supabase SQL Editor

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  unit text not null references residents(unit) on delete cascade,
  resident_name text,
  plate_number text not null,
  make text,
  model text,
  color text,
  created_at timestamptz default now()
);

alter table vehicles enable row level security;
create policy "Allow all" on vehicles for all using (true) with check (true);

-- Seed sample vehicles
insert into vehicles (unit, resident_name, plate_number, make, model, color) values
  ('A-201', 'Sara Ali',      'LEA-1234', 'Toyota',  'Corolla', 'White'),
  ('B-105', 'Usman Malik',   'LEB-5678', 'Honda',   'Civic',   'Silver'),
  ('C-302', 'Bilal Sheikh',  'LEC-9101', 'Suzuki',  'Alto',    'Red'),
  ('A-104', 'Nadia Hussain', 'LED-1121', 'Kia',     'Sportage','Black'),
  ('D-401', 'Kamran Iqbal',  'LEE-3141', 'Toyota',  'Fortuner','Grey')
on conflict do nothing;
