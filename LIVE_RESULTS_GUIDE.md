# Live results and faster navigation

## School administrator workflow

1. Set up sessions/terms/classes/subjects, students and their session enrollments in the existing academic pages.
2. Open Assessments. Create a named version, add ordered components with school-defined maxima and weights, then activate. Active weights must total 100. Draft components can be edited; active versions are locked.
3. Open Grading. Create a named version and bands covering 0–100 without gaps/overlap, then activate. Lower endpoints are inclusive; upper endpoints are exclusive except 100. No fixed school grading system is assumed.
4. Open Result templates. Create and activate a version. This uses the existing generic renderer key; it does not implement the final paper/PDF layout or custom template editor.
5. Open Results. Configure a class/subject/session offering using active assessment/grading versions. Create its term batch, then add session-enrolled students with an active report template. A student's draft aggregate is reused across subject batches for the same term.
6. Enter and Save draft scores, or let the assigned subject teacher use their Enter scores page. Blank inputs preserve saved values. Browser range validation is backed by database score limits. Saves are sequential individual draft writes, not an atomic batch transaction; errors explicitly explain that some draft scores may already have saved, so reopen before retrying.
7. Submit subject batches. School administrators review, approve and publish them through existing database RPCs. Review scores on student aggregates before submitting/reviewing/approving them. Publish the student report only after its included subject batches are published.
8. View published result opens a private academic summary of the frozen snapshot. Final report layout/PDF, ratings/attendance/comment entry, QR generation and public verification remain separate work.

Subject teachers see/edit their assigned subject batches. Class teachers can review their assigned class's aggregates and submit them. Approval/publication is administrator-only. Published records are locked; a correction-version creation UI is not implemented yet. A class teacher's draft review may show an unavailable subject label where the existing subject-catalog policy withholds that name; totals/grades follow the authorized result scope. Published snapshots include the frozen subject labels.

No new migration is required for these pages. All authorization and workflow RPCs use the previously verified expansion. No hosted records, accounts or emails were created by development tests.

## Loading changes

- Academic pages previously fetched seven datasets regardless of route. Sessions now fetch one dataset; terms/classes/subjects/student lists fetch two; student profiles fetch four.
- Workspace verification reuses its already verified user for membership loading, avoiding a second Auth user request. Membership and platform permission checks run concurrently. Concurrent identity refreshes share an in-flight request; no persistent permission cache or authorization bypass is introduced.
- Authenticated navigation keeps the current workspace visible with an accessible loading indicator instead of blanking the entire layout. Sign-out still clears private identity and displays the login loading state.
- The new result UI is loaded as a separate JavaScript chunk on demand. Draft editor details load only when opened; scores/components/enrollments are scoped to the selected batch/configuration/class/session rather than downloading all school score rows.
- Published snapshots are requested only on explicit preview through the existing permission-checked RPC. Table queries explicitly omit private snapshot columns.

The browser smoke check confirmed one Auth user request and one session dataset request on session navigation, plus draft score dialog/save and locked configuration behavior. These are request-count and simulated-interaction checks, not a live-network latency benchmark. Supabase response time and account-specific data size still affect speed. Large-school pagination and a fully scoped student-profile query are follow-up improvements; queries retain the server's response-row limit and do not yet implement paginated full-school lists.

## Validation

`npm test` covers original prototype/auth/database tests, published-history/RLS checks, live academic service allowlists and new result service/UI routing tests. `npm run build` verifies the production bundle. `scripts/live-results-browser-smoke.mjs` uses isolated Chrome with simulated API responses to check navigation requests and actual form interactions; it does not write to hosted Supabase.
