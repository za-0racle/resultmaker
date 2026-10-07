# ÈsìAyọ̀ the result maker

Phase 1 frontend skeleton for a multi-tenant School Result Management SaaS. Built with Vite, HTML5, CSS3, vanilla JavaScript and ES modules. No frontend framework, routing library or production backend.

## Run locally

Use Node.js 22.12+ (or 20.19+) and npm. From the project folder:

```sh
npm install
npm run dev
```

Open the URL printed by Vite. The public landing page is `/`; open `/school/dashboard` for the school overview.

```sh
npm run build
npm run preview
npm test
```

`npm run build` writes `dist/`. `npm test` uses Node's built-in test runner and embedded PostgreSQL (PGlite) to verify the Supabase migration and access rules.

## Supabase foundation

The SDK, browser-safe environment configuration, Auth/membership services, and tenant foundation migration are prepared. Follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md) to connect a project and apply the migration. Run `npm run supabase:check` after setting `.env.local`.

Login now uses Supabase email/password authentication and trusted memberships to choose a role-specific workspace. Protected routes show account/workspace information while academic record services are being implemented; they do not expose the sample records. Apply the additional Auth workspace migration described in SUPABASE_SETUP.md before platform-admin login.

## Project structure

```text
resultmaker/
  index.html
  public/favicon.svg
  src/
    main.js
    app/         app orchestration, History API router, context, state, forms
    components/  Navbar, Sidebar, Header, Breadcrumb, Modal, Button, Card,
                 Table, Badge, EmptyState, LoadingState, Pagination, Toast, Icon
    layouts/     PublicLayout, PlatformLayout, SchoolLayout
    pages/
      public/    landing, about, pricing, contact, demo login, registration
      platform/  platform overview and management placeholders
      school/    dashboard, students, imports, management, reports, settings
      teachers/  teacher and class teacher dashboards, comments
      results/   score entry, review, replaceable report preview
    services/    schoolService, studentService, teacherService, classService,
                 subjectService, resultService, importService, mockRepository
    data/        mockData.js
    utils/       constants, helpers, formatters, validators
    styles/      variables, main, layout, components, responsive
    assets/      reserved for future school/product assets
  scripts/browser-smoke.mjs
  tests/prototype.test.js
  ARCHITECTURE.md
```

## Prototype interactions

- Switch between Super Admin, School Admin, Subject Teacher and Class Teacher using **Preview as** in the sidebar or `/login`. Direct workspace routes select the corresponding demo role. Student and Parent roles are reserved for a future phase.
- Search/filter/page through 20 students, create/edit student records, and inspect profiles.
- Create teachers, classes, subjects, academic sessions and terms; manage teacher assignments.
- Walk through CSV/Excel Upload → Map columns → Validate → Preview → Import. Only filenames are read; rows and validation are simulated. Google Sheets is a future integration placeholder.
- Enter numeric scores, preview totals/grades, save drafts, submit, review, approve and publish locally. Submitted batches lock score inputs. Choose a different term for a blank score sheet.
- Preview a sample student report and use the browser's print preview; this is not the final PDF design. Broadsheets aggregate saved mock result records. Performance reports provide filtered placeholders.
- Save school profile, validate configurable whole-number grading bands, and save class teacher comments locally.

Changes persist to this browser's localStorage under `resultmaker-prototype-v1`. **School settings → Reset demo data** restores the seed. Use fictitious data only; nothing is submitted to an external service.

Seed: one school, 20 students, 10 teachers, six classes, 10 subjects, one session, three terms, 18 result batches and two import examples. Dashboard statistics derive from these records; activity and attention indicators are illustrative.

## Routes

All required routes are registered explicitly in `src/app/router.js`. Detail IDs refer to UUID-shaped mock IDs, not sequential URL IDs.

