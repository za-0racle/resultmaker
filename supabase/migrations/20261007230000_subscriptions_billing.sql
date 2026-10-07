-- Configurable commercial model. No payment-provider calls or webhooks.
begin;
create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(), code text not null unique, name text not null,
  pricing_type text not null check(pricing_type in ('per_student_per_term','custom')),
  unit_price numeric(14,2), currency text not null default 'NGN' check(length(currency)=3),
  minimum_students integer not null default 0 check(minimum_students>=0), recommended boolean not null default false,
  status text not null default 'active' check(status in ('active','inactive')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check((pricing_type='per_student_per_term' and unit_price is not null and unit_price>=0) or (pricing_type='custom' and unit_price is null))
);
create table public.feature_definitions (code text primary key, name text not null, description text not null default '');
create table public.plan_features (
  plan_id uuid not null references public.subscription_plans(id), feature_code text not null references public.feature_definitions(code),
  value jsonb not null default 'true', primary key(plan_id,feature_code)
);
create table public.school_subscriptions (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), plan_id uuid not null references public.subscription_plans(id),
  status text not null default 'trialing' check(status in ('trialing','active','past_due','expired','cancelled','suspended')),
  starts_at timestamptz not null, ends_at timestamptz not null, renews_at timestamptz, check(ends_at>starts_at),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(school_id,id)
);
create table public.subscription_periods (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), subscription_id uuid not null,
  session_id uuid, term_id uuid, starts_on date not null, ends_on date not null check(ends_on>=starts_on),
  pricing_type text not null check(pricing_type in ('per_student_per_term','custom')), currency text not null check(length(currency)=3),
  student_count integer not null check(student_count>=0), minimum_students integer not null default 0 check(minimum_students>=0),
  unit_price numeric(14,2), custom_amount numeric(14,2), plan_snapshot jsonb not null check(jsonb_typeof(plan_snapshot)='object'),
  amount_due numeric generated always as (case when pricing_type='custom' then custom_amount else greatest(student_count,minimum_students)*unit_price end) stored,
  created_at timestamptz not null default now(), unique(school_id,id), unique(school_id,subscription_id,starts_on,ends_on),
  foreign key(school_id,subscription_id) references public.school_subscriptions(school_id,id),
  foreign key(school_id,session_id) references public.academic_sessions(school_id,id),
  foreign key(school_id,term_id,session_id) references public.academic_terms(school_id,id,session_id),
  check(term_id is null or session_id is not null),
  check((pricing_type='per_student_per_term' and unit_price is not null and unit_price>=0 and custom_amount is null) or (pricing_type='custom' and unit_price is null and custom_amount is not null and custom_amount>=0))
);
create table public.payments (
  id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id), period_id uuid not null,
  provider text not null default 'manual', provider_reference text, status text not null default 'pending' check(status in ('pending','succeeded','failed','refunded')),
  amount numeric(14,2) not null check(amount>=0), currency text not null check(length(currency)=3), paid_at timestamptz,
  created_at timestamptz not null default now(), unique(school_id,id), unique(provider,provider_reference),
  foreign key(school_id,period_id) references public.subscription_periods(school_id,id), check(status<>'succeeded' or paid_at is not null)
);
create table public.school_feature_overrides (
  school_id uuid not null references public.schools(id), feature_code text not null references public.feature_definitions(code),
  value jsonb not null, expires_at timestamptz, primary key(school_id,feature_code)
);
insert into public.subscription_plans(code,name,pricing_type,unit_price,recommended) values
  ('starter','Starter','per_student_per_term',50,false),('standard','Standard','per_student_per_term',100,true),('professional','Professional','custom',null,false);
insert into public.feature_definitions(code,name) values
  ('result_management','Result management'),('advanced_templates','Advanced templates'),('affective','Affective domain'),('psychomotor','Psychomotor domain'),
  ('attendance','Attendance'),('analytics','Result analytics'),('qr_verification','QR verification'),('google_sheets','Google Sheets import'),
  ('advanced_reports','Advanced reports'),('multiple_campuses','Multiple campuses'),('custom_domain','Custom domain'),('priority_support','Priority support');
