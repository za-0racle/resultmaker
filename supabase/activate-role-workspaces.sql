-- Run ONCE in the trusted Supabase Dashboard SQL Editor after the tenant foundation.
-- Applies the school/teacher schema and verified company permission in ONE transaction.
-- Generated from 20261007180000_school_registration_and_teacher_scopes.sql and provision-company-admin.sql.
-- Do not rerun this bundle. To restore owner permission later, run provision-company-admin.sql alone.
-- Apply after the two foundation migrations. No roles are trusted from user metadata.
begin;

create or replace function public.current_user_is_platform_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.is_platform_admin(); $$;
revoke all on function public.current_user_is_platform_admin() from public, anon;
grant execute on function public.current_user_is_platform_admin() to authenticated;

create table public.school_classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  unique(school_id, id), unique(school_id, name)
);
create table public.school_subjects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  unique(school_id, id), unique(school_id, name)
);
create table public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('class_teacher', 'subject_teacher')),
  class_id uuid not null,
  subject_id uuid,
  foreign key(school_id, user_id, role) references public.school_memberships(school_id, user_id, role) on delete cascade,
  foreign key(school_id, class_id) references public.school_classes(school_id, id) on delete cascade,
  foreign key(school_id, subject_id) references public.school_subjects(school_id, id) on delete cascade,
  check ((role = 'class_teacher' and subject_id is null) or (role = 'subject_teacher' and subject_id is not null))
);
create unique index class_teacher_assignment_unique on public.teacher_assignments(school_id, user_id, class_id) where role = 'class_teacher';
create unique index subject_teacher_assignment_unique on public.teacher_assignments(school_id, user_id, class_id, subject_id) where role = 'subject_teacher';
create index teacher_assignments_user_idx on public.teacher_assignments(user_id, school_id);

create function private.can_manage_school(requested_school uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select private.is_platform_admin() or private.has_school_role(requested_school, array['school_admin']); $$;
create function private.has_teaching_assignment(requested_school uuid, requested_class uuid default null, requested_subject uuid default null)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.teacher_assignments a
    where a.school_id = requested_school and a.user_id = (select auth.uid())
      and (requested_class is null or a.class_id = requested_class)
      and (requested_subject is null or a.subject_id = requested_subject)
      and private.has_school_role(a.school_id, array[a.role])
  );
