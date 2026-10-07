-- Run in the trusted Supabase Dashboard SQL Editor after both migrations.
-- This grants platform access to the verified company account only.
begin;
do $$
begin
  if not exists (
    select 1 from auth.users
    where id = 'eb122bbb-a5bf-47fd-b25d-248b5e182d18'::uuid
      and lower(email) = 'adedokunkhaleed@gmail.com'
  ) then
    raise exception 'Company administrator UID and email do not match an existing Auth user. No permission was granted.';
  end if;

  insert into private.platform_admins(user_id, active)
  values ('eb122bbb-a5bf-47fd-b25d-248b5e182d18'::uuid, true)
  on conflict (user_id) do update set active = true;
end;
$$;
commit;
