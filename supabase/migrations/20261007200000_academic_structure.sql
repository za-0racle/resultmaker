-- Incremental expansion. Apply AFTER 20261007180000 (or its activation bundle).
-- Run inspect-current-schema.sql first. Existing rows, IDs, grants and API names remain.
begin;
do $$ begin
  if to_regclass('public.teacher_assignments') is null or to_regprocedure('private.can_manage_school(uuid)') is null then
    raise exception 'Apply the existing school/teacher foundation first.';
  end if;
end; $$;

alter table public.schools add column archived_at timestamptz, add column logo_path text;
create table public.school_campuses (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id),
  name text not null check(length(btrim(name)) between 1 and 150), code text, status text not null default 'active' check(status in ('active','inactive')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(school_id,id), unique(school_id,name)
);
create table public.school_sections (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id),
  name text not null check(length(btrim(name)) between 1 and 150), code text, sort_order integer not null default 0 check(sort_order>=0),
  status text not null default 'active' check(status in ('active','inactive')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(school_id,id), unique(school_id,name)
);
alter table public.school_classes add column section_id uuid, add column campus_id uuid, add column code text,
  add column status text not null default 'active' check(status in ('active','inactive')),
  add column created_at timestamptz not null default now(), add column updated_at timestamptz not null default now(),
  add foreign key(school_id,section_id) references public.school_sections(school_id,id),
  add foreign key(school_id,campus_id) references public.school_campuses(school_id,id);
alter table public.school_subjects add column section_id uuid, add column code text,
  add column status text not null default 'active' check(status in ('active','inactive')),
  add column created_at timestamptz not null default now(), add column updated_at timestamptz not null default now(),
  add foreign key(school_id,section_id) references public.school_sections(school_id,id);
create unique index school_subjects_code_unique on public.school_subjects(school_id,code) where code is not null;
create index school_classes_section_idx on public.school_classes(school_id,section_id);
create index school_subjects_section_idx on public.school_subjects(school_id,section_id);

