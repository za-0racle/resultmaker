# Reconciled database architecture

Status: proposed incremental expansion, locally validated; **not applied to hosted Supabase**. The repository foundation and existing live authentication remain intact. [DATABASE_INVENTORY.md](DATABASE_INVENTORY.md) lists the existing tables, functions, triggers, policies and indexes. A publishable API key cannot establish the hosted catalog: use the read-only [inspection script](supabase/inspect-current-schema.sql) to compare it before migration review.

## Existing foundation and classification

| Existing object | Classification | Reconciliation |
| --- | --- | --- |
| `profiles` | EXISTING / KEEP | Identity display data only; no editable permission column |
| `schools` | EXISTING / MODIFY | Add `logo_path`, `archived_at`; preserve IDs, slugs, contact fields and statuses |
| `school_memberships` | EXISTING / KEEP | Authoritative per-school roles, multiple roles/schools supported |
| `private.platform_admins` | EXISTING / KEEP | Trusted company privileges, independent of school memberships |
| `school_classes`, `school_subjects` | EXISTING / MODIFY | Extend the same tables with section/code/status/timestamps; optional class campus |
| `teacher_assignments` | EXISTING / MODIFY | Preserve IDs and memberships; add teacher entity, optional session and timestamps; allow staff without Auth |
| `private.school_registrations` | EXISTING / KEEP | Confirmed caller owns one new school; no user-controlled role |
| `is_platform_admin`, `has_school_role`, `can_manage_school` | EXISTING / KEEP | Retain trusted authorization sources and active-school checks |
| `has_teaching_assignment` | EXISTING / MODIFY | Also require an active linked teacher entity |
| `set_updated_at`, `handle_new_user`, profile/Auth triggers | EXISTING / KEEP | Preserve automatic safe display profiles and timestamps |
| Caller permission RPC, school signup, catalog creation, legacy teacher assignment/removal/listing RPCs | EXISTING / KEEP | Existing frontend contracts remain valid |
| `platform_create_school` | EXISTING / KEEP | Confirmed administrator assignment remains trusted |
| `platform_remove_school`, `platform_set_school_status` | EXISTING / MODIFY | Archive instead of deleting; reject reactivating archived schools |
| Existing policies and indexes | EXISTING / KEEP | Retain names and scopes; new assignment indexes supplement existing ones |
| Historical activation bundle | EXISTING / DEPRECATE for future expansion | Keep the file for history; never append expansion or rerun it |
| Mock academic data/services | EXISTING / KEEP for preview | Not production permissions, billing or academic storage |

Every existing function, trigger and policy in the inventory inherits KEEP unless the table above identifies its replacement. No existing table is renamed, duplicated or dropped. New ownership triggers prohibit moving school-owned rows between tenants, including users administering both schools.

## NEW academic and people objects

`school_sections` organizes existing classes/subjects. `school_campuses` supplies nullable campus references without building campus management. `academic_sessions` and `academic_terms` separate school years from their terms. Class and subject names remain school-scoped; codes are optional.

`teachers` is a staff record, with optional Auth `user_id`, staff number, contact data, campus and extensible fields. Existing teacher memberships are backfilled into this table and existing assignments retain their IDs. `assign_teacher_entity` can assign an offline staff record; `link_teacher_account` links a confirmed account and creates its assignment roles atomically. Legacy email-based assignment continues to work. Linking is administrator-only; editing teacher data cannot grant Auth access.

`students` stores admission identity, names, optional demographic/photo fields, status, current class/campus and extensible school data. `student_enrollments` records class membership per session. Results reference enrollments, not a student's mutable current class. One enrollment per student/session is an MVP constraint; mid-session transfers with dated enrollment periods require later review.

`student_imports` and `student_import_rows` reserve source, mapping, job status, counts and validation history for CSV, XLSX and Google Sheets. They do not parse files, call APIs or run jobs. Browser job creation is restricted; trusted processing owns job progress. Storage paths are references, not authorization: bucket policies and upload validation remain deferred.

