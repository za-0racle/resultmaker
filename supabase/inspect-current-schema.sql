-- READ ONLY. Run in the trusted SQL Editor BEFORE new migrations and save results.
-- Reports schema metadata only, never passwords, API keys or student records.
begin transaction read only;
select n.nspname as schema_name, c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','private') and c.relkind='r' order by 1,2;
select table_schema,table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns where table_schema in ('public','private') order by 1,2,ordinal_position;
select n.nspname as schema_name,c.relname as table_name,k.conname,pg_get_constraintdef(k.oid) as definition
from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','private') order by 1,2,3;
select schemaname,tablename,indexname,indexdef from pg_indexes where schemaname in ('public','private') order by 1,2,3;
select n.nspname as schema_name,c.relname as table_name,t.tgname,pg_get_triggerdef(t.oid) as definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','private') and not t.tgisinternal order by 1,2,3;
select n.nspname as schema_name,p.proname,pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer,p.proconfig,p.proacl,pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','private') and p.prokind='f' order by 1,2;
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies where schemaname in ('public','private') order by 1,2,3;
select grantee,table_schema,table_name,privilege_type from information_schema.role_table_grants
where table_schema in ('public','private') order by 1,2,3,4;
commit;
