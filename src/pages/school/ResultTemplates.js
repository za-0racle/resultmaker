import { context } from "../../app/context.js";
import {
  getResultConfiguration,
  validateAssessmentComponents,
} from "../../data/resultConfiguration.js";
import { schoolService } from "../../services/schoolService.js";
import { Button } from "../../components/Button.js";
import { toast } from "../../components/Toast.js";
import { escapeHtml as e, uid } from "../../utils/helpers.js";
import { field } from "../shared.js";

const sectionLabels = {
  gradeKey: "Grade key",
  affective: "Affective domain",
  psychomotor: "Psychomotor domain",
  attendance: "Attendance",
  comments: "Comments",
  signatures: "Signatures & administrative approval",
};
const assessmentRow = (c) =>
  `<div class="assessment-config-row" data-key="${e(c.key)}">${field("Assessment name", `<input data-label value="${e(c.label)}" required>`)}${field("Maximum score", `<input data-max type="number" min="1" max="100" step="1" value="${c.max}" required>`)}<button type="button" class="button secondary" data-remove-component aria-label="Remove assessment component">Remove</button></div>`;

export function ResultTemplateForm() {
  const config = getResultConfiguration(context.school);
  return `<form id="result-template-form"><div class="template-intro"><span class="eyebrow">YOUR SCHOOL. YOUR RESULT.</span><h2>Result template & assessment structure</h2><p>Choose the details that tell your students’ story. Preview changes are saved in this browser.</p></div><div class="form-grid">${field("Report title", `<input name="reportTitle" value="${e(config.reportTitle)}" required>`)}<div>${Button("Preview student report", { href: "/school/reports/student", variant: "secondary" })}</div></div><section class="template-section"><h3>Assessment columns</h3><p>Maximum scores must total 100. Components apply to new score sheets; existing batches retain their assessment structure.</p><div id="assessment-config">${config.assessments.map(assessmentRow).join("")}</div>${Button("Add assessment", { action: "add-assessment", variant: "secondary", icon: "plus" })}</section><section class="template-section"><h3>Report sections</h3><div class="template-toggles">${Object.entries(
    sectionLabels,
  )
    .map(
      ([key, label]) =>
        `<label><input type="checkbox" name="section-${key}" ${config.sections[key] ? "checked" : ""}>${label}</label>`,
    )
    .join(
      "",
    )}</div></section><div class="form-grid">${field("Affective traits — one per line", `<textarea name="affectiveItems" rows="7">${e(config.affectiveItems.join("\n"))}</textarea>`)}${field("Psychomotor skills — one per line", `<textarea name="psychomotorItems" rows="7">${e(config.psychomotorItems.join("\n"))}</textarea>`)}</div><section class="template-section"><h3>Rating key</h3><div class="rating-key-config">${config.ratingScale.map((r) => field(`Rating ${r.value}`, `<input name="rating-${r.value}" value="${e(r.label)}" required>`)).join("")}</div><p>Trait ratings, attendance, ranking, signatures and verified result IDs remain placeholders in this phase.</p></section><div class="modal-actions">${Button("Save result template", { type: "submit", icon: "check" })}</div></form>`;
}

export function bindResultTemplates(rerender) {
  const form = document.querySelector("#result-template-form");
  if (!form) return;
  form
    .querySelector('[data-action="add-assessment"]')
    .addEventListener("click", () =>
      form
        .querySelector("#assessment-config")
        .insertAdjacentHTML(
          "beforeend",
          assessmentRow({ key: uid(), label: "", max: 10 }),
        ),
    );
  form.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-remove-component]");
    if (remove) remove.closest(".assessment-config-row").remove();
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form),
      config = getResultConfiguration(context.school);
    const assessments = [
      ...form.querySelectorAll(".assessment-config-row"),
    ].map((row) => ({
      key: row.dataset.key,
      label: row.querySelector("[data-label]").value.trim(),
      max: Number(row.querySelector("[data-max]").value),
    }));
    const error = validateAssessmentComponents(assessments);
    if (error) return toast(error, "error");
    const items = (key) =>
      String(data.get(key))
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
    const affectiveItems = items("affectiveItems"),
      psychomotorItems = items("psychomotorItems");
    if (
      (data.has("section-affective") && !affectiveItems.length) ||
      (data.has("section-psychomotor") && !psychomotorItems.length)
    )
      return toast(
        "Add at least one trait or skill for each visible rating domain.",
        "error",
      );
    const resultConfiguration = {
      ...config,
      reportTitle: data.get("reportTitle").trim(),
      assessments,
      affectiveItems,
      psychomotorItems,
      sections: Object.fromEntries(
        Object.keys(sectionLabels).map((key) => [
          key,
          data.has(`section-${key}`),
        ]),
      ),
      ratingScale: config.ratingScale.map((r) => ({
        ...r,
        label: data.get(`rating-${r.value}`).trim(),
      })),
    };
    await schoolService.updateSchool(context.school.id, {
      resultConfiguration,
    });
    toast("Result template saved for this school.");
    rerender();
  });
}
