# Teacher account activation

The frontend is ready. The new hosted backend has not been applied or deployed by this change.

1. In the existing project's SQL Editor, run `supabase/migrations/20261007250000_teacher_account_onboarding.sql` once, after the four academic/results/billing expansion migrations already applied. Do not rerun the foundation or historical activation bundle.
2. Deploy the server function from the repository root using an authenticated Supabase CLI:

   ```powershell
   supabase functions deploy teacher-accounts --project-ref qoifwpuzwmgpdjqfunxq
   ```

   `supabase/config.toml` disables gateway JWT verification for this function. The handler independently validates every bearer token with Auth before checking the caller's school permission. Supabase supplies server-side project credentials; never put a service-role key in Vite or Vercel frontend variables.
3. Sign in as a school administrator, create a class and subject, then create a teacher account under teacher management. Enter their email, name, temporary password (12–128 characters), role and assignment. Share the credentials directly with the teacher; this flow does not send an invitation email.
4. Test the teacher's first login: academic access is blocked until default password, new password and matching confirmation are accepted. Test wrong default passwords and cross-school assignments as well.

The database stores only a pending-change flag, never passwords. Only the trusted server can create credentials or clear the flag. Existing teacher accounts can still be assigned separately and are not automatically forced into this new onboarding flow.

Auth password updates and database flag updates span separate systems. If the password changes but enabling access fails, the account remains blocked and needs trusted administrator recovery. The new password is then the current Auth password; do not bypass the gate without verifying recovery.

Local permission tests and server syntax checks pass. Real hosted Auth/function behavior still requires the activation and integration test above.
