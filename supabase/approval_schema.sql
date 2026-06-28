-- ================================================================
-- Run in Supabase SQL Editor
-- Adds: account approval workflow, household_admin role,
--       H2/57 resident, is_pending flag on profiles
-- ================================================================

-- 1. Add H2/57 resident
insert into residents (name, unit, phone) values
  ('Dr Mohammad Irfan', 'H2/57', null)
on conflict (unit) do update set name = excluded.name;

-- 2. Add is_pending to profiles (new accounts start pending until approved)
alter table profiles
  add column if not exists is_pending boolean not null default false;

-- 3. Update role constraint to include household_admin
alter table profiles
  drop constraint if exists profiles_role_check;
alter table profiles
  add constraint profiles_role_check
  check (role in ('security', 'resident', 'household_admin', 'admin'));

-- 4. Update handle_new_user: non-admin accounts start as pending + inactive
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_role text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'resident');
  insert into profiles (id, name, role, unit, phone, recovery_email, is_active, is_pending)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    v_role,
    new.raw_user_meta_data->>'unit',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'recovery_email',
    case when v_role = 'admin' then true else false end,  -- admins active immediately
    case when v_role = 'admin' then false else true end   -- non-admins pending approval
  );
  return new;
end;
$$;
