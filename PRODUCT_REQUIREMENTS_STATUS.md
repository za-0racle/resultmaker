# Current product coverage

The revised commercial offer is Free Starter (10 students, one teacher, one admin), Standard at NGN 100/student/term, and custom Enterprise. The comparison matrix is database-managed by migration 20261007260000. Existing hosted prices remain until this migration is applied. Student/teacher/admin quotas and paid-feature enforcement are not yet implemented. Basic/Limited/Multiple labels require quantified product rules before enforcing them. Daily backups, website builder and the other marked planned features are future offerings, not live service guarantees.

## Available frontend

- School-only registration with automatically generated internal slug; school name is the displayed workspace name.
- Authenticated, role-specific workspaces; public navigation returns signed-in users to their workspace.
- Academic sessions, terms, classes, subjects, students and enrollments.
- Configurable assessments and grading; score drafts and result review, approval and publication.
- Database-driven Starter, recommended Standard and custom Professional pricing on the homepage and pricing page.
- Day/night theme, streamlined navigation/footer and consolidated FAQ.
- Administrator-created teacher accounts and required first-login password change are implemented, pending the backend activation in TEACHER_ACCOUNT_SETUP.md.

## Database architecture prepared; further UI needed

Attendance, affective/psychomotor ratings, result comments, advanced template editing, subscription administration/payment history, verification management and student/parent delivery are not complete end-to-end UI features. Their normalized database structures and tenant protections are described in DATABASE.md. Existing demo screens must not be mistaken for completed live workflows.

## Explicitly deferred

Payment-provider integration, final HTML/CSS PDF reports, QR generation/public verification endpoint, Google Sheets API, custom domains, multi-campus UI and production deployment. No full result database is exposed to anonymous visitors. Public verification will need a narrowly scoped endpoint.
