# ÈsìAyọ̀ the result maker - frontend architecture

## Implemented in Phase 1

The relationship used by the UI is School/Tenant → Workspace → Users → Students / Classes / Subjects → Results. `context.js` exposes school, user, role, academicSession and term, plus demonstration class/subject assignments and the hostname hint. Names and settings come from context; the mock school is not a global UI assumption.

`router.js` registers 50 public and workspace routes and uses `pushState`/`popstate`, without a routing dependency. Static routes are registered before matching detail patterns. Unknown URLs render an empty state. Navigation installs no inline JavaScript. `app.js` chooses a layout, renders the route, and binds view interactions. Its render counter prevents a slower route from overwriting a newer navigation.

Pages compose reusable HTML-string components. User-entered strings are escaped before interpolation. CSS variables define the design system; styles, layouts and responsive behavior are separate. Tables scroll inside their containers. The navigation collapses to a mobile drawer. Controls have accessible labels, visible focus states, a skip link, modal dialogs and live toast feedback. ReportPreview is isolated so the final owner-supplied report design can replace it.

State is in memory and persisted to versioned localStorage. The service repository returns copies, filters records by `context.school.id`, assigns a UUID and schoolId on create, and prevents ownership/ID changes on update. This models tenant boundaries for later service replacement; it is **not authorization or security**. The platform service intentionally reads across mock schools for the Super Admin UI. All roles, routes, mutations and localStorage are user-controlled.

Services expose asynchronous operations such as `getStudents`, `getStudentById`, `createStudent`, and `updateStudent`. Replace their internals with Supabase queries and keep UI consumers stable. The shared mock repository is an implementation detail. Schools, result scores, comments, sessions and terms remain distinct concepts.

`getTenantFromHostname()` parses `school.resultmaker.com`. localhost, 127.0.0.1 and IPv6 loopback accept a selectable development slug argument. This yields a hostname hint only: no tenant lookup, backend validation or DNS configuration exists. The shipped development workspace uses `greenfield`; another mock tenant can be added and selected through `setContext()` after seeding its records. Only one school is seeded in this phase.

## Role previews

| Role             | UI scope                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| superAdmin       | Platform schools, subscriptions, users, reports and settings placeholders; mock suspension                         |
| schoolAdmin      | Students, teachers, curriculum, academic structure, grading, imports, result workflow, reports and school settings |
| subjectTeacher   | Assigned class/subject, score entry, drafts, submission and submitted results                                      |
| classTeacher     | Assigned class/students, subject result review, attention examples and student comments                            |
| Student / Parent | Reserved; no dashboards or production memberships yet                                                              |

Direct routes automatically select the corresponding preview role. This is deliberate UI testing behavior and must be removed when authentication/membership resolution is introduced.

## Planned Supabase/PostgreSQL architecture — not implemented

- Supabase Auth identifies a person; school memberships associate that person with schools and scoped roles. Platform privileges require separately controlled platform membership. Do not derive privileges from hostname, route, localStorage or a client-selected role.
- Resolve the requested tenant from a trusted school domain/slug lookup. Then resolve the authenticated user's membership and valid current session/term before supplying context.
- Every school-owned row uses `school_id`. Frontend camelCase `schoolId` is translated in the service adapter. RLS must enforce membership and row ownership on every relevant table and Storage object. Filtering in the frontend is insufficient.
- Planned relationships: schools → memberships; schools → academic sections → classes; schools → students and teachers; sessions → terms; classes ↔ subjects via offerings; teachers ↔ offerings via assignments; students ↔ classes via session enrollment; offerings → result batches → per-student score rows. School-scoped grading configurations, class comments, attendance, imports and workflow audit records sit alongside these.
- Model class enrollment by academic session rather than relying on the prototype's current student.classId. Preserve prior academic history. Result batches must be unique for school, session, term, class and subject, with teacher assignment verified server-side.
- Scores should be normalized in PostgreSQL. The prototype's result.scores object is a view model, not a proposed JSON database schema. Score ranges, score component limits, totals and grading calculations must be validated on the server.
- Enforce workflow transitions Draft → Submitted → Under Review → Approved → Published on the backend, with immutable publishing/versioning and auditable actor/timestamp information. Avoid relying on disabled inputs or client status checks.
- Future school logos/photos live in protected Supabase Storage with validated uploads. CSV/Excel parsing, deduplication, transactional import, and OAuth-based Google Sheets access require separate implementation.
- Subscription plans, payments, billing webhooks and tenant suspension enforcement remain backend work. Public form and demo login actions currently send nothing.
- PDF export must follow the owner's exact reference. The current print preview contains illustrative scores and placeholder attendance/signatures.

