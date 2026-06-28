-- Run this in Supabase SQL Editor AFTER the main schema.sql

-- Profiles table: links auth users to roles and units
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('security', 'resident', 'admin')),
  unit text references residents(unit),
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Allow all" on profiles for all using (true) with check (true);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, name, role, unit)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'resident'),
    new.raw_user_meta_data->>'unit'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
