-- Incremental normalized assessments/results. Review MIGRATION_PLAN.md first.
begin;
create table public.assessment_schemes (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), name text not null,
  version integer not null default 1 check(version>0), status text not null default 'draft' check(status in ('draft','active','archived')),
  created_at timestamptz not null default now(), unique(school_id,id), unique(school_id,name,version)
);
create table public.assessment_components (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), scheme_id uuid not null,
  name text not null check(length(btrim(name)) between 1 and 100), max_score numeric(9,3) not null check(max_score>0),
  weight numeric(7,3) not null check(weight>0 and weight<=100), sort_order integer not null check(sort_order>=0), active boolean not null default true,
  unique(school_id,id), unique(school_id,id,scheme_id), unique(school_id,scheme_id,name), unique(school_id,scheme_id,sort_order),
  foreign key(school_id,scheme_id) references public.assessment_schemes(school_id,id)
);
create table public.grading_scales (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), name text not null,
  version integer not null default 1 check(version>0), status text not null default 'draft' check(status in ('draft','active','archived')),
  created_at timestamptz not null default now(), unique(school_id,id), unique(school_id,name,version)
);
create table public.grading_scale_items (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), scale_id uuid not null,
  minimum_score numeric(7,3) not null check(minimum_score>=0), maximum_score numeric(7,3) not null check(maximum_score<=100),
  grade text not null, remark text not null default '', check(minimum_score<maximum_score),
  unique(school_id,id), unique(school_id,scale_id,minimum_score), foreign key(school_id,scale_id) references public.grading_scales(school_id,id)
);
-- Bands are [minimum,maximum), except 100 belongs to the last band.
create function private.lock_config_child()
returns trigger language plpgsql security definer set search_path = '' as $$
declare parent_id uuid; previous_id uuid; parent_status text;
begin
  parent_id := case when tg_op='DELETE' then (to_jsonb(old)->>tg_argv[1])::uuid else (to_jsonb(new)->>tg_argv[1])::uuid end;
  previous_id := case when tg_op='UPDATE' then (to_jsonb(old)->>tg_argv[1])::uuid else parent_id end;
  execute format('select status from public.%I where id=$1 for update',tg_argv[0]) into parent_status using previous_id;
  if parent_status is distinct from 'draft' then raise exception 'Create a new configuration version; active versions are immutable.'; end if;
  execute format('select status from public.%I where id=$1 for update',tg_argv[0]) into parent_status using parent_id;
  if parent_status is distinct from 'draft' then raise exception 'Only draft configuration is editable.'; end if;
  if tg_op='DELETE' then return old; end if; return new;
end; $$;
create trigger assessment_component_version before insert or update or delete on public.assessment_components for each row execute function private.lock_config_child('assessment_schemes','scheme_id');
create trigger grading_item_version before insert or update or delete on public.grading_scale_items for each row execute function private.lock_config_child('grading_scales','scale_id');
create function private.validate_config_activation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare total numeric; first_score numeric; last_score numeric; invalid boolean;
begin
  if tg_op='INSERT' and new.status<>'draft' then raise exception 'New configuration must start as a draft.'; end if;
  if tg_op='UPDATE' and old.status<>'draft' then
    if to_jsonb(new)-'status' is distinct from to_jsonb(old)-'status' or (new.status is distinct from old.status and not(old.status='active' and new.status='archived')) then
      raise exception 'Active/archived configuration versions are immutable.';
    end if;
  end if;
  if new.status='active' and (tg_op='INSERT' or old.status='draft') then
    if tg_table_name='assessment_schemes' then
      select sum(weight) into total from public.assessment_components where school_id=new.school_id and scheme_id=new.id and active;
      if total is distinct from 100::numeric then raise exception 'Active assessment weights must add up to 100.'; end if;
    else
      select min(minimum_score),max(maximum_score) into first_score,last_score from public.grading_scale_items where school_id=new.school_id and scale_id=new.id;
      select exists(select 1 from (select minimum_score,lag(maximum_score) over(order by minimum_score) previous_end from public.grading_scale_items where school_id=new.school_id and scale_id=new.id) b where previous_end is not null and minimum_score<>previous_end) into invalid;
      if first_score is distinct from 0::numeric or last_score is distinct from 100::numeric or invalid then raise exception 'Grading bands must cover 0 through 100 without gaps or overlaps.'; end if;
    end if;
  end if;
  return new;
end; $$;
create trigger assessment_activation before insert or update on public.assessment_schemes for each row execute function private.validate_config_activation();
create trigger grading_activation before insert or update on public.grading_scales for each row execute function private.validate_config_activation();

