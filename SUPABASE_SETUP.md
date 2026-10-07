# Supabase foundation for ÈsìAyọ̀

## Activate the owner and school/teacher workspaces

The screenshot showing **No active workspace assigned** means Auth accepted the login, but the database did not return an active school membership or platform permission.

After the tenant foundation has been applied, run **`supabase/activate-role-workspaces.sql` once** in the trusted Dashboard SQL Editor. It applies the new school registration/teacher scope migration and verifies the company account UUID `eb122bbb-a5bf-47fd-b25d-248b5e182d18` matches `adedokunkhaleed@gmail.com` before granting platform access. The entire script rolls back if that identity check fails. The script also installs the platform-access RPC, so it works whether or not the second migration was already applied. Do not run both this bundle and its underlying new migration. If the new migration is already applied, run only `supabase/provision-company-admin.sql`.

Sign out and sign back in after applying SQL. The company account then opens `/platform` and can list all schools, add a school for an existing confirmed administrator, suspend/reactivate schools, and remove a school with confirmation. Removal deletes that school's memberships, classes, subjects and teacher assignments. Privileged SQL cannot be applied with the browser publishable key; no hosted permission change has been made by editing these files.

School onboarding now works through **Signup → Register a new school** or `/register-school`. After email confirmation and login, `register_my_school` atomically creates a new school and its creator's `school_admin` membership. It cannot attach a signup to an existing school's slug, assign another user, grant platform access, or create another school for an account that already has school memberships. Registration is idempotent. School names/slugs stored in Auth metadata are onboarding inputs, never permissions. If a slug is taken, the account workspace offers a registration retry form. Staff who already belong to a school should use a separate administrator account for a new school.

Teachers choose **Teacher or other school member**, confirm their email, and give the administrator that email. The school administrator adds classes/subjects and uses **Assign a teacher** in their school workspace. Subject teachers require a class and a subject; class teachers require a class. Teachers cannot assign roles themselves. Removing the last assignment for a teacher role removes that role's membership. Suspended schools/memberships lose teaching access immediately at the database layer.

`school_classes`, `school_subjects` and `teacher_assignments` have RLS, including composite foreign keys that reject assignments across schools. Teachers read only their own assigned classes/subjects; school admins manage only their school; the company account has platform access. These policies secure the current catalog and assignment records. Student records, marks, reports, sessions/terms and parent/student record links still need their own database tables and RLS before live academic data is connected. Existing prototype academic pages are preserved.

Run `npm run build` and `npm test` for local verification. Tests execute the activation bundle in an isolated PostgreSQL-compatible database and check school creation, owner identity, teacher scope, cross-school denial, confirmation, suspension and revocation. They do not apply migrations to the hosted Supabase project or create real accounts. Redeploy Vercel after the code changes and keep production/local Auth redirect URLs configured as described below.

The JavaScript client, real email/password login, membership-based workspace selection, route guards and connection check are implemented. Protected routes use the existing dashboard shell with role-specific navigation, real account/school identity, live catalog/assignment controls and owner school totals. They never render sample school records. Navigation sections whose data services are pending show an explicit not-connected state. The original record-management pages remain prototype modules until their database services are implemented.

Apply `supabase/migrations/20261007140000_auth_workspace_access.sql` once in the SQL Editor after the foundation migration. It lets a signed-in user check only their own platform permission. Without this migration, school accounts can still sign in, but platform workspaces cannot be discovered.

## 1. Create or select a project

