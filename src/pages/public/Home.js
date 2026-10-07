import { PricingPlans } from "../../components/PricingPlans.js";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { product } from "../../data/product.js";

export function WorkspacePreview() {
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
 return `<section class="home-hero"><div class="home-hero-copy"><span class="eyebrow">FOR ACADEMIC EXCELLENCE</span><h1>Every result.<br>A clearer <em>future.</em></h1><p>One school workspace for students, teachers and results. Set your own assessments and grading, then review every result before publication.</p><div class="hero-actions">${Button("Register school",{action:"signup-modal"})}${Button("Try demo",{action:"try-demo",variant:"secondary"})}</div></div>${WorkspacePreview()}</section><section class="home-section" id="how-it-works"><div class="home-section-heading"><h2>From school setup to published results.</h2></div><div class="home-feature-grid">${[["Set up your school","Organise classes, subjects, students and teacher assignments."],["Capture scores","Teachers save drafts using your school's assessments and grading."],["Review and publish","Check results, approve them and publish a protected student report."]].map(([name,text])=>`<article class="card"><h3>${name}</h3><p>${text}</p></article>`).join("")}</div></section><section class="home-section" id="plans"><div class="home-section-heading"><h2>Plans that grow with your school.</h2><p>Student-based pricing, billed per term.</p></div>${PricingPlans()}</section><section class="home-section home-faq" id="faqs"><div class="home-section-heading"><h2>FAQ</h2></div><div class="home-faq-list">${[["Who registers the school?","A school administrator registers the school and manages its teachers and academic records."],["Can we use our own grading?","Yes. Your school configures assessment components, score limits and grade bands."],["How do teachers get access?","Your school administrator creates teacher accounts and assigns their classes and subjects. New teachers change their temporary password before accessing academic records."],["Do schools share their records?","Each school's records are protected by school membership and assigned teacher permissions."],["Can we have a custom domain?","Custom domains will be discussed separately. You do not need one to register your school."]].map(([question,answer])=>`<details><summary>${question}<span aria-hidden="true">+</span></summary><p>${answer}</p></details>`).join("")}</div></section>`;
}
