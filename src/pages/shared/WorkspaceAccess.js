import { teacherAccountService } from "../../services/teacherAccountService.js";
import { workspaceService } from "../../services/workspaceService.js";
import { escapeHtml as e } from "../../utils/helpers.js";
import { Table } from "../../components/Table.js";

const field = (label, input) =>
  `<label class="field">${e(label)}${input}</label>`;
const options = (items) =>
  items
    .map((item) => `<option value="${e(item.id)}">${e(item.name)}</option>`)
    .join("");
const submit = (text) =>
  `<button class="button primary" type="submit">${e(text)}</button>`;

const summary = (items) =>
  `<div class="live-stats">${items.map(([label, value]) => `<div class="card live-stat"><span>${e(label)}</span><strong>${e(value)}</strong></div>`).join("")}</div>`;

export async function WorkspaceAccess(workspace) {
  if (
    !["superAdmin", "schoolAdmin", "classTeacher", "subjectTeacher"].includes(
      workspace.role,
    )
  )
    return "";
  try {
    const data = await workspaceService.load(workspace);
    if (workspace.role === "superAdmin") {
      return `${summary([
        ["Total schools", data.schools.length],
        [
          "Active schools",
          data.schools.filter((school) => school.status === "active").length,
        ],
        [
          "Suspended schools",
          data.schools.filter((school) => school.status === "suspended").length,
        ],
      ])}<section class="workspace-access"><h2>Schools across the platform</h2>${
        data.schools.length
          ? Table(
              ["School", "Address", "Status", "Actions"],
              data.schools.map((school) => [
                e(school.name),
                e(school.slug),
                e(school.status),
                `<button class="button secondary" data-school-status="${e(school.id)}" data-status="${school.status === "active" ? "suspended" : "active"}">${school.status === "active" ? "Suspend" : "Activate"}</button> <button class="button secondary" data-remove-school="${e(school.id)}">Archive</button>`,
              ]),
            )
          : `<div class="card live-empty"><h3>No schools registered yet</h3><p>Add your first school below, or a school administrator can register using Signup.</p></div>`
      }<div class="card"><h3>Add a school</h3><p>The administrator must already have a confirmed account.</p><form id="platform-school-form" class="form-grid">${field("School name", '<input name="name" required maxlength="200">')}${field("Workspace address", '<input name="slug" required minlength="2" maxlength="63" pattern="[a-z0-9]+(-[a-z0-9]+)*">')}${field("Administrator email", '<input name="email" type="email" required>')}${submit("Create school")}</form></div><p id="workspace-action-message" role="status" aria-live="polite"></p></section>`;
    }
    const className = (id) =>
      data.classes.find((item) => item.id === id)?.name || "Assigned class";
    const subjectName = (id) =>
      data.subjects.find((item) => item.id === id)?.name || "Class teacher";
    const admin = workspace.role === "schoolAdmin";
    return `${summary([
      ["Classes", data.classes.length],
      ["Subjects", data.subjects.length],
      [
        admin ? "Teaching assignments" : "My assignments",
        data.assignments.length,
      ],
    ])}<section class="workspace-access"><h2>${admin ? "School classes and teacher assignments" : "Your assigned classes and subjects"}</h2>${
      data.assignments.length
        ? Table(
            admin
              ? ["Teacher account", "Role", "Class", "Subject", "Access"]
              : ["Role", "Class", "Subject"],
            data.assignments.map((assignment) => [
              ...(admin
                ? [
                    e(
                      data.teachers.find(
                        (teacher) => teacher.user_id === assignment.user_id,
                      )?.email || assignment.user_id,
                    ),
                  ]
                : []),
              e(
                assignment.role === "class_teacher"
                  ? "Class teacher"
                  : "Subject teacher",
              ),
              e(className(assignment.class_id)),
              e(subjectName(assignment.subject_id)),
              ...(admin
                ? [
                    `<button class="button secondary" data-remove-assignment="${e(assignment.id)}">Remove assignment</button>`,
                  ]
                : []),
            ]),
          )
        : `<p>${admin ? "Add classes and subjects, then assign your teachers." : "No teaching assignments yet. Ask your school administrator to assign your class or subject."}</p>`
    }${admin ? `<div class="workspace-access-grid"><div class="card"><h3>Add a class or subject</h3><form id="catalog-form">${field("Type", '<select name="kind"><option value="class">Class</option><option value="subject">Subject</option></select>')}${field("Name", '<input name="name" required maxlength="100">')}${submit("Add")}</form><p>Classes: ${e(data.classes.map((item) => item.name).join(", ") || "None yet")}</p><p>Subjects: ${e(data.subjects.map((item) => item.name).join(", ") || "None yet")}</p></div><div class="card"><h3>Create a teacher account</h3><form id="create-teacher-account" class="form-grid">${field("Full name",'<input name="name" required maxlength="150">')}${field("Teacher email",'<input name="email" type="email" required>')}${field("Temporary password",'<input name="password" type="password" required minlength="12" maxlength="128" autocomplete="new-password">')}${field("Role",'<select name="role"><option value="subject_teacher">Subject teacher</option><option value="class_teacher">Class teacher</option></select>')}${field("Class",`<select name="classId" required><option value="">Choose</option>${options(data.classes)}</select>`)}${field("Subject (subject teachers only)",`<select name="subjectId"><option value="">Choose</option>${options(data.subjects)}</select>`)}${submit("Create teacher account")}</form><p>Share the temporary password with your teacher. They must replace it on first login.</p><h3>Assign an existing account</h3><form id="teacher-access-form">${field("Teacher email", '<input name="email" type="email" required>')}${field("Role", '<select name="role" id="teacher-access-role"><option value="subject_teacher">Subject teacher</option><option value="class_teacher">Class teacher</option></select>')}${field("Class", `<select name="class" required><option value="">Choose class</option>${options(data.classes)}</select>`)}<div id="teacher-subject-field">${field("Subject", `<select name="subject" required><option value="">Choose subject</option>${options(data.subjects)}</select>`)}</div>${submit("Assign workspace access")}</form></div></div>` : `<p>You can access only the classes and subjects assigned to your account in this school. Live student records and score entry will be connected separately.</p>`}<p id="workspace-action-message" role="status" aria-live="polite"></p></section>`;
  } catch (error) {
    return `<section class="card"><h2>Workspace setup required</h2><p role="alert">${e(error.code === "PGRST205" || error.code === "PGRST202" ? "The platform owner needs to apply the school registration and teacher scopes migration in Supabase." : "Could not load workspace assignments. Refresh and try again.")}</p></section>`;
  }
}