Open [Supabase Dashboard](https://supabase.com/dashboard), select an existing development project or create a new project for ÈsìAyọ̀. Select your organization and an appropriate region. Generate and store the database password in your own password manager; it is never needed in frontend code or this chat.

Use the project's **Connect** dialog to copy the Project URL and publishable key. See the [official API key guide](https://supabase.com/docs/guides/getting-started/api-keys). Do not use an `sb_secret_` or service-role key.

## 2. Configure the frontend

From the project directory in PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Fill these values with your project's real public credentials:

```dotenv
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

If using a legacy project key, leave the publishable-key variable blank and put the legacy **anon** JWT into `VITE_SUPABASE_ANON_KEY`. The client rejects secret/service-role keys. `.env.local` is ignored by Git. Vite exposes `VITE_` variables to the browser, so only public credentials belong there.

Restart Vite after changing environment values:

```sh
npm run dev
npm run supabase:check
```

The check makes a read-only request to Supabase Auth settings. It does not create a user, send an email, apply SQL, or claim RLS was tested on your hosted project. Without credentials it exits with a clear setup message.

## 3. Apply the tenant foundation

On a new development project, review and run `supabase/migrations/20261007120000_tenant_foundation.sql` once in the Dashboard SQL Editor. For an existing database, inspect its schema before applying: this migration deliberately fails if conflicting foundation tables already exist. Do not paste it blindly over existing tables.

It creates:

- `profiles`: personal display information associated with Auth users, without role columns.
- `schools`: tenant identities and editable school contact/profile fields.
- `school_memberships`: school-scoped roles, allowing a user multiple roles and schools.
- `private.platform_admins`: platform privilege assignments, outside the exposed API schema.
- Private policy helpers, an Auth profile trigger, grants, indexes and Row Level Security policies.

Unauthenticated visitors have no access to these tables. Signed-in users read their own profile and memberships. Active school members read their school; school admins can edit selected school profile fields and read that school's memberships. A suspended school is hidden from ordinary members. The foundation alone grants no direct browser membership/school creation or status-change writes. The activation migration adds narrowly scoped RPCs that validate the caller before performing those actions, following the [database function security guidance](https://supabase.com/docs/guides/database/functions). Platform admins are still provisioned through trusted administration. Read the [official RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security).

Keep `private` out of **Exposed schemas**. The policy helpers run with pinned, empty `search_path` values and explicitly qualified references. Future tenant-owned tables also need RLS; this migration does not secure tables that do not yet exist.

## 4. Configure Auth and bootstrap the first administrator

In Authentication, enable the Email provider. Set the local Site URL to `http://localhost:5173` and allow the development origin you actually use (`http://localhost:5173/**` and/or `http://127.0.0.1:5173/**`) in Redirect URLs. Keep email confirmation enabled for production; production mail delivery/SMTP must be configured separately.

Create the initial user through Authentication → Users or the normal Supabase sign-up mechanism. No admin role is taken from user metadata. The public contact `admin@Esiayo.com` is not automatically a registered user or platform administrator.

After the initial user exists, use their actual Auth UUID in a trusted SQL Editor transaction to insert the real school and its `school_admin` membership. Choose the real school's name and slug; do not import the frontend's synthetic mock IDs. If this account should administer the entire platform, explicitly provision it in `private.platform_admins` through trusted SQL administration. No passwords, guessed users or automatic Super Admin accounts are included in this setup.

An editable example is provided in `supabase/bootstrap-membership.example.sql`. Replace the school name, slug, Auth UUID and role before running it. It deliberately fails for the placeholder UUID rather than assigning a guessed account. Repeat the membership insert for each approved school/role assignment. User passwords stay in Supabase Auth and are never stored in membership rows.

## 5. Next integration work

For the Vercel deployment, set the Auth Site URL to `https://resultmaker-65e1.vercel.app` and add `https://resultmaker-65e1.vercel.app/**` to the allowed Redirect URLs. Keep localhost redirect entries for development. Vercel environment changes require a fresh deployment to be included in Vite's build. The repository's `vercel.json` rewrites application routes to `index.html` so direct navigation and refresh work.

Login verifies the user with Supabase Auth and reads active memberships scoped to that user. One assigned workspace opens automatically; multiple schools/roles show a chooser. Refresh and protected navigation recheck current access; expired sessions return to login. Sign-out clears the in-memory identity. Saved workspace choices are hints validated against current assignments, never permissions. Auth event handling follows the [Supabase event guidance](https://supabase.com/docs/reference/javascript/auth-onauthstatechange).

The supported roles are `school_admin`, `subject_teacher`, `class_teacher`, `student`, and `parent`; platform administrators are separately assigned in `private.platform_admins`. Neither signup metadata nor URL navigation assigns permissions. Students and parents currently have account workspace screens only; student/child record links need later schema and RLS.

Before exposing live academic records, convert the original pages' mock-state reads and mutations to database-backed services with teacher/student/parent record-level RLS. The legacy `scripts/browser-smoke.mjs` tests the old prototype; use `scripts/auth-browser-smoke.mjs` for the authenticated application.

Next migrations extend the school catalog with academic sections, session enrollment and curriculum offerings, versioned assessments/grading/templates, student-result aggregates, normalized scores, rating categories/items, attendance/comments, and audited publication. Their teacher-specific RLS must be tested before live records are introduced. Payments, Google integrations, Storage policies, result verification and production deployment remain separate tasks.

The public project credentials allow connection checks and normal user login, but cannot apply migrations or provision privileged memberships. Apply those statements through the trusted SQL Editor. A successful login with a real assigned account is still needed to verify the hosted end-to-end flow.

## Proposed academic expansion: stop before production

The four `2026100720/21/22/23` migrations are review artifacts. Follow [MIGRATION_PLAN.md](MIGRATION_PLAN.md), starting with read-only hosted inspection. Do not rerun the activation bundle or apply these to production automatically. Local validation does not establish the hosted catalog. See [DATABASE.md](DATABASE.md) for new role policies and retained profile/membership ownership.
