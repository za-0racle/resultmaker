# Hosted schema review — 2026-10-07

## Expansion applied by the user: verified export

The user chose to use the existing new Supabase project directly and supplied a fresh export after applying the four expansion migrations. Comparison against all seven repository migrations found **no definition or table/column-grant mismatch**.

Observed: 43 application tables, 348 columns, 141 indexes, 100 RLS policies, 86 public/private triggers plus the Auth profile trigger, 46 functions and 318 listed constraints. Every application table has RLS enabled. Function bodies, signatures and security settings match. The catalog represents NOT NULL differently, but all corresponding column nullability flags match.

Seventeen public RPCs additionally grant EXECUTE to the trusted service_role, as with the earlier foundation export; no broader browser-role differences were found. These are server-role grants, not new school-user permissions.

The metadata snapshot is retained in `supabase/hosted-expanded-schema-audit.json` and the comparison in `supabase/hosted-expanded-schema-comparison.json`. This verifies the supplied schema export, not actual plan seed rows, teacher backfill contents or real-account runtime behavior. The assistant did not execute hosted SQL or deploy the frontend. Next work is coordinated frontend adoption and real-account permission checks; do not rerun the migrations.

## Historical foundation review

The supplied SQL Editor export contains 118 table-grant entries across eight expected foundation tables. This is a partial hosted audit, not a complete schema match.

Observed: authenticated has table-level SELECT on profiles, schools, memberships, classes, subjects and teacher assignments. postgres and service_role have the listed administrative grants on those tables and the two private tables. No anon entries appear in this export. These entries are consistent with the repository foundation; they do not establish effective privileges inherited through other roles or prove RLS behavior.

Column-specific profile inserts/updates and school contact updates are deliberately granted by the foundation. The table-grants result alone does not include those column-specific entries. Do not infer that authenticated users cannot perform those permitted writes or add broad table-write grants to compensate.

Missing: table/column definitions, constraints/FKs, indexes, triggers, function bodies/permissions, RLS enabled flags/policies and column grants. The presence of the original eight table names does not prove the full migration definitions are installed or that no other tables exist.

Next: run [inspect-current-schema-report.sql](supabase/inspect-current-schema-report.sql) in the trusted SQL Editor. It uses one SELECT and returns a single `schema_report` JSON cell with ten sections, including column grants and Auth user triggers. Export/copy that complete JSON for comparison with DATABASE_INVENTORY.md. The script was validated locally against all three original migrations. It reads schema metadata only and performs no hosted changes.

## Complete export comparison

The subsequent complete export was compared with an isolated database built from the three original migrations. Source metadata is saved in `supabase/hosted-schema-audit.json`; the comparison is in `supabase/hosted-schema-comparison.json`. These are user-supplied export artifacts, not evidence of a direct hosted connection.

Matched: eight tables (all RLS enabled), 38 column definitions including nullability/defaults, 17 indexes, nine policy definitions, two public update triggers, the Auth profile trigger, 15 function definitions/signatures/security settings, and all 36 CHECK/unique/primary-key/foreign-key constraints. Relevant authenticated/anon/service-role table and column grants match the local foundation.

The local catalog separately lists 30 named NOT NULL constraints absent from the hosted constraint listing. Each corresponding hosted column is still `is_nullable='NO'`; this is a catalog representation difference, not a missing nullability restriction. No repair SQL is needed for it.

The hosted export additionally grants service_role EXECUTE on nine public RPCs. No anon or PUBLIC function grants appear in the supplied function ACLs, and authenticated function grants match. The extra grants are to the trusted server role, not browser users. Existing authorization checks remain inside each RPC. Role inheritance/default privileges and exposed-schema settings are outside this export's coverage.

No blocking definition mismatch was found. The complete foundation catalog comparison is now complete for the supplied snapshot. The expansion has not been applied: the four proposed migrations remain subject to the documented data/backfill, retention, business-rule and staging review. Metadata does not prove live account roles, current row contents, SMTP or runtime behavior. No hosted migrations or deployments were performed.
