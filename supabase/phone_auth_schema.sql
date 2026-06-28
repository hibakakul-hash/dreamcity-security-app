-- Run in Supabase SQL Editor
-- Adds phone and recovery_email to profiles, updates the auto-create trigger

alter table profiles
  add column if not exists phone text,
  add column if not exists recovery_email text;

-- Update trigger to also store phone and recovery_email from signup metadata
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, name, role, unit, phone, recovery_email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'resident'),
    new.raw_user_meta_data->>'unit',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'recovery_email'
  );
  return new;
end;
$$;