create table public.academic_sessions (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id),
  name text not null check(length(btrim(name)) between 1 and 100), starts_on date, ends_on date,
  status text not null default 'planned' check(status in ('planned','active','closed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(school_id,id), unique(school_id,name), check(ends_on is null or starts_on is null or ends_on>=starts_on)
);
create table public.academic_terms (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), session_id uuid not null,
  name text not null check(length(btrim(name)) between 1 and 100), sort_order integer not null check(sort_order>=0), starts_on date, ends_on date,
  status text not null default 'planned' check(status in ('planned','active','closed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(school_id,id), unique(school_id,id,session_id), unique(school_id,session_id,name), unique(school_id,session_id,sort_order),
  foreign key(school_id,session_id) references public.academic_sessions(school_id,id), check(ends_on is null or starts_on is null or ends_on>=starts_on)
);
create table public.teachers (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id),
  user_id uuid references auth.users(id), campus_id uuid, staff_number text,
  display_name text not null check(length(btrim(display_name)) between 1 and 150), email text, phone text,
  status text not null default 'active' check(status in ('active','inactive')),
  custom_fields jsonb not null default '{}' check(jsonb_typeof(custom_fields)='object'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(school_id,id), unique(school_id,user_id), unique(school_id,staff_number),
  foreign key(school_id,campus_id) references public.school_campuses(school_id,id)
);
-- Backfill without changing existing membership, assignment or user identifiers.
insert into public.teachers(school_id,user_id,display_name,email)
select distinct m.school_id,m.user_id,coalesce(p.display_name,'Teacher'),u.email
from public.school_memberships m join auth.users u on u.id=m.user_id left join public.profiles p on p.id=m.user_id
where m.role in ('subject_teacher','class_teacher') on conflict(school_id,user_id) do nothing;
alter table public.teacher_assignments add column teacher_id uuid, add column session_id uuid,
  add column created_at timestamptz not null default now(), add column updated_at timestamptz not null default now();
update public.teacher_assignments a set teacher_id=t.id from public.teachers t where t.school_id=a.school_id and t.user_id=a.user_id;
alter table public.teacher_assignments alter column teacher_id set not null, alter column user_id drop not null,
  add foreign key(school_id,teacher_id) references public.teachers(school_id,id),
  add foreign key(school_id,session_id) references public.academic_sessions(school_id,id);
create unique index teacher_entity_class_unique on public.teacher_assignments(school_id,teacher_id,class_id) where role='class_teacher';
create unique index teacher_entity_subject_unique on public.teacher_assignments(school_id,teacher_id,class_id,subject_id) where role='subject_teacher';
-- Existing assignment uniqueness stays intentionally session-independent; session_id
-- narrows an assignment. Annual rollover edits/archives assignments; historical results
-- preserve their offering/session rather than relying on current teaching assignments.
create function private.sync_assignment_teacher()
returns trigger language plpgsql security definer set search_path = '' as $$
declare teacher public.teachers;
begin
  if new.teacher_id is null then
    if new.user_id is null then raise exception 'A teacher entity or linked account is required.'; end if;
    insert into public.teachers(school_id,user_id,display_name,email)
      select new.school_id,u.id,coalesce(p.display_name,'Teacher'),u.email from auth.users u left join public.profiles p on p.id=u.id where u.id=new.user_id
      on conflict(school_id,user_id) do nothing;
    select * into teacher from public.teachers where school_id=new.school_id and user_id=new.user_id;
    new.teacher_id:=teacher.id;
  else select * into teacher from public.teachers where school_id=new.school_id and id=new.teacher_id;
  end if;
  if teacher.id is null or teacher.user_id is distinct from new.user_id then raise exception 'Teacher and Auth account must match in this school.'; end if;
  return new;
end; $$;
create trigger assignment_teacher_identity before insert or update on public.teacher_assignments for each row execute function private.sync_assignment_teacher();
create or replace function private.has_teaching_assignment(requested_school uuid, requested_class uuid default null, requested_subject uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.teacher_assignments a join public.teachers t on t.id=a.teacher_id and t.school_id=a.school_id
    where a.school_id=requested_school and a.user_id=(select auth.uid()) and t.status='active'
    and (requested_class is null or a.class_id=requested_class) and (requested_subject is null or a.subject_id=requested_subject)
    and private.has_school_role(a.school_id,array[a.role]));
$$;
create function public.assign_teacher_entity(requested_school uuid, requested_teacher uuid, teacher_role text, requested_class uuid, requested_subject uuid default null, requested_session uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare teacher public.teachers; assigned uuid;
begin
  if not private.can_manage_school(requested_school) then raise exception 'School administrator access required.'; end if;
  if teacher_role is null or teacher_role not in ('class_teacher','subject_teacher') then raise exception 'Only teaching roles are allowed.'; end if;
  select * into teacher from public.teachers where school_id=requested_school and id=requested_teacher and status='active';
  if not found then raise exception 'Active teacher not found in this school.'; end if;
  if teacher.user_id is not null then
    insert into public.school_memberships(school_id,user_id,role) values(requested_school,teacher.user_id,teacher_role)
      on conflict(school_id,user_id,role) do update set status='active';
  end if;
  insert into public.teacher_assignments(school_id,teacher_id,user_id,role,class_id,subject_id,session_id)
    values(requested_school,teacher.id,teacher.user_id,teacher_role,requested_class,requested_subject,requested_session) returning id into assigned;
  return assigned;
end; $$;
create function public.link_teacher_account(requested_school uuid, requested_teacher uuid, teacher_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare linked_user uuid; teacher public.teachers;
begin
  if not private.can_manage_school(requested_school) then raise exception 'School administrator access required.'; end if;
  select * into teacher from public.teachers where school_id=requested_school and id=requested_teacher for update;
  if not found or teacher.user_id is not null then raise exception 'Choose an unlinked teacher in this school.'; end if;
  select id into linked_user from auth.users where lower(email)=lower(btrim(teacher_email)) and email_confirmed_at is not null;
  if linked_user is null then raise exception 'The account must exist and have a confirmed email.'; end if;
  update public.teachers set user_id=linked_user where id=teacher.id;
  insert into public.school_memberships(school_id,user_id,role)
    select distinct requested_school,linked_user,role from public.teacher_assignments where school_id=requested_school and teacher_id=teacher.id
    on conflict(school_id,user_id,role) do update set status='active';
  update public.teacher_assignments set user_id=linked_user where school_id=requested_school and teacher_id=teacher.id;
end; $$;

create table public.students (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id),
  admission_number text not null check(length(btrim(admission_number)) between 1 and 100),
  first_name text not null check(length(btrim(first_name)) between 1 and 100), middle_name text, last_name text not null check(length(btrim(last_name)) between 1 and 100),
  gender text, date_of_birth date, photo_path text, class_id uuid, campus_id uuid,
  status text not null default 'active' check(status in ('active','inactive','withdrawn','graduated')),
  custom_fields jsonb not null default '{}' check(jsonb_typeof(custom_fields)='object'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(school_id,id), unique(school_id,admission_number),
  foreign key(school_id,class_id) references public.school_classes(school_id,id), foreign key(school_id,campus_id) references public.school_campuses(school_id,id)
);
create table public.student_enrollments (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), student_id uuid not null, class_id uuid not null, session_id uuid not null,
  status text not null default 'active' check(status in ('active','withdrawn','completed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(school_id,id), unique(school_id,id,class_id,session_id), unique(school_id,student_id,session_id),
  foreign key(school_id,student_id) references public.students(school_id,id), foreign key(school_id,class_id) references public.school_classes(school_id,id),
  foreign key(school_id,session_id) references public.academic_sessions(school_id,id)
);
create index students_class_idx on public.students(school_id,class_id);
create index enrollments_class_session_idx on public.student_enrollments(school_id,class_id,session_id);
create function private.can_access_class(requested_school uuid, requested_class uuid, requested_session uuid, class_teacher_only boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.can_manage_school(requested_school) or exists(select 1 from public.teacher_assignments a join public.teachers t on t.school_id=a.school_id and t.id=a.teacher_id
    where a.school_id=requested_school and a.class_id=requested_class and a.user_id=(select auth.uid()) and t.status='active'
    and (a.session_id is null or a.session_id=requested_session) and (not class_teacher_only or a.role='class_teacher') and private.has_school_role(a.school_id,array[a.role]));
$$;

create function private.can_read_student(requested_school uuid, requested_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.can_manage_school(requested_school) or exists(select 1 from public.students s where s.school_id=requested_school and s.id=requested_student and private.can_access_class(s.school_id,s.class_id,null,false))
    or exists(select 1 from public.student_enrollments e where e.school_id=requested_school and e.student_id=requested_student and private.can_access_class(e.school_id,e.class_id,e.session_id,false));
$$;
create table public.student_imports (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id),
  source_type text not null check(source_type in ('csv','xlsx','google_sheets')), source_name text not null, source_path text,
  column_mapping jsonb not null default '{}' check(jsonb_typeof(column_mapping)='object'),
  status text not null default 'draft' check(status in ('draft','queued','running','completed','failed','cancelled')),
  row_count integer not null default 0 check(row_count>=0), imported_count integer not null default 0 check(imported_count>=0), error_count integer not null default 0 check(error_count>=0),
  created_by uuid default auth.uid() references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(school_id,id), check(imported_count+error_count<=row_count)
);
create table public.student_import_rows (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), import_id uuid not null, row_number integer not null check(row_number>0),
  raw_data jsonb not null check(jsonb_typeof(raw_data)='object'), validation_errors jsonb not null default '[]' check(jsonb_typeof(validation_errors)='array'),
  status text not null default 'pending' check(status in ('pending','valid','invalid','imported')), student_id uuid,
  created_at timestamptz not null default now(), unique(school_id,id), unique(school_id,import_id,row_number),
  foreign key(school_id,import_id) references public.student_imports(school_id,id), foreign key(school_id,student_id) references public.students(school_id,id)
);

-- New catalogs: administrators manage; active school members read non-personal setup.
do $$ declare item text; begin
  foreach item in array array['school_campuses','school_sections','academic_sessions','academic_terms'] loop
    execute format('alter table public.%I enable row level security',item);
    execute format('revoke all on public.%I from public, anon, authenticated',item);
    execute format('grant select, insert, update on public.%I to authenticated',item);
    execute format('grant all on public.%I to service_role',item);
    execute format('create policy setup_read on public.%I for select to authenticated using (private.can_manage_school(school_id) or private.has_school_role(school_id,array[''school_admin'',''subject_teacher'',''class_teacher'',''student'',''parent'']))',item);
    execute format('create policy setup_insert on public.%I for insert to authenticated with check (private.can_manage_school(school_id))',item);
    execute format('create policy setup_update on public.%I for update to authenticated using (private.can_manage_school(school_id)) with check (private.can_manage_school(school_id))',item);
    execute format('create trigger updated_at before update on public.%I for each row execute function private.set_updated_at()',item);
  end loop;
end; $$;
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.student_enrollments enable row level security;
alter table public.student_imports enable row level security;
alter table public.student_import_rows enable row level security;
revoke all on public.teachers,public.students,public.student_enrollments,public.student_imports,public.student_import_rows from public,anon,authenticated;
grant select on public.teachers,public.students,public.student_enrollments,public.student_imports,public.student_import_rows to authenticated;
grant insert(school_id,campus_id,staff_number,display_name,email,phone,status,custom_fields), update(campus_id,staff_number,display_name,email,phone,status,custom_fields) on public.teachers to authenticated;
grant insert(school_id,admission_number,first_name,middle_name,last_name,gender,date_of_birth,photo_path,class_id,campus_id,status,custom_fields), update(admission_number,first_name,middle_name,last_name,gender,date_of_birth,photo_path,class_id,campus_id,status,custom_fields) on public.students to authenticated;
grant insert(school_id,student_id,class_id,session_id,status), update(status) on public.student_enrollments to authenticated;
grant insert(school_id,source_type,source_name,source_path,column_mapping) on public.student_imports to authenticated;
grant all on public.teachers,public.students,public.student_enrollments,public.student_imports,public.student_import_rows to service_role;
create policy teachers_read on public.teachers for select to authenticated using(private.can_manage_school(school_id) or (user_id=(select auth.uid()) and private.has_school_role(school_id,array['class_teacher','subject_teacher'])));
create policy teachers_insert on public.teachers for insert to authenticated with check(private.can_manage_school(school_id));
create policy teachers_update on public.teachers for update to authenticated using(private.can_manage_school(school_id)) with check(private.can_manage_school(school_id));
create policy students_read on public.students for select to authenticated using(private.can_read_student(school_id,id));
create policy students_insert on public.students for insert to authenticated with check(private.can_manage_school(school_id));
create policy students_update on public.students for update to authenticated using(private.can_manage_school(school_id)) with check(private.can_manage_school(school_id));
create policy enrollments_read on public.student_enrollments for select to authenticated using(private.can_access_class(school_id,class_id,session_id,false));
create policy enrollments_insert on public.student_enrollments for insert to authenticated with check(private.can_manage_school(school_id));
create policy enrollments_update on public.student_enrollments for update to authenticated using(private.can_manage_school(school_id)) with check(private.can_manage_school(school_id));
create policy imports_read on public.student_imports for select to authenticated using(private.can_manage_school(school_id));
create policy imports_insert on public.student_imports for insert to authenticated with check(private.can_manage_school(school_id) and created_by=(select auth.uid()));
create policy import_rows_read on public.student_import_rows for select to authenticated using(private.can_manage_school(school_id));
grant update(name,section_id,campus_id,code,status) on public.school_classes to authenticated;
grant update(name,section_id,code,status) on public.school_subjects to authenticated;
create policy classes_update_admin on public.school_classes for update to authenticated
using(private.can_manage_school(school_id)) with check(private.can_manage_school(school_id));
create policy subjects_update_admin on public.school_subjects for update to authenticated
using(private.can_manage_school(school_id)) with check(private.can_manage_school(school_id));
do $$ declare item text; begin
  foreach item in array array['school_classes','school_subjects','teachers','teacher_assignments','students','student_enrollments','student_imports'] loop
    execute format('create trigger updated_at before update on public.%I for each row execute function private.set_updated_at()',item);
  end loop;
end; $$;
revoke all on function private.sync_assignment_teacher(), private.can_read_student(uuid,uuid) from public,anon,authenticated;
grant execute on function private.can_read_student(uuid,uuid) to authenticated;
revoke all on function private.can_access_class(uuid,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function private.can_access_class(uuid,uuid,uuid,boolean) to authenticated;
revoke all on function public.assign_teacher_entity(uuid,uuid,text,uuid,uuid,uuid),public.link_teacher_account(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.assign_teacher_entity(uuid,uuid,text,uuid,uuid,uuid),public.link_teacher_account(uuid,uuid,text) to authenticated;

-- Archive rather than delete tenant history. Preserve the existing RPC name/API.
create or replace function public.platform_remove_school(requested_school uuid)
returns void language plpgsql security definer set search_path = '' as $$ begin
  if not private.is_platform_admin() then raise exception 'Platform administrator access required.'; end if;
  update public.schools set status='suspended',archived_at=coalesce(archived_at,now()) where id=requested_school;
  if not found then raise exception 'School not found.'; end if;
end; $$;
create or replace function public.platform_set_school_status(requested_school uuid, requested_status text)
returns void language plpgsql security definer set search_path = '' as $$ begin
  if not private.is_platform_admin() then raise exception 'Platform administrator access required.'; end if;
  if requested_status is null or requested_status not in ('active','suspended') then raise exception 'Invalid school status.'; end if;
  update public.schools set status=requested_status where id=requested_school and archived_at is null;
  if not found then raise exception 'School not found or archived.'; end if;
end; $$;
notify pgrst,'reload schema';
commit;
