import { context } from "../../app/context.js";
import { resetState } from "../../app/state.js";
import { schoolService } from "../../services/schoolService.js";
import { pageHeader, field, schoolRows } from "../shared.js";
import { Card, CardHeader } from "../../components/Card.js";
import { Button } from "../../components/Button.js";
import { Table } from "../../components/Table.js";
import { toast } from "../../components/Toast.js";
import { defaultGrading } from "../../utils/constants.js";
import { escapeHtml, initials } from "../../utils/helpers.js";
import { ResultTemplateForm, bindResultTemplates } from "./ResultTemplates.js";
export function Settings(kind = "profile") {
  const tabs = [
    ["profile", "School profile"],
    ["academic", "Academic structure"],
    ["grading", "Grading rules"],
    ["templates", "Result templates"],
    ["subscription", "Subscription"],
  ];
  const form =
    kind === "templates"
      ? ResultTemplateForm()
      : kind === "profile"
        ? `<form id="school-profile"><div class="profile-logo"><span class="school-monogram">${initials(context.school.name)}</span><div><strong>School logo</strong><p>Logo upload is reserved for the storage phase.</p></div></div><div class="form-grid">${[
            ["name", "School name"],
            ["motto", "School motto"],
            ["address", "Address"],
            ["phone", "Phone"],
            ["email", "Email"],
            ["website", "Website"],
          ]
            .map(([key, label]) =>
              field(
                label,
                `<input name="${key}" value="${escapeHtml(context.school[key])}" ${key === "name" ? "required" : ""} type="${key === "email" ? "email" : "text"}">`,
              ),
            )
            .join(
              "",
            )}</div><div class="modal-actions">${Button("Save profile", { type: "submit" })}</div></form>`
        : kind === "academic"
          ? `${CardHeader("Academic structure")}<div class="settings-links">${[
              [
                "Sections & classes",
                "/school/classes",
                "Primary and Secondary sample sections",
              ],
              [
                "Subjects",
                "/school/subjects",
                `${schoolRows("subjects").length} subjects in the curriculum`,
              ],
              [
                "Academic sessions",
                "/school/academic-sessions",
                context.academicSession.name,
              ],
              ["Terms", "/school/terms", "First, Second and Third Term"],
            ]
              .map(
                ([title, href, desc]) =>
                  `<a href="${href}" data-link><div><strong>${title}</strong><small>${desc}</small></div><span>Manage →</span></a>`,
              )
              .join(
                "",
              )}</div><p class="padded helper-text">Structure belongs to each school. Class names and sections are mock records, rather than global system assumptions.</p>`
          : kind === "grading"
            ? `<form id="grading-form">${CardHeader("Your school’s grading rules")}<p class="padded">Configure score bands from 0 to 100. Each score must map to exactly one grade.</p>${Table(
                ["Minimum", "Maximum", "Grade", "Remark"],
                (context.school.grading || defaultGrading).map((r, i) =>
                  ["min", "max", "grade", "remark"].map(
                    (key) =>
                      `<input aria-label="Band ${i + 1} ${key}" name="${i}-${key}" value="${escapeHtml(r[key])}" ${key === "min" || key === "max" ? 'type="number" min="0" max="100"' : 'type="text"'} required>`,
                  ),
                ),
              )}<div class="modal-actions">${Button("Save grading rules", { type: "submit" })}</div></form>`
            : `${CardHeader("Professional plan", '<span class="badge success">Demo plan</span>')}<div class="padded"><h2>Room for your school to grow.</h2><p>School workspace · All prototype features included.</p><p class="helper-text">Subscriptions, billing, plan limits and payments are planned for Phase 2.</p>${Button("Explore pricing", { href: "/pricing", variant: "secondary" })}</div>`;
  return `${pageHeader("School settings", "Make this workspace your own.", "", "Workspace")}<nav class="tabs" aria-label="Settings">${tabs.map(([key, label]) => `<a href="/school/settings/${key}" data-link class="${kind === key ? "active" : ""}">${label}</a>`).join("")}</nav>${Card(form, "settings-card")}<div class="prototype-reset"><p>Prototype data is saved only in this browser.</p>${Button("Reset demo data", { action: "reset-demo", variant: "secondary" })}</div>`;
}
export function bindSettings(rerender) {
  bindResultTemplates(rerender);
  document
    .querySelector("#school-profile")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await schoolService.updateSchool(
        context.school.id,
        Object.fromEntries(new FormData(e.target)),
      );
      toast("School profile saved locally.");
      rerender();
    });
  document
    .querySelector("#grading-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(e.target),
        grading = Array.from({ length: 5 }, (_, i) => ({
          min: Number(data.get(`${i}-min`)),
          max: Number(data.get(`${i}-max`)),
          grade: data.get(`${i}-grade`).trim(),
          remark: data.get(`${i}-remark`).trim(),
        }));
      if (
        grading.some(
          (r) =>
            !Number.isInteger(r.min) ||
            !Number.isInteger(r.max) ||
            r.min < 0 ||
            r.max > 100 ||
            r.min > r.max,
        ) ||
        Array.from(
          { length: 101 },
          (_, score) =>
            grading.filter((r) => score >= r.min && score <= r.max).length,
        ).some((count) => count !== 1)
      )
        return toast(
          "Use whole-number bands covering 0–100 with no gaps or overlaps.",
          "error",
        );
      await schoolService.updateSchool(context.school.id, { grading });
      toast("Grading rules saved locally.");
      rerender();
    });
  document
    .querySelector('[data-action="reset-demo"]')
    ?.addEventListener("click", () => {
      if (!confirm("Reset all local prototype changes?")) return;
      resetState();
      location.reload();
    });
}