| Workspace       | Routes                                                                                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public          | `/`, `/about`, `/pricing`, `/contact`, `/login`, `/register-school`                                                                                                    |
| Platform        | `/platform`, `/platform/schools`, `/platform/schools/:id`, `/platform/subscriptions`, `/platform/users`, `/platform/reports`, `/platform/settings`                     |
| School overview | `/school`, `/school/dashboard`                                                                                                                                         |
| Students        | `/school/students`, `/school/students/import`, `/school/students/:id`                                                                                                  |
| Curriculum      | `/school/classes`, `/school/classes/:id`, `/school/subjects`, `/school/teachers`, `/school/academic-sessions`, `/school/terms`                                         |
| Results         | `/school/results`, `/school/results/entry`, `/school/results/review`, `/school/results/published`                                                                      |
| Reports         | `/school/reports`, `/school/reports/student`, `/school/reports/broadsheet`                                                                                             |
| Settings        | `/school/settings`, `/school/settings/profile`, `/school/settings/academic`, `/school/settings/grading`, `/school/settings/templates`, `/school/settings/subscription` |
| Subject teacher | `/teacher`, `/teacher/dashboard`, `/teacher/classes`, `/teacher/subjects`, `/teacher/results`, `/teacher/results/entry`, `/teacher/results/submitted`                  |
| Class teacher   | `/class-teacher`, `/class-teacher/dashboard`, `/class-teacher/class`, `/class-teacher/students`, `/class-teacher/results`, `/class-teacher/comments`                   |

Report placeholders for subject/class performance and result statistics use `/school/reports?view=subject`, `?view=class`, and `?view=statistics`.

## Verification

`npm test` verifies tenant scoping, record ownership, grading boundaries, mock service operations, and required route registration. For optional browser checks, run Vite on port 5173 and a separate headless Chrome instance with remote debugging on port 9222 and an isolated project-local `.browser-check` profile. Run `node scripts/browser-smoke.mjs`. This script checks all routes and important interactions, writes desktop/mobile screenshots into that profile folder and resets prototype localStorage. It requires Node.js 22+ with built-in WebSocket support. It is intended only for a disposable local demo browser.

## Phase 2 — not implemented

Supabase setup, PostgreSQL schema/migrations, Supabase Auth, membership validation, RLS, Storage uploads, production tenant resolution, audit trails, payments/subscription enforcement, CSV/Excel processing, Google OAuth/Sheets API, PDF generation and deployment. No secrets or fake credentials are present. See `ARCHITECTURE.md` for the handoff and open decisions.

## Brand and configurable result reports

The official product name is ÈsìAyọ̀ the result maker. Classic blue (`#173f78`), navy (`#102746`), gold (`#ba9548`), white and neutral grays define the UI. `Brand.js` provides the shared wordmark. Legacy storage keys and example domain names remain stable to preserve demo data; a production domain has not been chosen.

School settings now includes `/school/settings/templates`, bringing the route total to 50. Administrators can save a report title, show/hide report sections, add/remove/rename assessment components with maximum scores totaling 100, customize affective and psychomotor item lists, and edit rating labels. These settings belong to the current mock school and persist locally.

`getMockResultReport()` returns a report view model. `ResultReportPreview` composes ReportHeader, StudentSummary, AcademicResultsTable, GradeKey, AffectiveDomain, PsychomotorDomain, RatingKey, AttendanceSummary, CommentsSection, SignatureSection and ReportFooter. This view model is designed for a later PDF renderer. Existing result batches preserve their score columns; new batches use the school's saved assessment structure. A legacy batch without a snapshot uses the original four prototype components.

The preview has illustrative academic scores and averages, saved class comments, grade/rating keys and empty attendance/rating/ranking/signature fields. It is not an official published result. The `DEMO-` identifier has no verification endpoint or QR code. Browser printing uses A4 styling; the final report design and production PDF generation remain future work.


## Public homepage and contact details

The public homepage contains a demo workspace illustration, six feature highlights, a four-step walkthrough, native FAQ accordions and a contact call to action. The shared public footer groups product/company links and clickable contact details. `src/data/product.js` is the central source for admin@Esiayo.com and 07060485927 (international telephone link: +2347060485927). These are product contact details, separate from mock schools' own contact fields.

The structure was informed by Result Arena's indexed school-result software page and its contact page. The supplied Nigeria-specific URL could not be retrieved during review. All homepage copy is original and describes this prototype; there are no borrowed testimonials, unsupported customer counts or speed claims. Parent access, production security, final PDFs and verification remain planned features.
