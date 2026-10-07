# Academic design system

ÈsìAyọ̀ keeps its existing vanilla JavaScript components, routes, authentication and academic workflows. This redesign changes presentation and adds mobile public navigation; it does not change the data model or permissions.

`src/styles/variables.css` defines the semantic palette, font families, radii, shadows, spacing and transition duration. Existing variable names are aliases so older components follow the same tokens. `src/styles/academic.css` is loaded last and supplies the consistent presentation across public pages, authenticated workspaces and original academic modules. Component layout and responsive rules remain in their existing files.

| Use                                            | Token                   | Value     |
| ---------------------------------------------- | ----------------------- | --------- |
| Navigation, primary buttons, academic headings | `--color-primary`       | `#0B1F3A` |
| Navigation hover, chart series                 | `--color-primary-light` | `#163A63` |
| Important calls to action on navy              | `--color-accent`        | `#F4C430` |
| Dividers, selected items, card accents         | `--color-gold`          | `#C9A227` |
| General application background                 | `--color-surface`       | `#F8F9FC` |
| Public sections and supporting panels          | `--color-surface-warm`  | `#FBFAF5` |
| Body text                                      | `--color-text`          | `#172033` |
| Secondary text                                 | `--color-text-muted`    | `#647084` |

Cormorant Garamond (500–700) supplies major headings, welcome messages, important section headings, academic titles and the wordmark. Manrope (400–700) handles body text, navigation, controls, card headings, tables, metrics, notifications and modals. Google Fonts uses `display=swap`; generic serif and system sans-serif fonts provide fallbacks. These are the only two primary font families. Use the existing SVG icon component rather than introducing another icon family.

The public navbar uses the official navy-background SVG logo and its exact navy (`#0B1F4B`) and yellow (`#FFC72C`) colours. White links remain centred, with account buttons on the right. The hero stays off-white, with navy typography and yellow calls to action. Workspace sidebars retain navy. Gold marks academic sections and active navigation. Status colors remain restrained and retain visible status text. Cards use a 12px radius, controls 8px, and dialogs 14px. Hover and entrance transitions last 200ms. Button spinners appear only during asynchronous account actions. Repeating loading indicators respect reduced-motion preferences. Critical inline CSS hides the skip link before the app stylesheet loads; keyboard focus still reveals it.

Forms retain visible labels, input types, validation and password controls. Focus rings use navy on light surfaces and yellow on navy. Public navigation collapses into an expandable mobile panel with accessible labels and Escape-to-close behavior. Existing workspace navigation remains its mobile drawer. Score entry keeps wide tables inside scrolling panels with sticky column headers; print styles restore unclipped report tables.

Verification:

- `npm test`: identity, tenant access, grading, score validation, configuration, report composition and route coverage.
- `scripts/auth-browser-smoke.mjs`: authentication, account modals, public pages at five widths, public mobile menu and workspace isolation, using simulated Supabase responses.
- `scripts/academic-browser-smoke.mjs`: an isolated local harness that checks the original 50 prototype routes, 14 major academic views at four widths, student forms, score calculation/submission/review, comments, imports, grading validation, template preservation and report rendering.

The academic harness generates an ignored `.browser-check/academic-preview.html` and loads `scripts/academic-preview.js`. Neither is imported into the production app or included in its build. The original academic modules are still demo modules; styling them does not expose them through production authentication or add live academic services.
