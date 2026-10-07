import { context } from "../../app/context.js";
import { resultService } from "../../services/resultService.js";
import { pageHeader, schoolRows, options, field } from "../shared.js";
import { Button } from "../../components/Button.js";
import { Table } from "../../components/Table.js";
import { EmptyState } from "../../components/EmptyState.js";
import { toast } from "../../components/Toast.js";
import { scoreComponents, defaultGrading } from "../../utils/constants.js";
import { gradeScore } from "../../utils/formatters.js";
import { validScore } from "../../utils/validators.js";
import { escapeHtml } from "../../utils/helpers.js";
import { getResultConfiguration } from "../../data/resultConfiguration.js";
let selectedClass = "",
  selectedSubject = "",
  selectedSession = "",
  selectedTerm = "",
  scores = {},
  loadedKey = "",
  dirty = false;
const rules = () => context.school.grading || defaultGrading;
const components = () =>
  record()?.components ||
  (record()
    ? scoreComponents
    : getResultConfiguration(context.school).assessments);
const record = () =>
  schoolRows("results").find(
    (r) =>
      r.classId === selectedClass &&
      r.subjectId === selectedSubject &&
      r.sessionId === selectedSession &&
      r.termId === selectedTerm,
  );
export function ResultEntry(teacher = false) {
  selectedClass ||= context.assignedClassId;
  selectedSubject ||= context.assignedSubjectId;
  selectedSession ||= context.academicSession.id;
  selectedTerm ||= context.term.id;
  if (teacher) {
    selectedClass = context.assignedClassId;
    selectedSubject = context.assignedSubjectId;
  }
  const key = [
    context.school.id,
    selectedClass,
    selectedSubject,
    selectedSession,
    selectedTerm,
    JSON.stringify(components()),
  ].join(":");
  if (loadedKey !== key) {
    scores = structuredClone(record()?.scores || {});
    loadedKey = key;
    dirty = false;
  }
  const students = schoolRows("students").filter(
    (s) => s.classId === selectedClass && s.status === "Active",
  );
  const locked = [
    "Submitted",
    "Under Review",
    "Approved",
    "Published",
  ].includes(record()?.status);
  return `${pageHeader("Result entry", "A little care in every score. A clear picture of every learner.", Button("Save draft", { action: "save-draft", variant: "secondary" }) + Button("Submit results", { action: "submit-results", icon: "check" }), "Results")}<div class="notice">${locked ? "This sample batch is submitted. Choose an unsubmitted subject or term to enter scores." : "Prototype score entry. Assessment columns follow the structure saved for this batch. Total: 100."}</div><section class="card"><div class="filter-bar">${field("Class", `<select id="entry-class" ${teacher ? "disabled" : ""}>${options(schoolRows("classes"), "id", "name", selectedClass)}</select>`)}${field(
    "Subject",
    `<select id="entry-subject" ${teacher ? "disabled" : ""}>${options(
      schoolRows("subjects").filter((s) => s.classIds.includes(selectedClass)),
      "id",
      "name",
      selectedSubject,
    )}</select>`,
  )}${field("Session", `<select id="entry-session">${options(schoolRows("sessions"), "id", "name", selectedSession)}</select>`)}${field("Term", `<select id="entry-term">${options(schoolRows("terms"), "id", "name", selectedTerm)}</select>`)}</div>${
    students.length
      ? Table(
          [
            "Student",
            ...components().map((c) => `${c.label} / ${c.max}`),
            "Total / 100",
            "Grade",
          ],
          students.map((s) => {
            const score = scores[s.id] || {};
            const total = components().reduce(
              (sum, c) => sum + Number(score[c.key] || 0),
              0,
            );
            return [
              `<strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(s.admissionNumber)}</small>`,
              ...components().map(
                (c) =>
                  `<input class="score-input" type="number" inputmode="decimal" min="0" max="${c.max}" step="1" value="${score[c.key] ?? ""}" data-student="${s.id}" data-component="${c.key}" aria-label="${escapeHtml(s.name)} ${escapeHtml(c.label)}" ${locked ? "disabled" : ""}>`,
              ),
              `<strong data-total="${s.id}">${total}</strong>`,
              `<span class="grade" data-grade="${s.id}">${escapeHtml(gradeScore(total, rules()).grade)}</span>`,
            ];
          }),
        )
      : EmptyState(
          "No active students",
          "Choose a class containing active students.",
        )
  }<div class="card-bottom"><span id="draft-status">${record() ? `Batch status: ${record().status}` : "New result batch · Not saved"}</span><span>All changes stay in this browser.</span></div></section>`;
}
export function bindResultEntry(rerender) {
  for (const [id, set] of [
    [
      "entry-class",
      (value) => {
        selectedClass = value;
        selectedSubject =
          schoolRows("subjects").find((s) => s.classIds.includes(value))?.id ||
          "";
      },
    ],
    ["entry-subject", (value) => (selectedSubject = value)],
    ["entry-session", (value) => (selectedSession = value)],
    ["entry-term", (value) => (selectedTerm = value)],
  ])
    document.querySelector("#" + id)?.addEventListener("change", (e) => {
      if (dirty && !window.confirm("Discard unsaved score changes?")) {
        rerender();
        return;
      }
      set(e.target.value);
      rerender();
    });
  document.querySelectorAll(".score-input").forEach((input) =>
    input.addEventListener("input", (e) => {
      const { student, component } = e.target.dataset;
      scores[student] ??= {};
      scores[student][component] =
        e.target.value === "" ? "" : Number(e.target.value);
      dirty = true;
      const total = components().reduce(
        (sum, c) => sum + Number(scores[student][c.key] || 0),
        0,
      );
      document.querySelector(`[data-total="${student}"]`).textContent = total;
      document.querySelector(`[data-grade="${student}"]`).textContent =
        gradeScore(total, rules()).grade;
      document.querySelector("#draft-status").textContent = "Unsaved changes";
    }),
  );
  const save = async (submit) => {
    if (
      ["Submitted", "Under Review", "Approved", "Published"].includes(
        record()?.status,
      )
    )
      return toast("This batch is locked after submission.", "error");
    const inputs = [...document.querySelectorAll(".score-input")];
    const invalid = inputs.find(
      (input) =>
        (submit || input.value !== "") &&
        !validScore(
          input.value,
          components().find((c) => c.key === input.dataset.component).max,
        ),
    );
    if (invalid) {
      invalid.focus();
      return toast("Enter a valid score in each required field.", "error");
    }
    if (!inputs.length) return toast("No students to save.", "error");
    const visibleScores = Object.fromEntries(
      inputs
        .map((input) => input.dataset.student)
        .filter((id, index, list) => list.indexOf(id) === index)
        .map((id) => [id, scores[id] || {}]),
    );
    const data = {
      classId: selectedClass,
      subjectId: selectedSubject,
      sessionId: selectedSession,
      termId: selectedTerm,
      teacherId: context.user.id,
      scores: visibleScores,
      components: components(),
      status: submit ? "Submitted" : "Draft",
      completion: Math.round(
        (inputs.filter((i) => i.value !== "").length / inputs.length) * 100,
      ),
    };
    if (record()) await resultService.updateResult(record().id, data);
    else await resultService.createResult(data);
    dirty = false;
    toast(
      submit
        ? "Results submitted for mock review."
        : "Draft saved in this browser.",
    );
    rerender();
  };
  document
    .querySelector('[data-action="save-draft"]')
    ?.addEventListener("click", () => save(false));
  document
    .querySelector('[data-action="submit-results"]')
    ?.addEventListener("click", () => save(true));
}