$$;
revoke all on function private.can_manage_school(uuid), private.has_teaching_assignment(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function private.can_manage_school(uuid), private.has_teaching_assignment(uuid, uuid, uuid) to authenticated;

alter table public.school_classes enable row level security;
alter table public.school_subjects enable row level security;
alter table public.teacher_assignments enable row level security;
revoke all on public.school_classes, public.school_subjects, public.teacher_assignments from public, anon, authenticated;
grant select on public.school_classes, public.school_subjects, public.teacher_assignments to authenticated;
grant all on public.school_classes, public.school_subjects, public.teacher_assignments to service_role;
create policy classes_read_scope on public.school_classes for select to authenticated
using (private.can_manage_school(school_id) or private.has_teaching_assignment(school_id, id, null));
create policy subjects_read_scope on public.school_subjects for select to authenticated
using (private.can_manage_school(school_id) or private.has_teaching_assignment(school_id, null, id));
create policy assignments_read_scope on public.teacher_assignments for select to authenticated
using (private.can_manage_school(school_id) or (user_id = (select auth.uid()) and private.has_school_role(school_id, array[role])));

-- Idempotent onboarding: a confirmed account may create one NEW school and owns only it.
-- Metadata supplies names, never the target user, membership role or an existing school ID.
create table private.school_registrations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null
);
alter table private.school_registrations enable row level security;
revoke all on private.school_registrations from public, anon, authenticated;
grant all on private.school_registrations to service_role;
create function public.register_my_school(school_name text, school_slug text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare caller uuid := auth.uid(); registered_school uuid;
begin
  if caller is null or not exists (select 1 from auth.users where id = caller and email_confirmed_at is not null) then
    raise exception 'Confirm your email before registering a school.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(caller::text, 0));
  select school_id into registered_school from private.school_registrations where user_id = caller;
  if found then
    if registered_school is null then raise exception 'Your school registration was removed. Contact the platform owner.'; end if;
    return registered_school;
  end if;
  if exists(select 1 from public.school_memberships where user_id = caller) then
    raise exception 'This account already has a school membership. Use a separate administrator account to register a new school.';
  end if;
  insert into public.schools(name, slug) values (btrim(school_name), lower(btrim(school_slug))) returning id into registered_school;
  insert into public.school_memberships(school_id, user_id, role) values (registered_school, caller, 'school_admin');
  insert into private.school_registrations(user_id, school_id) values (caller, registered_school);
  return registered_school;
end;
$$;

create function public.create_school_catalog_item(requested_school uuid, item_kind text, item_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare item_id uuid;
begin
  if not private.can_manage_school(requested_school) then raise exception 'School administrator access required.'; end if;
  if item_kind = 'class' then
    insert into public.school_classes(school_id, name) values(requested_school, btrim(item_name)) returning id into item_id;
  elsif item_kind = 'subject' then
    insert into public.school_subjects(school_id, name) values(requested_school, btrim(item_name)) returning id into item_id;
  else raise exception 'Choose class or subject.';
  end if;
  return item_id;
end;
$$;

create function public.assign_school_teacher(requested_school uuid, teacher_email text, teacher_role text, requested_class uuid, requested_subject uuid default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare teacher_id uuid; assignment_id uuid;
begin
  if not private.can_manage_school(requested_school) then raise exception 'School administrator access required.'; end if;
  if teacher_role not in ('subject_teacher', 'class_teacher') then raise exception 'Only teacher roles can be assigned here.'; end if;
  select id into teacher_id from auth.users where lower(email) = lower(btrim(teacher_email)) and email_confirmed_at is not null;
  if teacher_id is null then raise exception 'Ask the teacher to sign up and confirm their email first.'; end if;
  insert into public.school_memberships(school_id, user_id, role) values (requested_school, teacher_id, teacher_role)
    on conflict(school_id, user_id, role) do update set status = 'active';
  insert into public.teacher_assignments(school_id, user_id, role, class_id, subject_id)
    values(requested_school, teacher_id, teacher_role, requested_class, requested_subject)
    on conflict do nothing returning id into assignment_id;
  if assignment_id is null then
    select id into assignment_id from public.teacher_assignments where school_id = requested_school and user_id = teacher_id
      and role = teacher_role and class_id = requested_class and subject_id is not distinct from requested_subject;
  end if;
  return assignment_id;
end;
$$;
create function public.remove_teacher_assignment(requested_assignment uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare assignment public.teacher_assignments;
begin
  select * into assignment from public.teacher_assignments where id = requested_assignment for update;
  if not found or not private.can_manage_school(assignment.school_id) then raise exception 'School administrator access required.'; end if;
  delete from public.teacher_assignments where id = requested_assignment;
  if not exists(select 1 from public.teacher_assignments where school_id = assignment.school_id and user_id = assignment.user_id and role = assignment.role) then
    delete from public.school_memberships where school_id = assignment.school_id and user_id = assignment.user_id and role = assignment.role;
  end if;
end;
$$;
create function public.list_school_teacher_accounts(requested_school uuid)
returns table(user_id uuid, email text, display_name text)
language plpgsql stable security definer set search_path = ''
as $$ begin
  if not private.can_manage_school(requested_school) then raise exception 'School administrator access required.'; end if;
  return query select distinct u.id, u.email::text, p.display_name
    from public.school_memberships m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.id = u.id
    where m.school_id = requested_school and m.role in ('subject_teacher', 'class_teacher');
end; $$;

create function public.platform_set_school_status(requested_school uuid, requested_status text)
returns void language plpgsql security definer set search_path = ''
as $$ begin
  if not private.is_platform_admin() then raise exception 'Platform administrator access required.'; end if;
  if requested_status not in ('active', 'suspended') then raise exception 'Invalid school status.'; end if;
  update public.schools set status = requested_status where id = requested_school;
  if not found then raise exception 'School not found.'; end if;
end; $$;
create function public.platform_create_school(school_name text, school_slug text, administrator_email text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare administrator uuid; created_school uuid;
begin
  if not private.is_platform_admin() then raise exception 'Platform administrator access required.'; end if;
  select id into administrator from auth.users where lower(email) = lower(btrim(administrator_email)) and email_confirmed_at is not null;
  if administrator is null then raise exception 'The school administrator must sign up and confirm their email first.'; end if;
  insert into public.schools(name, slug) values(btrim(school_name), lower(btrim(school_slug))) returning id into created_school;
  insert into public.school_memberships(school_id, user_id, role) values(created_school, administrator, 'school_admin');
  return created_school;
end;
$$;
create function public.platform_remove_school(requested_school uuid)
returns void language plpgsql security definer set search_path = ''
as $$ begin
  if not private.is_platform_admin() then raise exception 'Platform administrator access required.'; end if;
  delete from public.schools where id = requested_school;
  if not found then raise exception 'School not found.'; end if;
end; $$;

revoke all on function public.register_my_school(text,text), public.create_school_catalog_item(uuid,text,text), public.assign_school_teacher(uuid,text,text,uuid,uuid), public.remove_teacher_assignment(uuid), public.list_school_teacher_accounts(uuid), public.platform_create_school(text,text,text), public.platform_set_school_status(uuid,text), public.platform_remove_school(uuid) from public, anon, authenticated;
grant execute on function public.register_my_school(text,text), public.create_school_catalog_item(uuid,text,text), public.assign_school_teacher(uuid,text,text,uuid,uuid), public.remove_teacher_assignment(uuid), public.list_school_teacher_accounts(uuid), public.platform_create_school(text,text,text), public.platform_set_school_status(uuid,text), public.platform_remove_school(uuid) to authenticated;
notify pgrst, 'reload schema';
-- Run in the trusted Supabase Dashboard SQL Editor after both migrations.
-- This grants platform access to the verified company account only.
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