export function bindWorkspaceAccess(workspace, rerender) {
  document.querySelector("#create-teacher-account")?.addEventListener("submit", async event=>{event.preventDefault();const form=event.currentTarget,values=Object.fromEntries(new FormData(form));await run(form.querySelector('button[type="submit"]'),async()=>{if(values.role==="subject_teacher"&&!values.subjectId)throw Error("Choose the assigned subject.");await teacherAccountService.create({...values,schoolId:workspace.schoolId});form.reset();});});
  async function run(button, action) {
    const message = document.querySelector("#workspace-action-message");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    try {
      await action();
      await rerender();
    } catch (error) {
      if (message)
        message.textContent =
          error.message || "The change could not be saved. Please retry.";
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  }
  const bindForm = (id, action) =>
    document.querySelector(id)?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      run(form.querySelector('[type="submit"]'), () =>
        action(new FormData(form)),
      );
    });
  bindForm("#catalog-form", (data) =>
    workspaceService.createItem(
      workspace.schoolId,
      String(data.get("kind")),
      String(data.get("name")).trim(),
    ),
  );
  bindForm("#teacher-access-form", (data) =>
    workspaceService.assignTeacher(
      workspace.schoolId,
      String(data.get("email")).trim(),
      String(data.get("role")),
      String(data.get("class")),
      data.get("role") === "class_teacher" ? null : String(data.get("subject")),
    ),
  );
  bindForm("#platform-school-form", (data) =>
    workspaceService.createSchool(
      String(data.get("name")).trim(),
      String(data.get("slug")).trim(),
      String(data.get("email")).trim(),
    ),
  );
  document
    .querySelector("#teacher-access-role")
    ?.addEventListener("change", (event) => {
      const container = document.querySelector("#teacher-subject-field"),
        input = container.querySelector("select");
      container.hidden = input.disabled =
        event.target.value === "class_teacher";
    });
  document
    .querySelectorAll("[data-school-status]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        run(button, () =>
          workspaceService.setSchoolStatus(
            button.dataset.schoolStatus,
            button.dataset.status,
          ),
        ),
      ),
    );
  document.querySelectorAll("[data-remove-school]").forEach((button) =>
    button.addEventListener("click", () => {
      if (
        window.confirm(
          "Archive this school? Its members will lose access, while academic and billing records are retained.",
        )
      )
        run(button, () =>
          workspaceService.removeSchool(button.dataset.removeSchool),
        );
    }),
  );
  document
    .querySelectorAll("[data-remove-assignment]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        run(button, () =>
          workspaceService.removeAssignment(button.dataset.removeAssignment),
        ),
      ),
    );
}
