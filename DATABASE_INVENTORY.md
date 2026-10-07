# Repository database object inventory

Generated from the three existing migrations in isolated PostgreSQL (PGlite). This is **not a hosted-project catalog export**. Compare with `supabase/inspect-current-schema.sql` before applying any changes.

## Existing tables

- private | platform_admins | true
- private | school_registrations | true
- public | profiles | true
- public | school_classes | true
- public | school_memberships | true
- public | school_subjects | true
- public | schools | true
- public | teacher_assignments | true

## Existing functions

- private | can_manage_school | requested_school uuid | true
- private | handle_new_user |  | true
- private | has_school_role | requested_school uuid, allowed_roles text[] | true
- private | has_teaching_assignment | requested_school uuid, requested_class uuid, requested_subject uuid | true
- private | is_platform_admin |  | true
- private | set_updated_at |  | false
- public | assign_school_teacher | requested_school uuid, teacher_email text, teacher_role text, requested_class uuid, requested_subject uuid | true
- public | create_school_catalog_item | requested_school uuid, item_kind text, item_name text | true
- public | current_user_is_platform_admin |  | false
- public | list_school_teacher_accounts | requested_school uuid | true
- public | platform_create_school | school_name text, school_slug text, administrator_email text | true
- public | platform_remove_school | requested_school uuid | true
- public | platform_set_school_status | requested_school uuid, requested_status text | true
- public | register_my_school | school_name text, school_slug text | true
- public | remove_teacher_assignment | requested_assignment uuid | true

## Existing triggers

- auth | users | esiayo_user_profile
- public | profiles | profiles_updated_at
- public | schools | schools_updated_at

## Existing policies

- public | profiles | profiles_insert_own | INSERT
- public | profiles | profiles_read_own | SELECT
- public | profiles | profiles_update_own | UPDATE
- public | school_classes | classes_read_scope | SELECT
- public | school_memberships | memberships_read_scope | SELECT
- public | school_subjects | subjects_read_scope | SELECT
- public | schools | schools_read_membership | SELECT
- public | schools | schools_update_admin | UPDATE
- public | teacher_assignments | assignments_read_scope | SELECT

## Existing indexes

- private | platform_admins | platform_admins_pkey
- private | school_registrations | school_registrations_pkey
- public | profiles | profiles_pkey
- public | school_classes | school_classes_pkey
- public | school_classes | school_classes_school_id_id_key
- public | school_classes | school_classes_school_id_name_key
- public | school_memberships | school_memberships_pkey
- public | school_memberships | school_memberships_user_id_idx
- public | school_subjects | school_subjects_pkey
- public | school_subjects | school_subjects_school_id_id_key
- public | school_subjects | school_subjects_school_id_name_key
- public | schools | schools_pkey
- public | schools | schools_slug_key
- public | teacher_assignments | class_teacher_assignment_unique
- public | teacher_assignments | subject_teacher_assignment_unique
- public | teacher_assignments | teacher_assignments_pkey
- public | teacher_assignments | teacher_assignments_user_idx

## Existing columns

- private | platform_admins | user_id | uuid | NO | no default
- private | platform_admins | active | boolean | NO | true
- private | platform_admins | created_at | timestamp with time zone | NO | now()
- private | school_registrations | user_id | uuid | NO | no default
- private | school_registrations | school_id | uuid | YES | no default
- public | profiles | id | uuid | NO | no default
- public | profiles | display_name | text | NO | no default
- public | profiles | phone | text | YES | no default
- public | profiles | created_at | timestamp with time zone | NO | now()
- public | profiles | updated_at | timestamp with time zone | NO | now()
- public | school_classes | id | uuid | NO | gen_random_uuid()
- public | school_classes | school_id | uuid | NO | no default
- public | school_classes | name | text | NO | no default
- public | school_memberships | school_id | uuid | NO | no default
- public | school_memberships | user_id | uuid | NO | no default
- public | school_memberships | role | text | NO | no default
- public | school_memberships | status | text | NO | 'active'::text
- public | school_memberships | created_at | timestamp with time zone | NO | now()
- public | school_subjects | id | uuid | NO | gen_random_uuid()
- public | school_subjects | school_id | uuid | NO | no default
- public | school_subjects | name | text | NO | no default
- public | schools | id | uuid | NO | gen_random_uuid()
- public | schools | name | text | NO | no default
- public | schools | slug | text | NO | no default
- public | schools | status | text | NO | 'active'::text
- public | schools | motto | text | YES | no default
- public | schools | address | text | YES | no default
- public | schools | phone | text | YES | no default
- public | schools | email | text | YES | no default
- public | schools | website | text | YES | no default
- public | schools | created_at | timestamp with time zone | NO | now()
- public | schools | updated_at | timestamp with time zone | NO | now()
- public | teacher_assignments | id | uuid | NO | gen_random_uuid()
- public | teacher_assignments | school_id | uuid | NO | no default
- public | teacher_assignments | user_id | uuid | NO | no default
- public | teacher_assignments | role | text | NO | no default
- public | teacher_assignments | class_id | uuid | NO | no default
- public | teacher_assignments | subject_id | uuid | YES | no default

## Existing constraints and foreign keys

