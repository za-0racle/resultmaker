-- Expose only the caller's platform permission, never administrator records.
begin;
create function public.current_user_is_platform_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.is_platform_admin(); $$;
revoke all on function public.current_user_is_platform_admin() from public, anon;
grant execute on function public.current_user_is_platform_admin() to authenticated;
commit;
