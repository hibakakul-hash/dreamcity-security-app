-- ============================================================
-- Run this ONCE in Supabase SQL Editor
-- Includes: decision lock, account deactivation, audit support
-- ============================================================

-- 1. Add decided_by_name to visitors (who made the call)
alter table visitors
  add column if not exists decided_by_name text;

-- 2. Add is_active to profiles (for account deactivation)
alter table profiles
  add column if not exists is_active boolean not null default true;

-- 3. Phone + recovery_email columns (if not already added)
alter table profiles
  add column if not exists phone text,
  add column if not exists recovery_email text;

-- 4. First-action-wins trigger: once decided, locked forever
create or replace function lock_visitor_on_decision()
returns trigger language plpgsql as $$
begin
  if old.status <> 'pending' then
    raise exception 'Already decided by %', old.decided_by_name;
  end if;
  return new;
end;
$$;

drop trigger if exists visitor_decision_lock on visitors;
create trigger visitor_decision_lock
  before update of status on visitors
  for each row execute function lock_visitor_on_decision();

-- 5. Update handle_new_user trigger to include new columns
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, name, role, unit, phone, recovery_email, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'resident'),
    new.raw_user_meta_data->>'unit',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'recovery_email',
    true
  );
  return new;
end;
$$;
