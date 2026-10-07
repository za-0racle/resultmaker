# Review-only migration plan

## Current status — expansion present

The user authorized using the existing new project directly, applied the four expansion migrations and supplied a complete post-migration export. Its definitions and table/column grants match the proposed schema: 43 tables, all with RLS enabled. See [HOSTED_SCHEMA_REVIEW.md](HOSTED_SCHEMA_REVIEW.md). **Do not rerun the seven migrations or activation bundle.** Remaining work is frontend adoption and live-account verification. The review-only instructions below record the original plan; hosted application was performed by the user, not the assistant.

**No hosted database changes or production deployment have been performed.** Review the reconciliation and the actual hosted catalog before running migration SQL. The proposed scripts each run in their own transaction; do not combine them into the historical activation bundle.

## Safe to run now

The complete hosted export has now been compared with the original foundation: no blocking definition mismatch was found. See [HOSTED_SCHEMA_REVIEW.md](HOSTED_SCHEMA_REVIEW.md) for matching objects and the trusted service-role ACL differences. Catalog comparison is complete for that supplied snapshot; migration-plan/data/staging review remains pending. Prefer [inspect-current-schema-report.sql](supabase/inspect-current-schema-report.sql) for a fresh snapshot immediately before adoption.

- Local checks: `npm test`, `npm run db:check`, `npm run build`.
- Read-only hosted inspection: [inspect-current-schema.sql](supabase/inspect-current-schema.sql). It queries tables/columns/FKs/indexes/functions/triggers/policies/grants inside a read-only transaction and exports no user rows. Save the output and compare with [DATABASE_INVENTORY.md](DATABASE_INVENTORY.md).
- The four expansion migrations are validated against an isolated reconstruction of the repository foundation. They are **candidates for a reviewed staging database**, not instructions to apply production changes now.

## Exact order

| Order | File | Action |
| --- | --- | --- |
| 1 | `20261007120000_tenant_foundation.sql` | Existing; apply only if never applied |
| 2 | `20261007140000_auth_workspace_access.sql` | Existing; apply only if never applied |
| 3 | `20261007180000_school_registration_and_teacher_scopes.sql` | Existing; skip if already applied through activation bundle |
| 4 | `20261007200000_academic_structure.sql` | Proposed: sections/campuses/sessions/people/enrollment/imports, assignment backfill and archive behavior |
| 5 | `20261007210000_assessment_grading_results.sql` | Proposed: versioned configurations, offerings, scores and result aggregates |
| 6 | `20261007220000_report_templates_workflow.sql` | Proposed: templates/domains/attendance/comments, publication/verification/audit and revision guards |
| 7 | `20261007230000_subscriptions_billing.sql` | Proposed: plan seeds, entitlements, billing/payment history and tenant ownership guards |

All files reside in `supabase/migrations/`. Preserve the existing timestamp convention. RLS is installed in the migration introducing each table; there is no interval with exposed unsecured academic tables. Apply the entire reviewed expansion before enabling its frontend adapters.

`activate-role-workspaces.sql` is the historical one-time alternative to step 3 plus company provisioning. **Do not rerun it** or run it alongside step 3. `provision-company-admin.sql` remains the independently rerunnable UID/email-verified owner grant; the expansion does not assign or modify company identity. `bootstrap-membership.example.sql` remains a trusted example, not a migration.

## Manual review before staging or production

1. Confirm the hosted table/function/policy signatures match the inventory. A partial deployment or manually edited schema needs its own reconciliation; do not hide conflicts using blanket `IF NOT EXISTS`, drop objects or rerun transactions blindly.
2. Back up the hosted database and inspect real teacher memberships/assignments, including suspended accounts and duplicate linked staff. The first expansion backfills teacher entities and requires each assignment to link to one; conflicts roll back rather than deleting data. Measure migration lock duration with representative data.
3. Review archival semantics: `platform_remove_school` changes from hard delete to `status='suspended'` plus `archived_at`. Confirm retention policy, permitted recovery and billing behavior. Update the current workspace Remove button/confirmation and filter archived schools when the migration is adopted; the current frontend remains compatible but its wording still describes the historical behavior. Do not deploy changed deletion wording against the old database.
4. Review assignment session semantics. NULL retains all-session legacy access; explicit sessions restrict academic access. Existing uniqueness forbids separate duplicate assignments for each session. Decide whether future annual staff history needs dated assignments before replacing indexes.
5. Review enrollment transfer rules, student data visibility to staff, assessment weights/rounding, continuous grading boundaries and curriculum completeness checks. No student/parent academic access is granted without linked identities.
6. Review rating/template layout configuration, active-version immutability, private publication snapshot contents and correction lineage. Public verification remains blocked by design; approve a disclosure allowlist before its future implementation.
7. Review the initial Starter/Standard/Professional data seed, minimum billing, custom negotiations and feature allocations. Only basic result management is seeded as an entitlement. Trusted billing provisioning must verify counts and prices; automatic expiry/suspension, overlapping subscription rules and provider integrations remain unimplemented.
8. Compare local results with Supabase staging behavior, including real Auth grants, transaction locking, email confirmation and authenticated multi-school accounts. Keep `private` out of exposed schemas. Database-owner test connections are distinct from ordinary API users.

## Safety and rollback

Each file uses `begin`/`commit` and fails atomically on incompatible schema/data. Once committed, later migration failure does not roll back earlier files. The new FK/trigger/backfill operations can lock populated tables; “additive” does not mean zero operational risk. No `DROP TABLE`, `TRUNCATE`, school deletion or existing-ID replacement is included. Existing tables receive new columns and compatible RPC behavior.

There is no automatic down migration that discards new records. Before adoption, restore a staging snapshot to test rollback; for production use a reviewed forward repair or backup restoration. Migration files are one-time changes, not repeatable installers. If migration tracking does not reflect earlier manual SQL Editor execution, reconcile that tracking separately instead of rerunning the foundation.

## Stop point

### Revised commercial catalogue

Apply `20261007260000_revised_plan_catalog.sql` after the billing migration. It changes Starter to Free, keeps Standard at NGN 100/student/term and renames Professional to Enterprise while preserving its ID and historical billing snapshots. It stores the approved comparison matrix in existing feature definitions/plan features. This file has not been applied to the hosted project. Quotas and feature restrictions still need server-side enforcement; the comparison is not enforcement. Planned delivery features are labelled in the UI. Teacher onboarding migration 250000 is independent of this catalogue update.

### Teacher onboarding follow-up

After the four expansion migrations, apply `20261007250000_teacher_account_onboarding.sql` once to enable server-controlled first-login password gating. This adds one private credentials-state table and trusted RPCs, and extends the existing school-role check without duplicating memberships. Deploy `teacher-accounts` separately; see TEACHER_ACCOUNT_SETUP.md. This follow-up has been checked locally but is not represented in the saved hosted audit until applied and re-exported.

Review artifacts and local checks are complete. Hosted catalog comparison, staging application, frontend adoption and production application require a separate reviewed step. Payment providers, final PDF, QR generation, Google Sheets API, custom domains, campus UI and deployment remain deferred.