- private | platform_admins | platform_admins_active_not_null | NOT NULL active
- private | platform_admins | platform_admins_created_at_not_null | NOT NULL created_at
- private | platform_admins | platform_admins_pkey | PRIMARY KEY (user_id)
- private | platform_admins | platform_admins_user_id_fkey | FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
- private | platform_admins | platform_admins_user_id_not_null | NOT NULL user_id
- private | school_registrations | school_registrations_pkey | PRIMARY KEY (user_id)
- private | school_registrations | school_registrations_school_id_fkey | FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL
- private | school_registrations | school_registrations_user_id_fkey | FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
- private | school_registrations | school_registrations_user_id_not_null | NOT NULL user_id
- public | profiles | profiles_created_at_not_null | NOT NULL created_at
- public | profiles | profiles_display_name_check | CHECK (((length(display_name) >= 1) AND (length(display_name) <= 150)))
- public | profiles | profiles_display_name_not_null | NOT NULL display_name
- public | profiles | profiles_id_fkey | FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
- public | profiles | profiles_id_not_null | NOT NULL id
- public | profiles | profiles_phone_check | CHECK (((phone IS NULL) OR (length(phone) <= 40)))
- public | profiles | profiles_pkey | PRIMARY KEY (id)
- public | profiles | profiles_updated_at_not_null | NOT NULL updated_at
- public | school_classes | school_classes_id_not_null | NOT NULL id
- public | school_classes | school_classes_name_check | CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 100)))
- public | school_classes | school_classes_name_not_null | NOT NULL name
- public | school_classes | school_classes_pkey | PRIMARY KEY (id)
- public | school_classes | school_classes_school_id_fkey | FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
- public | school_classes | school_classes_school_id_id_key | UNIQUE (school_id, id)
- public | school_classes | school_classes_school_id_name_key | UNIQUE (school_id, name)
- public | school_classes | school_classes_school_id_not_null | NOT NULL school_id
- public | school_memberships | school_memberships_created_at_not_null | NOT NULL created_at
- public | school_memberships | school_memberships_pkey | PRIMARY KEY (school_id, user_id, role)
- public | school_memberships | school_memberships_role_check | CHECK ((role = ANY (ARRAY['school_admin'::text, 'subject_teacher'::text, 'class_teacher'::text, 'student'::text, 'parent'::text])))
- public | school_memberships | school_memberships_role_not_null | NOT NULL role
- public | school_memberships | school_memberships_school_id_fkey | FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
- public | school_memberships | school_memberships_school_id_not_null | NOT NULL school_id
- public | school_memberships | school_memberships_status_check | CHECK ((status = ANY (ARRAY['active'::text, 'invited'::text, 'suspended'::text])))
- public | school_memberships | school_memberships_status_not_null | NOT NULL status
- public | school_memberships | school_memberships_user_id_fkey | FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
- public | school_memberships | school_memberships_user_id_not_null | NOT NULL user_id
- public | school_subjects | school_subjects_id_not_null | NOT NULL id
- public | school_subjects | school_subjects_name_check | CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 100)))
- public | school_subjects | school_subjects_name_not_null | NOT NULL name
- public | school_subjects | school_subjects_pkey | PRIMARY KEY (id)
- public | school_subjects | school_subjects_school_id_fkey | FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
- public | school_subjects | school_subjects_school_id_id_key | UNIQUE (school_id, id)
- public | school_subjects | school_subjects_school_id_name_key | UNIQUE (school_id, name)
- public | school_subjects | school_subjects_school_id_not_null | NOT NULL school_id
- public | schools | schools_created_at_not_null | NOT NULL created_at
- public | schools | schools_id_not_null | NOT NULL id
- public | schools | schools_name_check | CHECK (((length(name) >= 1) AND (length(name) <= 200)))
- public | schools | schools_name_not_null | NOT NULL name
- public | schools | schools_pkey | PRIMARY KEY (id)
- public | schools | schools_slug_check | CHECK ((((length(slug) >= 2) AND (length(slug) <= 63)) AND (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)))
- public | schools | schools_slug_key | UNIQUE (slug)
- public | schools | schools_slug_not_null | NOT NULL slug
- public | schools | schools_status_check | CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text])))
- public | schools | schools_status_not_null | NOT NULL status
- public | schools | schools_updated_at_not_null | NOT NULL updated_at
- public | teacher_assignments | teacher_assignments_check | CHECK ((((role = 'class_teacher'::text) AND (subject_id IS NULL)) OR ((role = 'subject_teacher'::text) AND (subject_id IS NOT NULL))))
- public | teacher_assignments | teacher_assignments_class_id_not_null | NOT NULL class_id
- public | teacher_assignments | teacher_assignments_id_not_null | NOT NULL id
- public | teacher_assignments | teacher_assignments_pkey | PRIMARY KEY (id)
- public | teacher_assignments | teacher_assignments_role_check | CHECK ((role = ANY (ARRAY['class_teacher'::text, 'subject_teacher'::text])))
- public | teacher_assignments | teacher_assignments_role_not_null | NOT NULL role
- public | teacher_assignments | teacher_assignments_school_id_class_id_fkey | FOREIGN KEY (school_id, class_id) REFERENCES school_classes(school_id, id) ON DELETE CASCADE
- public | teacher_assignments | teacher_assignments_school_id_fkey | FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE
- public | teacher_assignments | teacher_assignments_school_id_not_null | NOT NULL school_id
- public | teacher_assignments | teacher_assignments_school_id_subject_id_fkey | FOREIGN KEY (school_id, subject_id) REFERENCES school_subjects(school_id, id) ON DELETE CASCADE
- public | teacher_assignments | teacher_assignments_school_id_user_id_role_fkey | FOREIGN KEY (school_id, user_id, role) REFERENCES school_memberships(school_id, user_id, role) ON DELETE CASCADE
- public | teacher_assignments | teacher_assignments_user_id_not_null | NOT NULL user_id
