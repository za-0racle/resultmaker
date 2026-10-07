-- Foundation only: identity, tenants and trusted memberships.
-- Apply once to a new project after reviewing SUPABASE_SETUP.md.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 1 and 150),
  phone text check (phone is null or length(phone) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  slug text not null unique check (length(slug) between 2 and 63 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status text not null default 'active' check (status in ('active', 'suspended')),
  motto text,
  address text,
  phone text,
  email text,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.school_memberships (
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('school_admin', 'subject_teacher', 'class_teacher', 'student', 'parent')),
  status text not null default 'active' check (status in ('active', 'invited', 'suspended')),
  created_at timestamptz not null default now(),
  primary key (school_id, user_id, role)
);
create index school_memberships_user_id_idx on public.school_memberships(user_id);

-- Platform permissions cannot be granted through public profiles or user metadata.
create table private.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create function private.is_platform_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from private.platform_admins
    where user_id = (select auth.uid()) and active
  );
$$;

-- The owner can read memberships without recursively evaluating their RLS.
create function private.has_school_role(requested_school uuid, allowed_roles text[])
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.school_memberships m
    join public.schools s on s.id = m.school_id
    where m.school_id = requested_school
      and m.user_id = (select auth.uid())
      and m.status = 'active' and s.status = 'active'
      and m.role = any(allowed_roles)
  );
$$;

create function private.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger schools_updated_at before update on public.schools
for each row execute function private.set_updated_at();

-- Only harmless display data is taken from metadata; roles are never copied.
create function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), nullif(split_part(new.email, '@', 1), ''), 'New user'), 150));
  return new;
end;
$$;
create trigger esiayo_user_profile after insert on auth.users
for each row execute function private.handle_new_user();

-- Existing Auth users receive profiles without receiving school privileges.
insert into public.profiles(id, display_name)
select id, left(coalesce(nullif(btrim(raw_user_meta_data ->> 'display_name'), ''), nullif(split_part(email, '@', 1), ''), 'New user'), 150)
from auth.users on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.schools enable row level security;
alter table public.school_memberships enable row level security;
alter table private.platform_admins enable row level security;

revoke all on public.profiles, public.schools, public.school_memberships from public, anon, authenticated;
revoke all on private.platform_admins from public, anon, authenticated;
revoke all on function private.is_platform_admin() from public, anon, authenticated;
revoke all on function private.has_school_role(uuid, text[]) from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;

grant execute on function private.is_platform_admin(), private.has_school_role(uuid, text[]) to authenticated;
grant select on public.profiles, public.schools, public.school_memberships to authenticated;
grant insert (id, display_name, phone) on public.profiles to authenticated;
grant update (display_name, phone) on public.profiles to authenticated;
grant update (name, motto, address, phone, email, website) on public.schools to authenticated;
grant all on public.profiles, public.schools, public.school_memberships, private.platform_admins to service_role;

create policy profiles_read_own on public.profiles for select to authenticated
using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert to authenticated
with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy schools_read_membership on public.schools for select to authenticated
using (
  (select private.is_platform_admin())
  or private.has_school_role(id, array['school_admin','subject_teacher','class_teacher','student','parent'])
);
create policy schools_update_admin on public.schools for update to authenticated
using ((select private.is_platform_admin()) or private.has_school_role(id, array['school_admin']))
with check ((select private.is_platform_admin()) or private.has_school_role(id, array['school_admin']));

create policy memberships_read_scope on public.school_memberships for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.is_platform_admin())
  or private.has_school_role(school_id, array['school_admin'])
);

-- No browser INSERT/UPDATE/DELETE policy for memberships or school creation.
-- Provisioning and platform-admin assignments require trusted server/admin access.
commit;
