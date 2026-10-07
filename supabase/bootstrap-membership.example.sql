-- Trusted SQL Editor only. Replace all placeholders with real values first.
-- First create the account in Authentication > Users. Do not run the foundation again.
begin;
insert into public.schools(name, slug)
values ('YOUR SCHOOL NAME', 'your-school-slug')
on conflict (slug) do nothing;

-- Replace the UUID with the actual Auth user ID and choose an approved role.
insert into public.school_memberships(school_id, user_id, role)
select id, 'REPLACE_WITH_AUTH_USER_UUID'::uuid, 'school_admin'
from public.schools where slug = 'your-school-slug'
on conflict (school_id, user_id, role) do nothing;
commit;

-- Additional role examples: subject_teacher, class_teacher, student, parent.
-- To provision a platform admin instead, use a separate trusted statement:
-- insert into private.platform_admins(user_id) values ('ACTUAL_AUTH_USER_UUID');
