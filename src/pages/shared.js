import { context } from "../app/context.js";
import { state } from "../app/state.js";
import { escapeHtml } from "../utils/helpers.js";
import { Breadcrumb } from "../components/Breadcrumb.js";
export const pageHeader = (
  title,
  description,
  actions = "",
  section = "Workspace",
) =>
  `${Breadcrumb([section, title])}<div class="page-heading"><div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p></div><div class="heading-actions">${actions}</div></div>`;
export const className = (id) =>
  escapeHtml(
    state.classes.find((c) => c.id === id && c.schoolId === context.school.id)
      ?.name ?? "Unassigned",
  );
export const subjectName = (id) =>
  escapeHtml(
    state.subjects.find((c) => c.id === id && c.schoolId === context.school.id)
      ?.name ?? "Unassigned",
  );
export const teacherName = (id) =>
  escapeHtml(
    state.teachers.find((c) => c.id === id && c.schoolId === context.school.id)
      ?.name ?? "Unassigned",
  );
export const schoolRows = (key) =>
  state[key].filter((row) => row.schoolId === context.school.id);
export const options = (
  records,
  valueKey = "id",
  labelKey = "name",
  selected = "",
) =>
  records
    .map(
      (row) =>
        `<option value="${escapeHtml(row[valueKey])}" ${row[valueKey] === selected ? "selected" : ""}>${escapeHtml(row[labelKey])}</option>`,
    )
    .join("");
export const field = (label, input) =>
  `<label class="field"><span>${escapeHtml(label)}</span>${input}</label>`;
export const filters = (includeSubject = false) =>
  `<div class="filter-bar">${field("Session", `<select name="sessionId">${options(schoolRows("sessions"))}</select>`)}${field("Term", `<select name="termId">${options(schoolRows("terms"))}</select>`)}${field("Section", '<select name="section"><option value="">All sections</option><option>Primary</option><option>Secondary</option></select>')}${field("Class", `<select name="classId"><option value="">All classes</option>${options(schoolRows("classes"))}</select>`)}${includeSubject ? field("Subject", `<select name="subjectId"><option value="">All subjects</option>${options(schoolRows("subjects"))}</select>`) : ""}</div>`;