Assignment `session_id = null` retains legacy access across sessions. Explicit sessions narrow new result and enrollment access. Existing assignment uniqueness remains session-independent to preserve legacy RPC compatibility; annual reassignment and dated staff-history requirements need review before changing those indexes. Teacher-visible student rows are school/class scoped; subject teachers can see their class roster, but not other subjects' scores or full report snapshots. Sensitive student-field visibility needs a product decision before UI integration.

## NEW assessments, grading and academic results

| Table | Purpose |
| --- | --- |
| `assessment_schemes`, `assessment_components` | Versioned names, maxima, percentage weights, order and active components |
| `grading_scales`, `grading_scale_items` | Versioned percentage ranges, school-defined grades and remarks |
| `subject_offerings` | Class + subject + session linked to assessment and grading versions |
| `result_batches` | Subject/class/term work unit and workflow state |
| `student_results` | Enrollment/class/session/term aggregate, template and publication snapshot |
| `academic_results` | A subject batch's contribution to a student's aggregate |
| `assessment_scores` | One numeric score per configured component and academic result |

Configuration begins as draft. Assessment activation requires active weights totalling 100; grading activation requires continuous non-overlapping coverage of 0–100. Active and archived versions are immutable. Create new versions instead of changing the interpretation of saved results. No universal CA/exam components or grades are seeded.

Calculation is `sum(score / component.max_score * component.weight)`, rounded to three decimal places. Missing required components mark a result incomplete and withhold the grade. Scores cannot exceed their configured maxima. Bands use lower-inclusive, upper-exclusive boundaries, with 100 included in the final band. For integer labels “0–39, 40–49”, store `[0,40), [40,50)` so decimal results have no gaps. Review rounding and school-specific aggregation/ranking rules before final report integration.

Database transition RPCs enforce `draft → submitted → under_review → approved → published`. Subject teachers submit only assigned subject batches; class teachers submit assigned class aggregates; school administrators review, approve and publish. Direct browser status updates are unavailable. Batch submission requires every included result's active component scores. Aggregate publication requires an active template and all included subject batches published. Completeness against an expected curriculum/whole-class roster is a **future rule**: current checks validate included rows, not an entire school's required subject list.

Published batches and aggregate snapshots resist rewrites. Corrections create `version + 1` with `supersedes_id` referencing a published version of the same offering/enrollment and term. Original rows remain. There is no reopen/reset/unpublish workflow yet. Child locks serialize score edits against submission/publication; concurrent writers can receive transaction conflicts and should retry safely in future service UI.

## NEW report configuration and publication

`result_templates` versions a renderer key and layout configuration; the schema is independent of one school's paper design. Existing HTML report components remain reusable: header, student summary, academic table, grade key, affective/psychomotor sections, attendance, comments, signatures and footer. Layout schema validation, custom renderer implementations and final signature design are deferred.

`rating_categories` distinguish affective, psychomotor and custom domains; `rating_items`, `rating_scales`, `rating_scale_items` and `student_ratings` normalize configured criteria and rating keys. No sample skills become permanent system values. Scales are versioned. Publication snapshots preserve category/item names even if their catalog changes later.

`result_attendance` stores days at school/present, calculated absence/percentage and optional extra fields. The linked aggregate supplies term/session. Schools may extend presentation; the initial counters permit fractional days and do not impose a national attendance format. `result_comments` distinguishes assigned subject teacher, assigned class teacher and school head comments.

Publication snapshots freeze school/student identity, academic context, template, grading, assessments, ratings, attendance and comments. **They are private full reports** and contain internal fields; never return the raw snapshot publicly. Subject teachers cannot select `published_snapshot`; `get_published_report` permits only class teachers for that class/session and school/platform administrators. Student/parent record links and their publication policies are intentionally not invented.

