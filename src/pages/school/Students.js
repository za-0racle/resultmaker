import { studentService } from "../../services/studentService.js";
import { context } from "../../app/context.js";
import { pageHeader, className, schoolRows, options } from "../shared.js";
import { Button } from "../../components/Button.js";
import { Table } from "../../components/Table.js";
import { Badge } from "../../components/Badge.js";
import { Pagination } from "../../components/Pagination.js";
import { Card, CardHeader } from "../../components/Card.js";
import { EmptyState } from "../../components/EmptyState.js";
import { escapeHtml, initials } from "../../utils/helpers.js";
let page = 1,
  search = "",
  classFilter = "",
  statusFilter = "";
export async function Students(assigned = false) {
  const all = await studentService.getStudents();
  const filtered = all.filter(
    (s) =>
      (!assigned || s.classId === context.assignedClassId) &&
      (!classFilter || s.classId === classFilter) &&
      (!statusFilter || s.status === statusFilter) &&
      `${s.name} ${s.admissionNumber}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  page = Math.min(page, Math.max(1, Math.ceil(filtered.length / 8)));
  return `${pageHeader("Students", assigned ? "The learners in your assigned class." : "Every learner, with room to grow.", assigned ? "" : Button("Import students", { href: "/school/students/import", variant: "secondary", icon: "upload" }) + Button("Add student", { action: "add-student", icon: "plus" }), "Manage school")}<section class="card"><div class="list-toolbar"><label class="search-box"><span class="sr-only">Search students</span><input type="search" id="student-search" placeholder="Search name or admission number…" value="${escapeHtml(search)}"></label><label class="sr-only" for="class-filter">Filter by class</label><select id="class-filter"><option value="">All classes</option>${options(schoolRows("classes"), "id", "name", classFilter)}</select><label class="sr-only" for="status-filter">Filter by status</label><select id="status-filter"><option value="">All statuses</option><option ${statusFilter === "Active" ? "selected" : ""}>Active</option><option ${statusFilter === "Inactive" ? "selected" : ""}>Inactive</option></select><span class="record-count">${filtered.length} students</span></div>${Table(
    [
      "Admission number",
      "Student name",
      "Gender",
      "Class",
      "Status",
      "Actions",
    ],
    filtered
      .slice((page - 1) * 8, page * 8)
      .map((s) => [
        escapeHtml(s.admissionNumber),
        `<a href="/school/students/${s.id}" data-link class="person-cell"><span class="avatar mint">${initials(s.name)}</span><strong>${escapeHtml(s.name)}</strong></a>`,
        escapeHtml(s.gender),
        className(s.classId),
        Badge(s.status),
        `<a class="text-link" href="/school/students/${s.id}" data-link>View profile →</a>`,
      ]),
  )}${Pagination(page, filtered.length)}</section>`;
}
export function bindStudents(rerender) {
  document.querySelector("#student-search")?.addEventListener("input", (e) => {
    search = e.target.value;
    page = 1;
    rerender({ focus: "student-search" });
  });
  document.querySelector("#class-filter")?.addEventListener("change", (e) => {
    classFilter = e.target.value;
    page = 1;
    rerender();
  });
  document.querySelector("#status-filter")?.addEventListener("change", (e) => {
    statusFilter = e.target.value;
    page = 1;
    rerender();
  });
  document.querySelectorAll("[data-page]").forEach(
    (b) =>
      (b.onclick = () => {
        page = Number(b.dataset.page);
        rerender();
      }),
  );
}
export async function StudentProfile(id) {
  const s = await studentService.getStudentById(id);
  if (!s)
    return EmptyState(
      "Student not found",
      "This student is not available in the current workspace.",
      Button("Back to students", { href: "/school/students" }),
    );
  return `${pageHeader("Student profile", "A complete view of this learner’s journey.", Button("Back to students", { href: "/school/students", variant: "secondary" }) + Button("Edit student", { action: "edit-student" }), "Students")}<div class="profile-layout">${Card(`<div class="profile-identity"><span class="avatar profile-photo">${initials(s.name)}</span><h2>${escapeHtml(s.name)}</h2><p>${escapeHtml(s.admissionNumber)}</p>${Badge(s.status)}</div><dl class="details"><dt>Class</dt><dd>${className(s.classId)}</dd><dt>Gender</dt><dd>${escapeHtml(s.gender)}</dd><dt>Date of birth</dt><dd>${escapeHtml(s.dateOfBirth || "Not provided")}</dd><dt>Guardian</dt><dd>${escapeHtml(s.guardian || "Not provided")}</dd><dt>Guardian phone</dt><dd>${escapeHtml(s.guardianPhone || "Not provided")}</dd></dl>`)}<div>${Card(`${CardHeader("Academic history")}${Table(["Session", "Class", "Status"], [[context.academicSession.name, className(s.classId), Badge("Active")]])}`)}${Card(`${CardHeader("Results", Button("Preview report", { href: `/school/reports/student?student=${s.id}`, variant: "secondary" }))}<p class="padded">First Term results · ${context.academicSession.name}. This preview uses sample subject scores.</p>`)}${Card(`${CardHeader("Attendance")}${EmptyState("Attendance coming in a later phase", "Daily attendance records will appear here when connected.")}`)}</div></div>`;
}