-- Only the agreed baseline entitlement is seeded. Additional plan-feature allocation
-- requires product review; prices do not imply unagreed feature promises.
insert into public.plan_features(plan_id,feature_code,value) select id,'result_management','true'::jsonb from public.subscription_plans;
create index subscriptions_school_expiry_idx on public.school_subscriptions(school_id,ends_at);
create index billing_periods_school_idx on public.subscription_periods(school_id,subscription_id);
create index payments_period_idx on public.payments(school_id,period_id);
create function public.get_school_entitlements(requested_school uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare entitlements jsonb; overrides jsonb; chosen_plan uuid;
begin
  if not(private.is_platform_admin() or private.has_school_role(requested_school,array['school_admin','subject_teacher','class_teacher','student','parent'])) then raise exception 'Active school access required.'; end if;
  select plan_id into chosen_plan from public.school_subscriptions where school_id=requested_school and status in ('active','trialing') and starts_at<=now() and ends_at>now() order by starts_at desc,id limit 1;
  select coalesce(jsonb_object_agg(feature_code,value),'{}') into entitlements from public.plan_features where plan_id=chosen_plan;
  select coalesce(jsonb_object_agg(feature_code,value),'{}') into overrides from public.school_feature_overrides where school_id=requested_school and (expires_at is null or expires_at>now());
  return entitlements||overrides;
end; $$;
create function private.guard_billing_history()
returns trigger language plpgsql set search_path = '' as $$ begin raise exception 'Billing period snapshots are immutable; issue a new period or adjustment.'; end; $$;
create trigger billing_snapshot_immutable before update or delete on public.subscription_periods for each row execute function private.guard_billing_history();
create function private.guard_payment_currency()
returns trigger language plpgsql security definer set search_path = '' as $$ begin
  if not exists(select 1 from public.subscription_periods where school_id=new.school_id and id=new.period_id and currency=new.currency) then raise exception 'Payment currency must match its billing period.'; end if;
  return new;
end; $$;
create trigger payment_currency before insert or update on public.payments for each row execute function private.guard_payment_currency();
do $$ declare item text; begin
  foreach item in array array['subscription_plans','feature_definitions','plan_features'] loop
    execute format('alter table public.%I enable row level security',item);
    execute format('revoke all on public.%I from public,anon,authenticated',item);
    execute format('grant select on public.%I to anon,authenticated',item);
    execute format('grant insert,update on public.%I to authenticated',item);
    execute format('grant all on public.%I to service_role',item);
    execute format('create policy plan_owner_insert on public.%I for insert to authenticated with check(private.is_platform_admin())',item);
    execute format('create policy plan_owner_update on public.%I for update to authenticated using(private.is_platform_admin()) with check(private.is_platform_admin())',item);
  end loop;
end; $$;
create policy plans_public_read on public.subscription_plans for select to anon,authenticated using(status='active');
create policy plans_owner_read on public.subscription_plans for select to authenticated using(private.is_platform_admin());
create policy plan_features_owner_read on public.plan_features for select to authenticated using(private.is_platform_admin());
create policy features_public_read on public.feature_definitions for select to anon,authenticated using(true);
create policy plan_features_public_read on public.plan_features for select to anon,authenticated using(exists(select 1 from public.subscription_plans p where p.id=plan_id and p.status='active'));
do $$ declare item text; begin
  foreach item in array array['school_subscriptions','subscription_periods','payments','school_feature_overrides'] loop
    execute format('alter table public.%I enable row level security',item);
    execute format('revoke all on public.%I from public,anon,authenticated',item);
    execute format('grant select on public.%I to authenticated',item);
    execute format('grant all on public.%I to service_role',item);
    execute format('create policy billing_read on public.%I for select to authenticated using(private.can_manage_school(school_id))',item);
  end loop;
  foreach item in array array['school_subscriptions','subscription_periods','payments'] loop
    execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function private.audit_change()',item);
  end loop;
end; $$;
-- Billing state is server/admin provisioned, never self-certified by a browser.
create function private.audit_school_change()
returns trigger language plpgsql security definer set search_path = '' as $$ begin
  insert into public.audit_logs(school_id,actor_id,record_type,record_id,action,details)
    values(new.id,auth.uid(),'schools',new.id,'update',jsonb_build_object('status',new.status,'archived',new.archived_at is not null));
  return new;
end; $$;
create trigger school_status_audit after update of status,archived_at on public.schools for each row execute function private.audit_school_change();
revoke all on function private.guard_billing_history(),private.guard_payment_currency(),private.audit_school_change(),public.get_school_entitlements(uuid) from public,anon,authenticated;
grant execute on function public.get_school_entitlements(uuid) to authenticated;
-- Tenant ownership is immutable even for an administrator managing several schools.
create function private.guard_tenant_identity()
returns trigger language plpgsql set search_path = '' as $$ begin
  if old.school_id is distinct from new.school_id then raise exception 'School ownership cannot change.'; end if;
  return new;
end; $$;
revoke all on function private.guard_tenant_identity() from public,anon,authenticated;
do $$ declare item record; begin
  for item in select table_name from information_schema.columns where table_schema='public' and column_name='school_id' loop
    execute format('create trigger tenant_identity before update on public.%I for each row execute function private.guard_tenant_identity()',item.table_name);
  end loop;
end; $$;
notify pgrst,'reload schema';
commit;
