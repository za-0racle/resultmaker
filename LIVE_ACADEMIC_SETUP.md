# Live academic pages

School-administrator routes now use Supabase records for academic sessions, terms, classes, subjects, sections and students. The existing layouts, authentication routing, teacher assignment dashboard and prototype preview services remain in place. No additional migration is needed after the verified four-migration expansion.

## Use the pages

1. Sign in with a school-administrator account. Company accounts continue to open the platform workspace; use a school's assigned administrator to manage its academic records.
2. Open Academic sessions and create the school's year, dates and status.
3. Open Terms and select the session, term name and order.
4. Open Classes/Subjects and create school-specific records. Sections can be added there; edit a class or subject to set its section/code/status.
5. Open Students to add admission identity, names, optional demographics and current class. Search by name/admission number; edit records to change their status/details.
6. Select a student's name to view its profile and add a session enrollment. Enrollment history is separate from current class. Duplicate enrollment in the same session is rejected; this UI does not rewrite existing enrollments or published history.

All queries/writes go through `academicDataService.js`, explicitly scoped to the assigned school. Write payloads allow only intended fields. Database membership/assignment policies remain the authorization boundary. Failed saves keep the dialog open; busy buttons prevent duplicate submissions. Pages provide load errors and retry without displaying mock records as live data.

The platform now labels school removal as Archive and excludes archived schools from the active list, matching the adopted RPC behavior. Archival retains records and suspends member access.

Not connected in this step: live result entry/publication UI, imports, final report rendering, payments and student/parent academic records. Teacher assignment screens remain connected, while teacher student/result views require their own scoped UI integration.

Validation: production frontend build; original authentication/database/prototype checks; new tests for school-scoped service writes, payload allowlists, catalog creation RPC, enrollment history, route handling and escaped student text. No real hosted records were created during development; verify the pages with actual school accounts on localhost before deploying.