create table public.subject_offerings (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), session_id uuid not null, class_id uuid not null, subject_id uuid not null,
  assessment_scheme_id uuid not null, grading_scale_id uuid not null, status text not null default 'active' check(status in ('active','inactive')),
  unique(school_id,id), unique(school_id,id,session_id,class_id), unique(school_id,session_id,class_id,subject_id),
  foreign key(school_id,session_id) references public.academic_sessions(school_id,id), foreign key(school_id,class_id) references public.school_classes(school_id,id),
  foreign key(school_id,subject_id) references public.school_subjects(school_id,id), foreign key(school_id,assessment_scheme_id) references public.assessment_schemes(school_id,id),
  foreign key(school_id,grading_scale_id) references public.grading_scales(school_id,id)
);
create table public.result_batches (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), offering_id uuid not null,
  session_id uuid not null, term_id uuid not null, class_id uuid not null, assessment_scheme_id uuid not null, grading_scale_id uuid not null,
  status text not null default 'draft' check(status in ('draft','submitted','under_review','approved','published')),
  version integer not null default 1 check(version>0), supersedes_id uuid,
  created_by uuid default auth.uid() references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(school_id,id), unique(school_id,id,session_id,term_id,class_id), unique(school_id,id,assessment_scheme_id), unique(school_id,offering_id,term_id,version),
  foreign key(school_id,offering_id,session_id,class_id) references public.subject_offerings(school_id,id,session_id,class_id),
  foreign key(school_id,term_id,session_id) references public.academic_terms(school_id,id,session_id),
  foreign key(school_id,assessment_scheme_id) references public.assessment_schemes(school_id,id), foreign key(school_id,grading_scale_id) references public.grading_scales(school_id,id)
);
create table public.student_results (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), enrollment_id uuid not null,
  session_id uuid not null, term_id uuid not null, class_id uuid not null,
  status text not null default 'draft' check(status in ('draft','submitted','under_review','approved','published')),
  version integer not null default 1 check(version>0), supersedes_id uuid,
  published_at timestamptz, published_snapshot jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(school_id,id), unique(school_id,id,session_id,term_id,class_id), unique(school_id,enrollment_id,term_id,version),
  foreign key(school_id,enrollment_id,class_id,session_id) references public.student_enrollments(school_id,id,class_id,session_id),
  foreign key(school_id,term_id,session_id) references public.academic_terms(school_id,id,session_id),
  check((status='published' and published_at is not null and published_snapshot is not null) or (status<>'published' and published_at is null and published_snapshot is null))
);
alter table public.student_results add foreign key(school_id,supersedes_id) references public.student_results(school_id,id);
alter table public.result_batches add foreign key(school_id,supersedes_id) references public.result_batches(school_id,id);

create table public.academic_results (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), student_result_id uuid not null, batch_id uuid not null,
  session_id uuid not null, term_id uuid not null, class_id uuid not null, assessment_scheme_id uuid not null,
  unique(school_id,id), unique(school_id,id,assessment_scheme_id), unique(school_id,student_result_id,batch_id),
  foreign key(school_id,student_result_id,session_id,term_id,class_id) references public.student_results(school_id,id,session_id,term_id,class_id),
  foreign key(school_id,batch_id,session_id,term_id,class_id) references public.result_batches(school_id,id,session_id,term_id,class_id),
  foreign key(school_id,batch_id,assessment_scheme_id) references public.result_batches(school_id,id,assessment_scheme_id)
);
create table public.assessment_scores (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), academic_result_id uuid not null,
  assessment_scheme_id uuid not null, component_id uuid not null, score numeric(9,3) not null check(score>=0),
  updated_at timestamptz not null default now(), unique(school_id,id), unique(school_id,academic_result_id,component_id),
  foreign key(school_id,academic_result_id,assessment_scheme_id) references public.academic_results(school_id,id,assessment_scheme_id),
  foreign key(school_id,component_id,assessment_scheme_id) references public.assessment_components(school_id,id,scheme_id)
);
create index result_batches_class_term_idx on public.result_batches(school_id,class_id,term_id);
create index student_results_class_term_idx on public.student_results(school_id,class_id,term_id);
create index academic_results_batch_idx on public.academic_results(school_id,batch_id);
create index assessment_scores_result_idx on public.assessment_scores(school_id,academic_result_id);

