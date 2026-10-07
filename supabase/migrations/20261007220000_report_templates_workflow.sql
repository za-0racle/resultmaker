-- Report configuration, attendance/ratings/comments, publication, verification and audit.
-- No public verification endpoint, QR generator or PDF renderer is introduced.
begin;
create table public.result_templates (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), name text not null,
  version integer not null default 1 check(version>0), status text not null default 'draft' check(status in ('draft','active','archived')),
  renderer_key text not null default 'academic-report', layout jsonb not null default '{}' check(jsonb_typeof(layout)='object'),
  created_at timestamptz not null default now(), unique(school_id,id), unique(school_id,name,version)
);
alter table public.student_results add column template_id uuid, add foreign key(school_id,template_id) references public.result_templates(school_id,id);
grant select(template_id) on public.student_results to authenticated;
grant insert(template_id) on public.student_results to authenticated;
create table public.rating_scales (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), name text not null,
  version integer not null default 1 check(version>0), status text not null default 'draft' check(status in ('draft','active','archived')),
  unique(school_id,id), unique(school_id,name,version)
);
create table public.rating_scale_items (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), scale_id uuid not null,
  value integer not null, label text not null, sort_order integer not null check(sort_order>=0),
  unique(school_id,id), unique(school_id,scale_id,value), foreign key(school_id,scale_id) references public.rating_scales(school_id,id)
);
create table public.rating_categories (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id),
  domain text not null check(domain in ('affective','psychomotor','custom')), name text not null, sort_order integer not null default 0,
  unique(school_id,id), unique(school_id,domain,name)
);
create table public.rating_items (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), category_id uuid not null, scale_id uuid not null,
  name text not null, sort_order integer not null default 0, active boolean not null default true,
  unique(school_id,id), unique(school_id,id,scale_id), unique(school_id,category_id,name),
  foreign key(school_id,category_id) references public.rating_categories(school_id,id), foreign key(school_id,scale_id) references public.rating_scales(school_id,id)
);
create table public.student_ratings (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), student_result_id uuid not null,
  item_id uuid not null, scale_id uuid not null, value integer not null,
  unique(school_id,id), unique(school_id,student_result_id,item_id),
  foreign key(school_id,student_result_id) references public.student_results(school_id,id),
  foreign key(school_id,item_id,scale_id) references public.rating_items(school_id,id,scale_id),
  foreign key(school_id,scale_id,value) references public.rating_scale_items(school_id,scale_id,value)
);
create table public.result_attendance (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), student_result_id uuid not null,
  school_days numeric(7,2) not null check(school_days>=0), days_present numeric(7,2) not null check(days_present>=0 and days_present<=school_days),
  days_absent numeric generated always as (school_days-days_present) stored,
  percentage numeric generated always as (case when school_days=0 then null else round(days_present/school_days*100,2) end) stored,
  extra_fields jsonb not null default '{}' check(jsonb_typeof(extra_fields)='object'),
  unique(school_id,id), unique(school_id,student_result_id), foreign key(school_id,student_result_id) references public.student_results(school_id,id)
);
create table public.result_comments (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), student_result_id uuid not null,
  academic_result_id uuid, comment_type text not null check(comment_type in ('subject_teacher','class_teacher','head_teacher')), body text not null check(length(body)<=5000),
  created_by uuid default auth.uid() references auth.users(id), created_at timestamptz not null default now(),
  unique(school_id,id), foreign key(school_id,student_result_id) references public.student_results(school_id,id),
  foreign key(school_id,academic_result_id) references public.academic_results(school_id,id),
  check((comment_type='subject_teacher' and academic_result_id is not null) or (comment_type<>'subject_teacher' and academic_result_id is null))
);
create unique index subject_comment_unique on public.result_comments(school_id,academic_result_id) where comment_type='subject_teacher';
create unique index report_comment_unique on public.result_comments(school_id,student_result_id,comment_type) where comment_type<>'subject_teacher';
create table public.result_verifications (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), student_result_id uuid not null,
  verification_id uuid not null default gen_random_uuid(), status text not null default 'active' check(status in ('active','revoked')),
  issued_at timestamptz not null default now(), revoked_at timestamptz, revocation_reason text,
  unique(school_id,id), unique(school_id,student_result_id), unique(verification_id),
  foreign key(school_id,student_result_id) references public.student_results(school_id,id),
  check((status='active' and revoked_at is null) or (status='revoked' and revoked_at is not null))
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id),
  actor_id uuid, record_type text not null, record_id uuid not null, action text not null,
  occurred_at timestamptz not null default now(), details jsonb not null default '{}' check(jsonb_typeof(details)='object')
);
create index audit_school_time_idx on public.audit_logs(school_id,occurred_at desc);
create index audit_record_idx on public.audit_logs(school_id,record_type,record_id);
create function private.audit_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare record jsonb;
begin
  record:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  insert into public.audit_logs(school_id,actor_id,record_type,record_id,action,details)
    values((record->>'school_id')::uuid,auth.uid(),tg_table_name,(record->>'id')::uuid,lower(tg_op),
      jsonb_build_object('previous_status',case when tg_op='INSERT' then null else to_jsonb(old)->>'status' end,'status',record->>'status'));
  if tg_op='DELETE' then return old; end if; return new;
