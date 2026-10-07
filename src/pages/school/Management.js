import {
  pageHeader,
  schoolRows,
  className,
  subjectName,
  teacherName,
} from "../shared.js";
import { context } from "../../app/context.js";
import { teacherService } from "../../services/teacherService.js";
import { classService } from "../../services/classService.js";
import { subjectService } from "../../services/subjectService.js";
import { Button } from "../../components/Button.js";
import { Card, CardHeader } from "../../components/Card.js";
import { Table } from "../../components/Table.js";
import { Badge } from "../../components/Badge.js";
import { EmptyState } from "../../components/EmptyState.js";
import { Icon } from "../../components/Icon.js";
import { escapeHtml, initials } from "../../utils/helpers.js";
export async function Teachers() {
  const rows = await teacherService.getTeachers();
  return `${pageHeader("Teachers", "The people who make progress possible.", Button("Add teacher", { action: "add-teacher", icon: "plus" }), "Manage school")}${Card(
    Table(
      [
        "Teacher",
        "Employee ID",
        "Role",
        "Subjects / classes",
        "Status",
        "Actions",
      ],
      rows.map((t) => [
        `<div class="person-cell"><span class="avatar blue">${initials(t.name)}</span><div><strong>${escapeHtml(t.name)}</strong><small>${escapeHtml(t.email)}<br>${escapeHtml(t.phone)}</small></div></div>`,
        escapeHtml(t.employeeId),
        escapeHtml(t.role),
        `${t.subjectIds.map(subjectName).join(", ")}<small>${t.classIds.map(className).join(", ")}</small>`,
        Badge(t.status),
        `<button class="button secondary small" data-assign="${t.id}">Manage assignment</button>`,
      ]),
    ),
  )}`;
}
export async function Classes(assigned = false) {
  let rows = await classService.getClasses();
  if (assigned) rows = rows.filter((c) => c.id === context.assignedClassId);
  return `${pageHeader(assigned ? "My classes" : "Classes", "A flexible academic structure for your school.", assigned ? "" : Button("Add class", { action: "add-class", icon: "plus" }), "Manage school")}<div class="class-grid">${rows.map((c) => Card(`<span class="class-symbol mint">${Icon("school")}</span><span class="eyebrow">${escapeHtml(c.section)}</span><h2>${escapeHtml(c.name)}</h2><p>${schoolRows("students").filter((s) => s.classId === c.id).length} students · ${schoolRows("subjects").filter((s) => s.classIds.includes(c.id)).length} subjects</p><div class="card-bottom"><span>${teacherName(c.teacherId)}</span><a class="text-link" href="/school/classes/${c.id}" data-link>View class →</a></div>`, "class-card")).join("")}</div><p class="helper-text">Sample structure only. Schools can customize sections and classes in academic settings.</p>`;
}
export async function ClassProfile(id) {
  const c = await classService.getClassById(id);
  if (!c)
    return EmptyState(
      "Class not found",
      "This class is not available in the current workspace.",
    );
  return `${pageHeader(c.name, `${c.section} · Class teacher: ${teacherName(c.teacherId)}`, Button("Back to classes", { href: "/school/classes", variant: "secondary" }), "Classes")}${Card(
    `${CardHeader("Class roster")}${Table(
      ["Admission number", "Student", "Gender", "Status"],
      schoolRows("students")
        .filter((s) => s.classId === id)
        .map((s) => [
          escapeHtml(s.admissionNumber),
          `<a href="/school/students/${s.id}" data-link>${escapeHtml(s.name)}</a>`,
          s.gender,
          Badge(s.status),
        ]),
    )}`,
  )}${Card(
    `${CardHeader("Assigned subjects")}${Table(
      ["Subject", "Code", "Teacher"],
      schoolRows("subjects")
        .filter((s) => s.classIds.includes(id))
        .map((s) => [
          escapeHtml(s.name),
          escapeHtml(s.code),
          teacherName(s.teacherId),
        ]),
    )}`,
  )}`;
}
export async function Subjects(assigned = false) {
  let rows = await subjectService.getSubjects();
  if (assigned) rows = rows.filter((s) => s.id === context.assignedSubjectId);
  return `${pageHeader(assigned ? "My subjects" : "Subjects", "Give every subject a place in your curriculum.", assigned ? "" : Button("Add subject", { action: "add-subject", icon: "plus" }), "Manage school")}${Card(
    Table(
      [
        "Subject",
        "Code",
        "Section",
        "Classes assigned",
        "Teacher assigned",
        "Status",
      ],
      rows.map((s) => [
        escapeHtml(s.name),
        `<span class="code">${escapeHtml(s.code)}</span>`,
        escapeHtml(s.section),
        s.classIds.map(className).join(", "),
        teacherName(s.teacherId),
        Badge(s.status),
      ]),
    ),
  )}`;
}
export function Academic(kind) {
  const sessions = kind === "sessions";
  return `${pageHeader(sessions ? "Academic sessions" : "Terms", sessions ? "Organize learning, one academic year at a time." : "Set a clear rhythm for your school year.", Button(sessions ? "Add session" : "Add term", { action: sessions ? "add-session" : "add-term", icon: "plus" }), "Academic structure")}${Card(
    Table(
      [sessions ? "Session" : "Term", "Status", "School"],
      schoolRows(kind).map((row) => [
        escapeHtml(row.name),
        Badge(row.status),
        escapeHtml(context.school.name),
      ]),
    ),
  )}`;
}
