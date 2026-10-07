import { context } from "./context.js";
import { repository } from "../services/mockRepository.js";
import { studentService } from "../services/studentService.js";
import { teacherService } from "../services/teacherService.js";
import { classService } from "../services/classService.js";
import { subjectService } from "../services/subjectService.js";
import { Modal } from "../components/Modal.js";
import { toast } from "../components/Toast.js";
import { options, field, schoolRows } from "../pages/shared.js";
import { validateStudent } from "../utils/validators.js";
import { escapeHtml } from "../utils/helpers.js";
export async function studentForm(rerender, id) {
  const existing = id ? await studentService.getStudentById(id) : null;
  Modal(
    existing ? "Edit student" : "Add a student",
    `<div class="form-grid">${field("Full name", `<input name="name" value="${escapeHtml(existing?.name || "")}" required autocomplete="name">`)}${field("Admission number", `<input name="admissionNumber" value="${escapeHtml(existing?.admissionNumber || "")}" required>`)}${field("Gender", `<select name="gender"><option ${existing?.gender === "Female" ? "selected" : ""}>Female</option><option ${existing?.gender === "Male" ? "selected" : ""}>Male</option><option>Other</option></select>`)}${field("Class", `<select name="classId">${options(schoolRows("classes"), "id", "name", existing?.classId)}</select>`)}${field("Date of birth", `<input type="date" name="dateOfBirth" value="${escapeHtml(existing?.dateOfBirth || "")}">`)}${field("Status", `<select name="status"><option>Active</option><option ${existing?.status === "Inactive" ? "selected" : ""}>Inactive</option></select>`)}</div>`,
    async (data, dialog) => {
      const student = Object.fromEntries(data),
        errors = validateStudent(student);
      if (
        schoolRows("students").some(
          (s) =>
            s.id !== id &&
            s.admissionNumber.toLowerCase() ===
              student.admissionNumber.trim().toLowerCase(),
        )
      )
        errors.push("Admission number already exists.");
      if (errors.length) return toast(errors.join(" "), "error");
      if (id) await studentService.updateStudent(id, student);
      else await studentService.createStudent(student);
      dialog.close();
      toast(id ? "Student updated." : "Student added to this workspace.");
      rerender();
    },
  );
}
export function teacherForm(rerender) {
  Modal(
    "Add a teacher",
    `<div class="form-grid">${[
      ["name", "Full name", "text"],
      ["email", "Email", "email"],
      ["phone", "Phone", "tel"],
      ["employeeId", "Employee ID", "text"],
    ]
      .map(([key, label, type]) =>
        field(label, `<input name="${key}" type="${type}" required>`),
      )
      .join(
        "",
      )}${field("Role", '<select name="role"><option>Subject Teacher</option><option>Class Teacher</option><option>School Admin</option></select>')}${field("Assigned class", `<select name="classId">${options(schoolRows("classes"))}</select>`)}${field("Assigned subject", `<select name="subjectId">${options(schoolRows("subjects"))}</select>`)}</div>`,
    async (data, dialog) => {
      const row = Object.fromEntries(data);
      if (schoolRows("teachers").some((t) => t.employeeId === row.employeeId))
        return toast("Employee ID already exists.", "error");
      row.classIds = [row.classId];
      row.subjectIds = [row.subjectId];
      delete row.classId;
      delete row.subjectId;
      await teacherService.createTeacher({ ...row, status: "Active" });
      dialog.close();
      toast("Teacher added locally.");
      rerender();
    },
  );
}
export async function assignmentForm(id, rerender) {
  const row = await teacherService.getTeacherById(id);
  Modal(
    `Assignments · ${row.name}`,
    `<div class="form-grid">${field("Role", `<select name="role">${["Subject Teacher", "Class Teacher", "School Admin"].map((r) => `<option ${row.role === r ? "selected" : ""}>${r}</option>`).join("")}</select>`)}${field(
      "Classes",
      `<select name="classIds" multiple size="6">${schoolRows("classes")
        .map(
          (c) =>
            `<option value="${c.id}" ${row.classIds.includes(c.id) ? "selected" : ""}>${escapeHtml(c.name)}</option>`,
        )
        .join("")}</select>`,
    )}${field(
      "Subjects",
      `<select name="subjectIds" multiple size="6">${schoolRows("subjects")
        .map(
          (s) =>
            `<option value="${s.id}" ${row.subjectIds.includes(s.id) ? "selected" : ""}>${escapeHtml(s.name)}</option>`,
        )
        .join("")}</select>`,
    )}</div><p class="helper-text">Select multiple entries with Ctrl or Command.</p>`,
    async (data, dialog) => {
      const subjectIds = data.getAll("subjectIds"),
        classIds = data.getAll("classIds");
      await teacherService.updateTeacher(id, {
        role: data.get("role"),
        classIds,
        subjectIds,
      });
      for (const s of schoolRows("subjects").filter((s) =>
        subjectIds.includes(s.id),
      ))
        await subjectService.updateSubject(s.id, { teacherId: id });
      for (const c of schoolRows("classes").filter(
        (c) => classIds.includes(c.id) && data.get("role") === "Class Teacher",
      ))
        await classService.updateClass(c.id, { teacherId: id });
      dialog.close();
      toast("Teaching assignments saved.");
      rerender();
    },
  );
}
export function structureForm(kind, rerender) {
  const isClass = kind === "class",
    isSubject = kind === "subject",
    isSession = kind === "session";
  const content = `<div class="form-grid">${field(isClass ? "Class name" : isSubject ? "Subject name" : isSession ? "Session name" : "Term name", '<input name="name" required>')}${isClass || isSubject ? field("Section", `<input name="section" list="section-options" required placeholder="e.g. Primary"><datalist id="section-options"><option>Primary</option><option>Secondary</option></datalist>`) : ""}${isSubject ? field("Subject code", '<input name="code" required>') : ""}${isClass || isSubject ? field("Teacher", `<select name="teacherId">${options(schoolRows("teachers"))}</select>`) : ""}${isSubject ? field("Classes", `<select name="classIds" multiple required size="6">${options(schoolRows("classes"))}</select>`) : ""}</div>`;
  Modal(`Add ${kind}`, content, async (data, dialog) => {
    const row = Object.fromEntries(data);
    if (isSubject) {
      row.classIds = data.getAll("classIds");
      await subjectService.createSubject({ ...row, status: "Active" });
    } else if (isClass)
      await classService.createClass({ ...row, status: "Active" });
    else
      await repository(isSession ? "sessions" : "terms").create({
        ...row,
        status: "Upcoming",
      });
    dialog.close();
    toast(`${kind[0].toUpperCase() + kind.slice(1)} added locally.`);
    rerender();
  });
}