end; $$;
create function private.reject_audit_rewrite()
returns trigger language plpgsql set search_path = '' as $$ begin raise exception 'Audit logs are append-only.'; end; $$;
create trigger append_only before update or delete on public.audit_logs for each row execute function private.reject_audit_rewrite();
create function private.lock_simple_version()
returns trigger language plpgsql set search_path = '' as $$ begin
  if tg_op='INSERT' and new.status<>'draft' then raise exception 'Configuration starts as a draft.'; end if;
  if tg_op='UPDATE' and old.status<>'draft' and ((to_jsonb(new)-'status') is distinct from (to_jsonb(old)-'status') or (new.status is distinct from old.status and not(old.status='active' and new.status='archived'))) then raise exception 'Create a new configuration version.'; end if;
  return new;
end; $$;
create trigger template_version before insert or update on public.result_templates for each row execute function private.lock_simple_version();
create trigger rating_version before insert or update on public.rating_scales for each row execute function private.lock_simple_version();
create trigger rating_scale_item_version before insert or update or delete on public.rating_scale_items for each row execute function private.lock_config_child('rating_scales','scale_id');
create function private.can_edit_report(requested_school uuid, requested_result uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.student_results r where r.school_id=requested_school and r.id=requested_result and r.status='draft' and private.can_access_class(r.school_id,r.class_id,r.session_id,true));
$$;
create function private.can_read_full_report(requested_school uuid, requested_result uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.student_results r where r.school_id=requested_school and r.id=requested_result and private.can_access_class(r.school_id,r.class_id,r.session_id,true));
$$;
create function private.guard_report_child()
returns trigger language plpgsql security definer set search_path = '' as $$
declare record jsonb; parent_status text; parent_id uuid; actual_parent uuid;
begin
  record:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  parent_id:=(record->>'student_result_id')::uuid;
  select status into parent_status from public.student_results where school_id=(record->>'school_id')::uuid and id=parent_id for update;
  if parent_status is distinct from 'draft' then raise exception 'Only draft report data can be edited.'; end if;
  if tg_op='UPDATE' and (old.school_id<>new.school_id or old.student_result_id<>new.student_result_id) then raise exception 'Report child ownership cannot change.'; end if;
  if tg_table_name='result_comments' and (record->>'academic_result_id') is not null then
    select student_result_id into actual_parent from public.academic_results where id=(record->>'academic_result_id')::uuid and school_id=(record->>'school_id')::uuid;
    if actual_parent is distinct from parent_id then raise exception 'Subject comment must belong to the same report.'; end if;
  end if;
  if tg_table_name='academic_results' then
    select status into parent_status from public.result_batches where id=(record->>'batch_id')::uuid and school_id=(record->>'school_id')::uuid for update;
    if parent_status is distinct from 'draft' then raise exception 'Only draft batches accept result rows.'; end if;
  end if;
  if tg_op='DELETE' then return old; end if; return new;
