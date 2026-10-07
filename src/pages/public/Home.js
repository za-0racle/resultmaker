import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { product } from "../../data/product.js";

const features = [
  [
    "school",
    "A place for your whole school",
    "Keep students, staff, classes and subjects together in a dedicated school workspace.",
    "/school/dashboard",
  ],
  [
    "file",
    "Score entry that feels simple",
    "Teachers can enter scores, see totals and grades, save a draft, and submit their work for review.",
    "/teacher/results/entry",
  ],
  [
    "settings",
    "Your rules, your results",
    "Set your own grade bands and assessment columns, with score limits that add up to 100.",
    "/school/settings/templates",
  ],
  [
    "book",
    "Reports with your school’s character",
    "Preview a report with your school’s details, academic scores, comments and configurable rating sections.",
    "/school/reports/student",
  ],
  [
    "chart",
    "A clearer view of the class",
    "Explore class broadsheets and result completion to see what is ready and what still needs attention.",
    "/school/reports/broadsheet",
  ],
  [
    "shield",
    "A thoughtful review process",
    "Move result batches through review and approval before marking them published in the demo.",
    "/school/results/review",
  ],
];
const steps = [
  [
    "01",
    "Make it your school",
    "Set up your classes, subjects, grading rules and report preferences.",
  ],
  [
    "02",
    "Bring in the scores",
    "Teachers complete their score sheets and submit them when they are ready.",
  ],
  [
    "03",
    "Give every result a review",
    "Check submissions, add class comments and approve the result batches.",
  ],
  [
    "04",
    "See the whole story",
    "Explore a broadsheet, preview a student report and try the print layout.",
  ],
];
const questions = [
  [
    "Who is ÈsìAyọ̀ designed for?",
    "School administrators, subject teachers and class teachers. The current demo includes separate views for these roles and a platform administrator.",
  ],
  [
    "Can we use our own assessment and grading system?",
    "Yes. The demo lets your school configure assessment names and maximum scores, grade ranges and remarks. Assessment maximums currently add up to 100.",
  ],
  [
    "Can we customise our report card?",
    "You can change the report title, choose sections, and edit affective traits and psychomotor skills. The final report design and PDF generation will be completed in a later phase.",
  ],
  [
    "Can teachers use phones or tablets?",
    "The demo adapts to desktop, tablet and mobile screens. Wide score sheets and tables scroll within their panels.",
  ],
  [
    "Is this ready for live school records?",
    "This is a frontend demo with sample records and browser-local changes. Production accounts, secure data storage and access controls are planned before live use.",
  ],
  [
    "Can parents check results online yet?",
    "Parent and student access, result verification and QR codes are planned for a later phase. They are not available in the current demo.",
  ],
];

function WorkspacePreview() {
  return `<div class="home-workspace-preview" aria-label="Illustrative result workspace"><div class="preview-window-bar"><span class="preview-window-dots"><i></i><i></i><i></i></span><span>ÈsìAyọ̀ · Sample workspace</span>${Icon("shield")}</div><div class="preview-window-body"><div class="preview-school"><span class="school-monogram">GS</span><div><strong>Your school, at a glance</strong><small>First Term · 2026/2027</small></div></div><div class="preview-stat-grid"><div><small>Classes</small><strong>6</strong></div><div><small>Subject batches</small><strong>18</strong></div><div><small>One clear workflow</small><strong>${Icon("check")}</strong></div></div><div class="preview-results-heading"><strong>Keep results moving</strong><span>Sample statuses</span></div>${[
    ["Mathematics", "JSS 2A", "Submitted", "info"],
    ["English Studies", "JSS 1A", "Under Review", "warning"],
    ["Basic Science", "Primary 6", "Approved", "success"],
  ]
    .map(
      ([subject, cls, status, tone]) =>
        `<div class="preview-result-row"><span class="preview-subject-icon">${Icon("book")}</span><div><strong>${subject}</strong><small>${cls}</small></div><span class="badge ${tone}">${status}</span></div>`,
    )
    .join(
      "",
    )}<div class="preview-bottom-note">${Icon("check")} From first score to a clearer picture.</div></div><div class="preview-floating-note"><span>${Icon("file")}</span><div><strong>Every learner has a story.</strong><small>Give it the care it deserves.</small></div></div></div>`;
}

export function Home() {
  return `<section class="home-hero"><div class="home-hero-copy"><span class="eyebrow">FOR SCHOOLS. FOR TEACHERS. FOR EVERY LEARNER.</span><h1>School results,<br>beautifully <em>organised.</em></h1><p>Bring your students, scores and school reports into one thoughtful workspace. Spend less time piecing records together and more time supporting progress.</p><div class="hero-actions">${Button("Explore the demo", { href: "/school/dashboard", icon: "arrow" })}${Button("Talk to us", { href: "/contact", variant: "secondary" })}</div><div class="home-hero-note">${Icon("school")} A school-first workspace, with room for your own rules.</div></div>${WorkspacePreview()}</section><div class="home-value-strip"><span>${Icon("users")} Separate teacher workspaces</span><span>${Icon("settings")} School-specific grading</span><span>${Icon("book")} Flexible report previews</span><span>${Icon("check")} Review before release</span></div><section class="home-section" id="features"><div class="home-section-heading"><span class="eyebrow">A BETTER WAY THROUGH RESULT SEASON</span><h2>The details belong together.</h2><p>Less jumping between lists and score sheets. A more considered view of your school’s academic work.</p></div><div class="home-feature-grid">${features.map(([icon, title, description, href]) => `<article class="card home-feature"><span class="stat-icon blue">${Icon(icon)}</span><h3>${title}</h3><p>${description}</p><a href="${href}" data-link class="text-link">Explore in the demo ${Icon("arrow")}</a></article>`).join("")}</div></section><section class="home-section home-workflow" id="how-it-works"><div class="home-section-heading"><span class="eyebrow">A LITTLE STRUCTURE. A LOT MORE CLARITY.</span><h2>One term, four simple steps.</h2><p>Follow a result cycle in the demo, from school setup to a report preview.</p></div><ol class="home-workflow-steps">${steps.map(([number, title, description]) => `<li><span>${number}</span><h3>${title}</h3><p>${description}</p></li>`).join("")}</ol>${Button("Try the school workspace", { href: "/school/dashboard", variant: "secondary", icon: "arrow" })}</section><section class="home-section home-faq" id="faqs"><div class="home-section-heading"><span class="eyebrow">A FEW THINGS YOU MAY BE WONDERING</span><h2>Let’s make it clear.</h2><p>Questions about your school’s next result season? <a href="mailto:${product.email}">We’re happy to hear from you.</a></p></div><div class="home-faq-list">${questions.map(([question, answer]) => `<details><summary>${question}<span aria-hidden="true">+</span></summary><p>${answer}</p></details>`).join("")}</div></section><section class="home-contact-banner"><div><span class="eyebrow">YOUR NEXT RESULT SEASON STARTS HERE.</span><h2>Let’s talk about your school.</h2><p>See the demo, ask a question, or tell us what your school needs.</p></div><div>${Button("Contact ÈsìAyọ̀", { href: "/contact", icon: "arrow" })}<a href="tel:${product.phoneHref}">${product.phone}</a></div></section>`;
}