## Decisions and limitations to review

1. Confirm whether staff may have multiple roles and memberships across schools. Current context holds one preview role at a time.
2. Confirm sections, class naming, session enrollment, score components, grading band count and weighting. The grading UI currently edits five bands and covers integer scores 0–100; these are prototype choices, not universal rules.
3. Define how teachers are assigned to multiple offerings, how administrative approval works, whether approved results can be reopened, and whether publication must apply to a whole class/term atomically.
4. Define enrollment/attendance history, comments, positions, aggregate averages, missing-score treatment and report design before implementing final calculations or PDFs. Report-card values are illustrative; broadsheets use saved batches.
5. localStorage is single-browser demo persistence, without concurrency, secure identity, server durability or migrations. Never use it for production student records. The optional smoke test resets the isolated demo browser data.
6. Production hosting must rewrite History API routes to index.html. DNS, wildcard domain certificates, tenant lookup and deployment remain out of scope.
7. Mock assignment and attention indicators do not constitute real teacher access rules. There is no production authorization in this build.

Phase 1 stops at this frontend skeleton. No database, Auth, RLS, Storage, payments, Google integration or production deployment has been created.

## Expanded result and template model

A student's term result is an aggregate containing academic subject results, affective ratings, psychomotor ratings, attendance, comments, average/ranking information and approval/publication state. It must not be modeled only as Student -> Subject -> Score, or coupled to one school's report sheet.

Implemented frontend preparation:

- School-specific result configuration defines report title, section visibility, assessment components, rating item lists and a five-level rating key. Defaults are mock configuration, not mandatory academic rules.
- Assessment components have stable prototype keys, labels and maximum scores adding to 100. New result batches snapshot their components. Existing saved batches retain their columns, including legacy batches using the original components. Configuration changes do not reinterpret old scores.
- `resultReportService.js` creates a complete report view model. `components/reports/ResultReportPreview.js` composes reusable named sections from `ReportSections.js`. Another template or a future ResultReportPDF renderer can consume the same model.
- The report is clearly a layout preview: academic scores are illustrative; ratings, attendance, position, publication date and signatures are placeholders. Class comments come from existing local mock data. There is no verified publication or QR functionality.

Planned database relationships (not implemented): School -> versioned Result Templates; School -> assessment configurations -> assessment components; School -> rating categories -> rating items and scales; Student Enrollment + Session + Term -> Student Result; Student Result -> academic result rows -> per-component assessments; Student Result -> affective/psychomotor ratings, attendance summary, comments, aggregate/ranking snapshot and approval/publication history. Each school-owned record carries school_id.

Use normalized component rows rather than permanent ca1/ca2/exam columns. The current legacy keys are compatibility details for the mock prototype. Define rating categories/items as school-owned configuration, not a fixed global list. Preserve component, grading, rating and template versions when publishing so later settings changes cannot alter an official historical result. Scope attendance and comments to student result/session/term; the current student-only comment map remains prototype persistence.

Final layout, class position rules, weighting/rounding, rating ownership and approval responsibilities require review. Templates should select and lay out data without changing the underlying result model. A later verification ID must be unique and backed by a valid published result; any QR must point to a real, privacy-reviewed verification endpoint. No QR codes, verification routes, database schema or final PDF implementation are part of this update.