`result_verifications` issues a random unique UUID on publication and supports audited revocation. The example human-readable prefix is not a mandatory format. No anonymous SELECT, public verification RPC, route or QR generator is added. A future rate-limited lookup must accept an exact identifier and return an explicit allowlist, such as school display name, student display name when approved, session/term, publication date and valid/revoked status. Exclude staff details, internal IDs, full snapshots, admin data and database metadata. Decide consent and disclosure fields before implementation.

`audit_logs` records school, actor UUID, table, record UUID, action, time and minimal status changes. Triggers cover student/enrollment/staff assignments, results/scores/comments/attendance/ratings/templates/verification and subscriptions/payments/school status. Logs are append-only and administrator-readable; they do not duplicate private record bodies. SQL administrators remain trusted and can disable triggers, so this is application auditing rather than tamper-proof external archival.

## NEW subscriptions and billing

`subscription_plans` stores editable codes, names, pricing mode, unit price, NGN currency, minimum student count, recommended flag and active status. The initial data seed is Starter 50, Standard 100/recommended, Professional `custom` with NULL unit price. These amounts are SQL data, never frontend calculation constants.

`feature_definitions` and `plan_features` normalize entitlements. Only the agreed basic result-management entitlement is seeded across plans; advanced feature allocations require commercial review. `school_feature_overrides` supplies explicit expiring overrides. Overrides can authorize exceptions without an active subscription, so only trusted administrators should write them.

`school_subscriptions` holds the plan, status and renewal/expiry dates. `subscription_periods` freezes student count, minimum, unit/custom price, currency, dates and plan snapshot. Optional session/term references tie school billing to academics. Amount due is `max(student_count, minimum_students) × unit_price`, or the negotiated custom amount. Thus 500 × NGN 100 = NGN 50,000; changing the plan later cannot alter that bill. Counts/prices/snapshots must be captured by trusted provisioning, not supplied by a browser. No billing periods are automatically generated.

`payments` keeps provider references, amounts, currency, statuses and timestamps; payment currency must match its period. There is no provider integration, automatic reconciliation, refund ledger or webhook. Authenticated school users cannot insert payments, rewrite bills or self-activate subscriptions. School administrators can read only their billing; platform administrators can read across schools. Trusted server/admin writes are required. `get_school_entitlements` centralizes valid-subscription feature resolution. Subscription expiry does not yet automatically suspend academic access; business enforcement remains separate.

## Tenant isolation and permissions

All school-owned new rows have non-null `school_id`, an FK to `schools`, and RLS. Composite `(school_id, related_id)` FKs also reject references to another school's classes, people, configurations, results or bills. Authorization checks active membership and active school; platform permission lives only in `private.platform_admins`. Helpers use qualified names and pinned empty search paths. See [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) and [PostgreSQL constraints](https://www.postgresql.org/docs/16/ddl-constraints.html).

| Caller | Scope |
| --- | --- |
| Company/platform admin | All schools through trusted permissions; archive instead of destroy |
| School admin | Own school's academics/configuration/assignments; own billing read |
| Subject teacher | Assigned class/session roster and subject scores; draft score writes and subject submission |
| Class teacher | Assigned class/session reports, attendance, ratings, class comments; aggregate submission |
| Student/parent | Existing workspace identity only; no academic records until explicit links/policies exist |
| Anonymous | Active public plan catalog only; no student records or verification table |
| Trusted service/admin | Provisioning/import/payment operations; never expose credentials to frontend |

Hostname and frontend filters select context; they grant no privileges. Section/campus references preserve school tenancy and do not create new staff permissions. Archived schools retain records and lose normal member access. Policies apply to browser/API callers; owner/service SQL remains a trusted administrative boundary.

## Verification and limits

`npm run db:check` applies existing and proposed migrations to fresh isolated PostgreSQL, including legacy assignment backfill, role isolation, score validation, publication, private snapshots, correction versions, archival, audit immutability and billing snapshots. The read-only catalog script also runs locally. `npm test` and `npm run build` check the unchanged frontend architecture and new adapters. These tests are not proof of hosted migration state, Supabase Auth SMTP, Storage policies or deployment. No TypeScript/type generation is configured in this vanilla JS project.
