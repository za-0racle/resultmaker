# ResultMaker reconciliation report

This extends the existing application; it does not rebuild it. Scope is repository audit, documentation, safe incremental migration proposals, explicit service preparation and local validation. Hosted catalog access was unavailable; no production SQL was executed.

## A. Existing objects discovered

Three timestamped migrations define eight foundation tables: `profiles`, `schools`, `school_memberships`, `private.platform_admins`, `school_classes`, `school_subjects`, `teacher_assignments`, `private.school_registrations`. Existing helper/RPC functions, three foundation triggers, catalog/membership/profile policies and indexes are enumerated in [DATABASE_INVENTORY.md](DATABASE_INVENTORY.md). The original activation/provisioning/example scripts are preserved. Real authentication and scoped workspace layouts coexist with separate mock academic preview services.

## B. Keep

Vite, vanilla JS, HTML/CSS, ES modules, routes, layouts, branding, components, Auth identity, trusted owner permission and school membership roles. Profiles remain safe identity data rather than editable authorization. School signup continues to create its own school-admin membership; teachers get access only through trusted assignments.

## C. Modify

Extend existing school/class/subject/assignment tables instead of duplicating them. Backfill staff entities without replacing assignment IDs. Add optional section/campus/session data, active teacher checks and immutable tenant ownership. Change school deletion RPC to archival after migration adoption, retaining academic and billing records. Existing Remove wording needs coordinated follow-up at adoption.

## D. Add

Thirty-five new tables bring the proposed database to 43 tables across public/private schemas. They cover sections/campuses, sessions/terms, teacher entities, students/enrollments/import history, configurable assessments/grading/offerings, batches/aggregate reports/normalized scores, templates/domain ratings/attendance/comments, verification/audit and subscriptions/features/bills/payments. [DATABASE.md](DATABASE.md) explains their relationships and limits.

## E. Deprecated

The historical activation bundle is not an expansion mechanism. Hard deletion is replaced by archival in the proposal. Mock fixed assessment defaults, role previews, localStorage and hostname hints remain for demonstration and must not become production permission/configuration sources. No existing object is dropped.

## F. Migration order

Existing `120000 → 140000 → 180000`, then proposed `200000 → 210000 → 220000 → 230000`, all prefixed `20261007`. Skip already applied foundation migrations, including `180000` applied through the activation bundle. Exact filenames, risks and safe read-only inspection are in [MIGRATION_PLAN.md](MIGRATION_PLAN.md). No expansion was applied remotely.

## G. Frontend changes

New opt-in `academicDataService.js` and `subscriptionService.js` keep Supabase queries in services, map row keys to camelCase and use protected result RPCs. `utils/tenant.js` parses tenant hosts, including localhost with ports, without granting roles. Existing mock services/views remain intact. Adoption later needs authenticated tenant lookup, context session/term selection, database-backed academic forms, configured pricing display, centralized entitlement checks and coordinated Archive labeling/filtering in `workspaceService.js` / `WorkspaceAccess.js`. No competing framework/state system is introduced.

## H. Security/RLS

Non-null school ownership, RLS, scoped composite FKs, active memberships and assignment checks defend tenant boundaries. Subject teachers can edit draft scores only for assigned subjects/classes/sessions; class teachers access their class's aggregate; school admins stay within their school; trusted platform admins can oversee all schools. Workflow RPCs and immutable publication snapshots enforce backend rules. No public result endpoint exists, and subject teachers cannot fetch private full snapshots. Student/parent data links remain deferred.

## I. Subscription architecture

SQL plan data stores Starter NGN 50/student/term, Standard NGN 100/student/term recommended, and negotiated Professional pricing. Period snapshots freeze price, count, minimum, currency and plan details. The tested 500-student Standard period totals NGN 50,000 and remains unchanged after a plan price update. Features/overrides are normalized and resolved centrally; payment and billing writes require trusted processing. No prices are added to frontend logic.

## J. Deferred work

Payment provider integration; final PDF generation; QR generation and public verification endpoint; Google Sheets API and actual import jobs; custom domain/DNS setup; multi-campus UI; production deployment/application; Storage policies; student/parent academic linking; full live academic page adoption; automatic subscription enforcement, refund/reconciliation ledger and final report design.

Local validation: original tests plus expansion checks pass; the read-only audit executes locally; frontend production build passes. This validates the repository implementation, not hosted schema state or a deployed workflow.
