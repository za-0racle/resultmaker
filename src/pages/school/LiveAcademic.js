import { createAcademicDataService } from "../../services/academicDataService.js";
import { escapeHtml as e } from "../../utils/helpers.js";
import { Table } from "../../components/Table.js";
import { Modal } from "../../components/Modal.js";

const paths = {
  "academic-sessions": "sessions",
  terms: "terms",
  classes: "classes",
  subjects: "subjects",
  students: "students",
};
export const academicKind = (path) =>
  /^\/school\/(academic-sessions|terms|classes|subjects|students)$/.test(path)
    ? paths[path.split("/").at(-1)]
    : /^\/school\/students\/[^/]+$/.test(path) && !path.endsWith("/import")
      ? "profile"
      : null;
const field = (label, input) =>
  '<label class="field">' + e(label) + input + "</label>";
const input = (name, value = "", type = "text", required = false) =>
  '<input name="' +
  name +
  '" type="' +
  type +
  '" value="' +
  e(value ?? "") +
  '" ' +
  (required ? "required" : "") +
  ' maxlength="100">';
const select = (name, items, value = "", optional = true) =>
  '<select name="' +
  name +
  '" ' +
  (!optional ? "required" : "") +
  '><option value="">Choose</option>' +
  items
    .map(
      (item) =>
        '<option value="' +
        e(item.id) +
        '" ' +
        (item.id === value ? "selected" : "") +
        ">" +
        e(item.name) +
        "</option>",
    )
    .join("") +
  "</select>";