create function private.can_access_offering(requested_school uuid, requested_offering uuid, writing boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.can_manage_school(requested_school) or exists(select 1 from public.subject_offerings o
    join public.teacher_assignments a on a.school_id=o.school_id and a.class_id=o.class_id join public.teachers t on t.school_id=a.school_id and t.id=a.teacher_id
    where o.school_id=requested_school and o.id=requested_offering and a.user_id=(select auth.uid()) and t.status='active'
      and (a.session_id is null or a.session_id=o.session_id) and private.has_school_role(a.school_id,array[a.role])
      and (not writing or o.status='active') and ((a.role='subject_teacher' and a.subject_id=o.subject_id) or (not writing and a.role='class_teacher')));
$$;
create function private.can_access_batch(requested_school uuid, requested_batch uuid, writing boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.result_batches b where b.school_id=requested_school and b.id=requested_batch
    and (not writing or b.status='draft') and private.can_access_offering(b.school_id,b.offering_id,writing));
$$;
create function private.can_access_report(requested_school uuid, requested_result uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.student_results r where r.school_id=requested_school and r.id=requested_result
    and private.can_access_class(r.school_id,r.class_id,r.session_id,false));
$$;
create function private.can_access_academic_result(requested_school uuid, requested_result uuid, writing boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.academic_results a join public.student_results r on r.id=a.student_result_id and r.school_id=a.school_id
    where a.school_id=requested_school and a.id=requested_result and (not writing or r.status='draft') and private.can_access_batch(a.school_id,a.batch_id,writing));
$$;
create function private.guard_result_batch()
returns trigger language plpgsql security definer set search_path = '' as $$ begin
  if tg_op='INSERT' then
    if new.status<>'draft' then raise exception 'New result batches start as drafts.'; end if;
    if not exists(select 1 from public.subject_offerings where school_id=new.school_id and id=new.offering_id and assessment_scheme_id=new.assessment_scheme_id and grading_scale_id=new.grading_scale_id) then raise exception 'Batch configuration must match its subject offering.'; end if;
    if not exists(select 1 from public.assessment_schemes where school_id=new.school_id and id=new.assessment_scheme_id and status='active')
      or not exists(select 1 from public.grading_scales where school_id=new.school_id and id=new.grading_scale_id and status='active') then raise exception 'Results require active assessment and grading versions.'; end if;
  elsif old.status='published' then raise exception 'Published batches are immutable.';
  elsif (to_jsonb(new)-array['status','updated_at']) is distinct from (to_jsonb(old)-array['status','updated_at']) then raise exception 'Batch scope and configuration cannot be rewritten.';
  end if;
  return new;
end; $$;
create trigger batch_guard before insert or update on public.result_batches for each row execute function private.guard_result_batch();
create function private.guard_score()
returns trigger language plpgsql security definer set search_path = '' as $$
declare maximum numeric; batch_status text; report_status text;
record public.assessment_scores;
begin
  record:=case when tg_op='DELETE' then old else new end;
  select b.status,r.status into batch_status,report_status from public.academic_results a
    join public.result_batches b on b.school_id=a.school_id and b.id=a.batch_id join public.student_results r on r.school_id=a.school_id and r.id=a.student_result_id
    where a.school_id=record.school_id and a.id=record.academic_result_id for update of b,r;
  if batch_status is distinct from 'draft' or report_status is distinct from 'draft' then raise exception 'Only draft scores can be edited.'; end if;
  select max_score into maximum from public.assessment_components where school_id=record.school_id and id=record.component_id and scheme_id=record.assessment_scheme_id and active;
  if maximum is null or record.score>maximum then raise exception 'Score exceeds its configured component maximum.'; end if;
  if tg_op='DELETE' then return old; end if; return new;
end; $$;
create trigger score_limits before insert or update or delete on public.assessment_scores for each row execute function private.guard_score();
create function public.calculate_academic_result(requested_result uuid)
returns table(total numeric,grade text,remark text,complete boolean)
language plpgsql stable security definer set search_path = '' as $$
declare result public.academic_results; scale uuid; weighted numeric; missing boolean;
begin
  select * into result from public.academic_results where id=requested_result;
  if not found or not private.can_access_academic_result(result.school_id,result.id,false) then raise exception 'Assigned result access required.'; end if;
  select grading_scale_id into scale from public.result_batches where id=result.batch_id;
  select round(sum(coalesce(s.score,0)/c.max_score*c.weight),3),bool_or(s.id is null) into weighted,missing
    from public.assessment_components c left join public.assessment_scores s on s.school_id=c.school_id and s.component_id=c.id and s.academic_result_id=result.id
    where c.school_id=result.school_id and c.scheme_id=result.assessment_scheme_id and c.active;
  return query select weighted,case when missing then null else g.grade end,case when missing then null else g.remark end,not missing
    from (select 1) seed left join public.grading_scale_items g on g.school_id=result.school_id and g.scale_id=scale
      and weighted>=g.minimum_score and (weighted<g.maximum_score or (weighted=100 and g.maximum_score=100));
end; $$;

do $$ declare item text; begin
  foreach item in array array['assessment_schemes','assessment_components','grading_scales','grading_scale_items'] loop
    execute format('alter table public.%I enable row level security',item);
    execute format('revoke all on public.%I from public,anon,authenticated',item);
    execute format('grant select,insert,update on public.%I to authenticated',item);
    execute format('grant all on public.%I to service_role',item);
    execute format('create policy config_read on public.%I for select to authenticated using(private.can_manage_school(school_id) or private.has_school_role(school_id,array[''school_admin'',''subject_teacher'',''class_teacher'']))',item);
    execute format('create policy config_insert on public.%I for insert to authenticated with check(private.can_manage_school(school_id))',item);
    execute format('create policy config_update on public.%I for update to authenticated using(private.can_manage_school(school_id)) with check(private.can_manage_school(school_id))',item);
  end loop;
  foreach item in array array['subject_offerings','result_batches','student_results','academic_results','assessment_scores'] loop
    execute format('alter table public.%I enable row level security',item);
    execute format('revoke all on public.%I from public,anon,authenticated',item);
    execute format('grant select on public.%I to authenticated',item);
    execute format('grant all on public.%I to service_role',item);
  end loop;
end; $$;
-- Full snapshots contain other subjects. They are fetched only through a report RPC,
-- not through the subject teacher's aggregate/roster SELECT permissions.
revoke select on public.student_results from authenticated;
grant select(id,school_id,enrollment_id,session_id,term_id,class_id,status,version,supersedes_id,published_at,created_at,updated_at) on public.student_results to authenticated;
grant insert,update on public.subject_offerings to authenticated;
create policy offerings_read on public.subject_offerings for select to authenticated using(private.can_access_offering(school_id,id,false));
create policy offerings_insert on public.subject_offerings for insert to authenticated with check(private.can_manage_school(school_id));
create policy offerings_update on public.subject_offerings for update to authenticated using(private.can_manage_school(school_id)) with check(private.can_manage_school(school_id));
grant insert(school_id,offering_id,session_id,term_id,class_id,assessment_scheme_id,grading_scale_id,version,supersedes_id) on public.result_batches to authenticated;
grant insert(school_id,enrollment_id,session_id,term_id,class_id,version,supersedes_id) on public.student_results to authenticated;
grant insert on public.academic_results to authenticated;
grant insert(school_id,academic_result_id,assessment_scheme_id,component_id,score),update(score) on public.assessment_scores to authenticated;
create policy batches_read on public.result_batches for select to authenticated using(private.can_access_offering(school_id,offering_id,false));
create policy batches_insert on public.result_batches for insert to authenticated with check(status='draft' and private.can_access_offering(school_id,offering_id,true));
create policy reports_read on public.student_results for select to authenticated using(private.can_access_report(school_id,id));
create policy reports_insert on public.student_results for insert to authenticated with check(status='draft' and private.can_manage_school(school_id));
create policy academic_read on public.academic_results for select to authenticated using(private.can_access_batch(school_id,batch_id,false));
create policy academic_insert on public.academic_results for insert to authenticated with check(private.can_access_batch(school_id,batch_id,true) and private.can_access_report(school_id,student_result_id));
create policy scores_read on public.assessment_scores for select to authenticated using(private.can_access_academic_result(school_id,academic_result_id,false));
create policy scores_insert on public.assessment_scores for insert to authenticated with check(private.can_access_academic_result(school_id,academic_result_id,true));
create policy scores_update on public.assessment_scores for update to authenticated using(private.can_access_academic_result(school_id,academic_result_id,true)) with check(private.can_access_academic_result(school_id,academic_result_id,true));
revoke all on function private.lock_config_child(),private.validate_config_activation(),private.guard_result_batch(),private.guard_score() from public,anon,authenticated;
revoke all on function private.can_access_offering(uuid,uuid,boolean),private.can_access_batch(uuid,uuid,boolean),private.can_access_report(uuid,uuid),private.can_access_academic_result(uuid,uuid,boolean),public.calculate_academic_result(uuid) from public,anon,authenticated;
grant execute on function private.can_access_offering(uuid,uuid,boolean),private.can_access_batch(uuid,uuid,boolean),private.can_access_report(uuid,uuid),private.can_access_academic_result(uuid,uuid,boolean),public.calculate_academic_result(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