end; $$;
do $$ declare item text; begin
  foreach item in array array['academic_results','student_ratings','result_attendance','result_comments'] loop
    execute format('create trigger report_child_guard before insert or update or delete on public.%I for each row execute function private.guard_report_child()',item);
  end loop;
end; $$;
create function private.guard_report_publication()
returns trigger language plpgsql set search_path = '' as $$ begin
  if tg_op='INSERT' and new.status<>'draft' then raise exception 'New reports start as drafts.'; end if;
  if tg_op='UPDATE' and old.status='published' then raise exception 'Published reports are immutable; revoke verification or issue a separate corrected report version.'; end if;
  if tg_op='UPDATE' and (to_jsonb(new)-array['status','published_at','published_snapshot','updated_at']) is distinct from (to_jsonb(old)-array['status','published_at','published_snapshot','updated_at']) then raise exception 'Report academic identity cannot change.'; end if;
  return new;
end; $$;
create trigger report_publication_guard before insert or update on public.student_results for each row execute function private.guard_report_publication();
create function public.transition_result_batch(requested_batch uuid, next_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare batch public.result_batches;
begin
  select * into batch from public.result_batches where id=requested_batch for update;
  if not found then raise exception 'Result batch not found.'; end if;
  if batch.status='draft' and next_status='submitted' then
    if not private.can_access_offering(batch.school_id,batch.offering_id,true) then raise exception 'Assigned subject teacher access required.'; end if;
    if not exists(select 1 from public.academic_results where batch_id=batch.id) or exists(select 1 from public.academic_results a cross join public.assessment_components c
      where a.batch_id=batch.id and c.scheme_id=batch.assessment_scheme_id and c.active and not exists(select 1 from public.assessment_scores s where s.academic_result_id=a.id and s.component_id=c.id)) then raise exception 'Every result needs all active assessment component scores.'; end if;
  elsif not private.can_manage_school(batch.school_id) or not ((batch.status='submitted' and next_status='under_review') or (batch.status='under_review' and next_status='approved') or (batch.status='approved' and next_status='published')) then raise exception 'Invalid or unauthorized result transition.';
  end if;
  update public.result_batches set status=next_status,updated_at=now() where id=batch.id;
end; $$;
create function public.transition_student_result(requested_result uuid, next_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare result public.student_results; snapshot jsonb;
begin
  select * into result from public.student_results where id=requested_result for update;
  if not found then raise exception 'Student result not found.'; end if;
  if result.status='draft' and next_status='submitted' then
    if not private.can_edit_report(result.school_id,result.id) then raise exception 'Assigned class teacher or school administrator access required.'; end if;
  elsif not private.can_manage_school(result.school_id) or not ((result.status='submitted' and next_status='under_review') or (result.status='under_review' and next_status='approved') or (result.status='approved' and next_status='published')) then raise exception 'Invalid or unauthorized report transition.';
  end if;
  if next_status='published' then
    if result.template_id is null or not exists(select 1 from public.result_templates where id=result.template_id and school_id=result.school_id and status='active') then raise exception 'An active report template is required.'; end if;
    if not exists(select 1 from public.academic_results where student_result_id=result.id) or exists(select 1 from public.academic_results a join public.result_batches b on b.id=a.batch_id where a.student_result_id=result.id and b.status<>'published') then raise exception 'Publish all included subject batches before publishing this report.'; end if;
    select jsonb_build_object(
      'schema_version',1,'school',to_jsonb(s),'student',to_jsonb(student),'enrollment',to_jsonb(e),'session',to_jsonb(session),'term',to_jsonb(term),
      'class',to_jsonb(class),'template',to_jsonb(template),
      'academics',(select coalesce(jsonb_agg(jsonb_build_object('subject',to_jsonb(subject),'assessment_scheme',to_jsonb(scheme),'grading_scale',to_jsonb(scale),
        'grading_bands',(select jsonb_agg(to_jsonb(g) order by minimum_score) from public.grading_scale_items g where g.scale_id=scale.id),
        'calculation',to_jsonb(calculation),'components',(select jsonb_agg(jsonb_build_object('name',c.name,'max_score',c.max_score,'weight',c.weight,'score',score.score) order by c.sort_order)
          from public.assessment_components c join public.assessment_scores score on score.component_id=c.id and score.academic_result_id=a.id where c.scheme_id=a.assessment_scheme_id and c.active))), '[]')
        from public.academic_results a join public.result_batches b on b.id=a.batch_id join public.subject_offerings o on o.id=b.offering_id
        join public.school_subjects subject on subject.id=o.subject_id join public.assessment_schemes scheme on scheme.id=b.assessment_scheme_id
        join public.grading_scales scale on scale.id=b.grading_scale_id cross join lateral public.calculate_academic_result(a.id) calculation where a.student_result_id=result.id),
      'ratings',(select coalesce(jsonb_agg(jsonb_build_object('domain',cat.domain,'category',cat.name,'item',item.name,'value',rating.value,'label',key.label)),'[]')
        from public.student_ratings rating join public.rating_items item on item.id=rating.item_id join public.rating_categories cat on cat.id=item.category_id
        join public.rating_scale_items key on key.scale_id=rating.scale_id and key.value=rating.value where rating.student_result_id=result.id),
      'attendance',(select to_jsonb(attendance) from public.result_attendance attendance where attendance.student_result_id=result.id),
      'comments',(select coalesce(jsonb_agg(jsonb_build_object('type',comment_type,'body',body,'academic_result_id',academic_result_id)),'[]') from public.result_comments where student_result_id=result.id))
    into snapshot from public.schools s join public.student_enrollments e on e.school_id=s.id and e.id=result.enrollment_id
      join public.students student on student.id=e.student_id join public.school_classes class on class.id=e.class_id
      join public.academic_sessions session on session.id=e.session_id join public.academic_terms term on term.id=result.term_id
      join public.result_templates template on template.id=result.template_id where s.id=result.school_id;
    update public.student_results set status='published',published_at=now(),published_snapshot=snapshot,updated_at=now() where id=result.id;
    insert into public.result_verifications(school_id,student_result_id) values(result.school_id,result.id);
  else update public.student_results set status=next_status,updated_at=now() where id=result.id;
  end if;
end; $$;
create function public.get_published_report(requested_result uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result public.student_results;
begin
  select * into result from public.student_results where id=requested_result and status='published';
  if not found or not private.can_read_full_report(result.school_id,result.id) then raise exception 'Full report access required.'; end if;
  return result.published_snapshot;
end; $$;
create function public.revoke_result_verification(requested_result uuid, reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare result public.student_results;
begin
  select * into result from public.student_results where id=requested_result and status='published';
  if not found or not private.can_manage_school(result.school_id) then raise exception 'School administrator access required.'; end if;
  update public.result_verifications set status='revoked',revoked_at=now(),revocation_reason=reason where student_result_id=result.id;
end; $$;

do $$ declare item text; begin
  foreach item in array array['result_templates','rating_scales','rating_scale_items','rating_categories','rating_items'] loop
    execute format('alter table public.%I enable row level security',item);
    execute format('revoke all on public.%I from public,anon,authenticated',item);
    execute format('grant select,insert,update on public.%I to authenticated',item);
    execute format('grant all on public.%I to service_role',item);
    execute format('create policy config_read on public.%I for select to authenticated using(private.can_manage_school(school_id) or private.has_school_role(school_id,array[''subject_teacher'',''class_teacher'']))',item);
    execute format('create policy config_insert on public.%I for insert to authenticated with check(private.can_manage_school(school_id))',item);
    execute format('create policy config_update on public.%I for update to authenticated using(private.can_manage_school(school_id)) with check(private.can_manage_school(school_id))',item);
  end loop;
  foreach item in array array['student_ratings','result_attendance','result_comments','result_verifications','audit_logs'] loop
    execute format('alter table public.%I enable row level security',item);
    execute format('revoke all on public.%I from public,anon,authenticated',item);
    execute format('grant select on public.%I to authenticated',item);
    execute format('grant all on public.%I to service_role',item);
  end loop;
  foreach item in array array['student_ratings','result_attendance'] loop
    execute format('grant insert,update on public.%I to authenticated',item);
    execute format('create policy child_read on public.%I for select to authenticated using(private.can_read_full_report(school_id,student_result_id))',item);
    execute format('create policy child_insert on public.%I for insert to authenticated with check(private.can_edit_report(school_id,student_result_id))',item);
    execute format('create policy child_update on public.%I for update to authenticated using(private.can_edit_report(school_id,student_result_id)) with check(private.can_edit_report(school_id,student_result_id))',item);
  end loop;
end; $$;
grant insert(school_id,student_result_id,academic_result_id,comment_type,body),update(body) on public.result_comments to authenticated;
create policy comments_read on public.result_comments for select to authenticated using(private.can_read_full_report(school_id,student_result_id) or (comment_type='subject_teacher' and private.can_access_academic_result(school_id,academic_result_id,false)));
create policy comments_insert on public.result_comments for insert to authenticated with check((comment_type='subject_teacher' and private.can_access_academic_result(school_id,academic_result_id,true)) or (comment_type='class_teacher' and private.can_edit_report(school_id,student_result_id)) or (comment_type='head_teacher' and private.can_manage_school(school_id) and private.can_edit_report(school_id,student_result_id)));
create policy comments_update on public.result_comments for update to authenticated using((comment_type='subject_teacher' and private.can_access_academic_result(school_id,academic_result_id,true)) or (comment_type='class_teacher' and private.can_edit_report(school_id,student_result_id)) or (comment_type='head_teacher' and private.can_manage_school(school_id) and private.can_edit_report(school_id,student_result_id))) with check(private.can_access_report(school_id,student_result_id));
create policy verification_read on public.result_verifications for select to authenticated using(private.can_read_full_report(school_id,student_result_id));
create policy audit_read on public.audit_logs for select to authenticated using(private.can_manage_school(school_id));
do $$ declare item text; begin
  foreach item in array array['students','teachers','teacher_assignments','student_enrollments','result_batches','student_results','academic_results','assessment_scores','result_comments','result_attendance','student_ratings','result_templates','result_verifications'] loop
    execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function private.audit_change()',item);
  end loop;
end; $$;
revoke all on function private.audit_change(),private.reject_audit_rewrite(),private.lock_simple_version(),private.guard_report_child(),private.guard_report_publication() from public,anon,authenticated;
revoke all on function private.can_edit_report(uuid,uuid),private.can_read_full_report(uuid,uuid),public.transition_result_batch(uuid,text),public.transition_student_result(uuid,text),public.get_published_report(uuid),public.revoke_result_verification(uuid,text) from public,anon,authenticated;
grant execute on function private.can_edit_report(uuid,uuid),private.can_read_full_report(uuid,uuid),public.transition_result_batch(uuid,text),public.transition_student_result(uuid,text),public.get_published_report(uuid),public.revoke_result_verification(uuid,text) to authenticated;
create function private.guard_result_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
declare previous jsonb; identity_key text;
begin
  if new.supersedes_id is null then
    if new.version<>1 then raise exception 'Initial result version must be one.'; end if;
  else
    execute format('select to_jsonb(r) from public.%I r where school_id=$1 and id=$2',tg_table_name) into previous using new.school_id,new.supersedes_id;
    identity_key:=case when tg_table_name='student_results' then 'enrollment_id' else 'offering_id' end;
    if previous is null or previous->>'status'<>'published' or (previous->>'version')::integer+1<>new.version
      or previous->>'term_id'<>new.term_id::text or previous->>identity_key<>to_jsonb(new)->>identity_key then
      raise exception 'Corrections must follow a published version of the same academic result.';
    end if;
  end if;
  return new;
end; $$;
create trigger report_revision before insert on public.student_results for each row execute function private.guard_result_revision();
create trigger batch_revision before insert on public.result_batches for each row execute function private.guard_result_revision();
revoke all on function private.guard_result_revision() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