export async function LiveAcademic(
  workspace,
  path,
  service = createAcademicDataService(),
) {
  const schoolId = workspace.schoolId,
    kind = academicKind(path);
  try {
    const needed = {
      sessions: ["sessions"],
      terms: ["sessions", "terms"],
      classes: ["classes", "sections"],
      subjects: ["subjects", "sections"],
      students: ["students", "classes"],
      profile: ["students", "classes", "sessions", "enrollments"],
    }[kind];
    const data = Object.fromEntries(
      [
        "sessions",
        "terms",
        "classes",
        "subjects",
        "students",
        "sections",
        "enrollments",
      ].map((key) => [key, []]),
    );
    await Promise.all(
      needed.map(async (key) => {
        data[key] = await service[key](schoolId);
      }),
    );
    const {
      sessions,
      terms,
      classes,
      subjects,
      students,
      sections,
      enrollments,
    } = data;
    const name = (items, id) =>
      items.find((item) => item.id === id)?.name || "Unassigned";
    const action = (type, id) =>
      '<button class="button secondary" data-academic-edit="' +
      type +
      '" data-id="' +
      e(id) +
      '">Edit</button>';
    let content;
    if (kind === "profile") {
      const student = students.find(
        (item) => item.id === path.split("/").at(-1),
      );
      if (!student) content = "<p>Student not found in this school.</p>";
      else
        content =
          "<h2>" +
          e(student.firstName + " " + student.lastName) +
          "</h2><p>Admission number: " +
          e(student.admissionNumber) +
          "</p>" +
          action("students", student.id) +
          "<h3>Enrollment history</h3>" +
          Table(
            ["Session", "Class", "Status"],
            enrollments
              .filter((row) => row.studentId === student.id)
              .map((row) => [
                e(name(sessions, row.sessionId)),
                e(name(classes, row.classId)),
                e(row.status),
              ]),
          ) +
          '<h3>Add session enrollment</h3><form id="live-enrollment-form" class="form-grid">' +
          input("studentId", student.id, "hidden") +
          field("Session", select("sessionId", sessions, "", false)) +
          field("Class", select("classId", classes, "", false)) +
          '<button class="button primary" type="submit">Save enrollment</button></form><p>Saved session enrollments retain academic history. Existing session enrollments cannot be reassigned here.</p>';
    } else {
      const columns = {
        sessions: ["Session", "Starts", "Ends", "Status", "Actions"],
        terms: ["Term", "Session", "Order", "Status", "Actions"],
        classes: ["Class", "Section", "Status", "Actions"],
        subjects: ["Subject", "Code", "Section", "Status", "Actions"],
        students: [
          "Admission number",
          "Student",
          "Current class",
          "Status",
          "Actions",
        ],
      };
      const rows = data[kind].map((row) =>
        kind === "students"
          ? [
              e(row.admissionNumber),
              '<a href="/school/students/' +
                e(row.id) +
                '" data-link>' +
                e(row.firstName + " " + row.lastName) +
                "</a>",
              e(name(classes, row.classId)),
              e(row.status),
              action(kind, row.id),
            ]
          : kind === "sessions"
            ? [
                e(row.name),
                e(row.startsOn || "-"),
                e(row.endsOn || "-"),
                e(row.status),
                action(kind, row.id),
              ]
            : kind === "terms"
              ? [
                  e(row.name),
                  e(name(sessions, row.sessionId)),
                  e(row.sortOrder),
                  e(row.status),
                  action(kind, row.id),
                ]
              : kind === "classes"
                ? [
                    e(row.name),
                    e(name(sections, row.sectionId)),
                    e(row.status),
                    action(kind, row.id),
                  ]
                : [
                    e(row.name),
                    e(row.code || "-"),
                    e(name(sections, row.sectionId)),
                    e(row.status),
                    action(kind, row.id),
                  ],
      );
      content =
        (kind === "students"
          ? field(
              "Search students",
              '<input type="search" id="live-student-search" placeholder="Name or admission number">',
            )
          : "") +
        '<button class="button primary" data-academic-add="' +
        kind +
        '">Add ' +
        (kind === "classes" ? "class" : kind.slice(0, -1)) +
        "</button>" +
        Table(columns[kind], rows);
      if (kind === "classes" || kind === "subjects")
        content +=
          '<h3>School sections</h3><button class="button secondary" data-academic-add="sections">Add section</button>' +
          Table(
            ["Section", "Code", "Status", "Actions"],
            sections.map((row) => [
              e(row.name),
              e(row.code || "-"),
              e(row.status),
              action("sections", row.id),
            ]),
          );
    }
    return {
      html:
        '<section class="card live-academic">' +
        content +
        '<p id="academic-message" role="alert" aria-live="polite"></p></section>',
      data,
    };
  } catch (error) {
    return {
      html:
        '<section class="card"><h2>Academic records could not load</h2><p role="alert">' +
        e(error.message) +
        '</p><button class="button secondary" data-academic-retry>Try again</button></section>',
      data: null,
    };
  }
}
export function bindLiveAcademic(workspace, data, rerender) {
  document
    .querySelector("[data-academic-retry]")
    ?.addEventListener("click", () => rerender());
  if (!data || workspace.role !== "schoolAdmin") return;
  document
    .querySelector("#live-student-search")
    ?.addEventListener("input", (event) => {
      const query = event.target.value.trim().toLowerCase();
      document.querySelectorAll(".live-academic tbody tr").forEach((row) => {
        row.hidden = !row.textContent.toLowerCase().includes(query);
      });
    });
  const service = createAcademicDataService();
  const open = (kind, id) => {
    const row = data[kind].find((item) => item.id === id) || {};
    let fields = "";
    if (kind === "students")
      fields =
        field(
          "Admission number",
          input("admissionNumber", row.admissionNumber, "text", true),
        ) +
        field("First name", input("firstName", row.firstName, "text", true)) +
        field("Middle name", input("middleName", row.middleName)) +
        field("Last name", input("lastName", row.lastName, "text", true)) +
        field("Gender", input("gender", row.gender)) +
        field("Date of birth", input("dateOfBirth", row.dateOfBirth, "date")) +
        field("Current class", select("classId", data.classes, row.classId));
    else fields = field("Name", input("name", row.name, "text", true));
    if (kind === "sessions" || kind === "terms")
      fields +=
        field("Starts", input("startsOn", row.startsOn, "date")) +
        field("Ends", input("endsOn", row.endsOn, "date"));
    if (kind === "terms")
      fields +=
        field(
          "Session",
          select("sessionId", data.sessions, row.sessionId, false),
        ) +
        field("Order", input("sortOrder", row.sortOrder ?? 1, "number", true));
    if (
      ["classes", "subjects", "sections"].includes(kind) &&
      !(!id && ["classes", "subjects"].includes(kind))
    )
      fields += field("Code", input("code", row.code));
    if (["classes", "subjects"].includes(kind) && id)
      fields += field(
        "Section",
        select("sectionId", data.sections, row.sectionId),
      );
    const statuses =
      kind === "students"
        ? ["active", "inactive", "withdrawn", "graduated"]
        : ["sessions", "terms"].includes(kind)
          ? ["planned", "active", "closed"]
          : ["active", "inactive"];
    if (id || !["classes", "subjects"].includes(kind))
      fields += field(
        "Status",
        select(
          "status",
          statuses.map((status) => ({ id: status, name: status })),
          row.status || statuses[0],
          false,
        ),
      );
    const dialog = Modal(
      id ? "Edit record" : "Add record",
      '<div class="form-grid">' +
        fields +
        '</div><p data-save-message role="alert"></p>',
      async (form, modal) => {
        const button = modal.querySelector('[type="submit"]');
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        try {
          const values = Object.fromEntries(form);
          for (const key of [
            "startsOn",
            "endsOn",
            "dateOfBirth",
            "classId",
            "sectionId",
            "code",
            "middleName",
            "gender",
          ])
            if (key in values && values[key] === "") values[key] = null;
          if ("sortOrder" in values)
            values.sortOrder = Number(values.sortOrder);
          if (values.name) values.name = values.name.trim();
          await service.save(kind, workspace.schoolId, values, id);
          modal.close();
          await rerender();
        } catch (error) {
          modal.querySelector("[data-save-message]").textContent =
            error.message;
        } finally {
          button.disabled = false;
          button.removeAttribute("aria-busy");
        }
      },
    );
  };
  document
    .querySelectorAll("[data-academic-add]")
    .forEach((button) =>
      button.addEventListener("click", () => open(button.dataset.academicAdd)),
    );
  document
    .querySelectorAll("[data-academic-edit]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        open(button.dataset.academicEdit, button.dataset.id),
      ),
    );
  document
    .querySelector("#live-enrollment-form")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = event.currentTarget.querySelector("button");
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      try {
        await service.save(
          "enrollments",
          workspace.schoolId,
          Object.fromEntries(new FormData(event.currentTarget)),
        );
        await rerender();
      } catch (error) {
        document.querySelector("#academic-message").textContent = error.message;
      } finally {
        button.disabled = false;
        button.removeAttribute("aria-busy");
      }
    });
}
