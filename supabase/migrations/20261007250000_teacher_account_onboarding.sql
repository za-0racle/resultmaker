-- Incremental teacher provisioning. Apply once after the verified expansion.
begin;
create table private.teacher_credentials (
 user_id uuid primary key references auth.users(id) on delete cascade,
 school_id uuid not null references public.schools(id),
 requires_change boolean not null default true,
 created_at timestamptz not null default now()
);
alter table private.teacher_credentials enable row level security;
revoke all on private.teacher_credentials from public,anon,authenticated;
grant all on private.teacher_credentials to service_role;
create function public.current_user_requires_password_change()
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.teacher_credentials where user_id=auth.uid() and requires_change);
$$;
create or replace function private.has_school_role(requested_school uuid,allowed_roles text[])
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.school_memberships m join public.schools s on s.id=m.school_id
 where m.school_id=requested_school and m.user_id=auth.uid() and m.status='active' and s.status='active' and m.role=any(allowed_roles))
 and not exists(select 1 from private.teacher_credentials where user_id=auth.uid() and requires_change);
$$;
create function public.current_user_can_manage_school(requested_school uuid)
returns boolean language sql stable security invoker set search_path='' as $$ select private.can_manage_school(requested_school); $$;
create function public.provision_teacher_account(requested_school uuid,requested_user uuid,display_name text,teacher_role text,requested_class uuid,requested_subject uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare teacher uuid;
begin
 if teacher_role not in ('class_teacher','subject_teacher') then raise exception 'Only teacher roles can be provisioned.'; end if;
 if not exists(select 1 from public.schools where id=requested_school and status='active' and archived_at is null) then raise exception 'School is not active.'; end if;
 insert into private.teacher_credentials(user_id,school_id) values(requested_user,requested_school);
 insert into public.teachers(school_id,user_id,display_name,email) select requested_school,requested_user,display_name,email from auth.users where id=requested_user returning id into teacher;
 if teacher is null then raise exception 'Account not found.'; end if;
 insert into public.school_memberships(school_id,user_id,role) values(requested_school,requested_user,teacher_role);
 insert into public.teacher_assignments(school_id,user_id,teacher_id,role,class_id,subject_id) values(requested_school,requested_user,teacher,teacher_role,requested_class,requested_subject);
end; $$;
create function public.complete_teacher_password_change(requested_user uuid)
returns void language sql security definer set search_path='' as $$ update private.teacher_credentials set requires_change=false where user_id=requested_user; $$;
revoke all on function public.current_user_requires_password_change(),public.current_user_can_manage_school(uuid),public.provision_teacher_account(uuid,uuid,text,text,uuid,uuid),public.complete_teacher_password_change(uuid) from public,anon,authenticated;
grant execute on function public.current_user_requires_password_change(),public.current_user_can_manage_school(uuid) to authenticated;
grant execute on function public.provision_teacher_account(uuid,uuid,text,text,uuid,uuid),public.complete_teacher_password_change(uuid) to service_role;
notify pgrst,'reload schema';
commit;
