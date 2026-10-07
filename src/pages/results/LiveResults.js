import { createLiveResultService } from "../../services/liveResultService.js";
import { escapeHtml as e } from "../../utils/helpers.js";
import { Table } from "../../components/Table.js";
import { Modal } from "../../components/Modal.js";

import { liveResultKind } from "../../utils/liveResultRoutes.js";
export { liveResultKind };
const title = {
  schemes: "Assessment configuration",
  scales: "Grading configuration",
  templates: "Report templates",
  results: "Results",
};
const button = (text, attrs = "") =>
  `<button type="button" class="button secondary" ${attrs}>${e(text)}</button>`;
const field = (label, input) =>
  `<label class="field">${e(label)}${input}</label>`;
const input = (name, type = "text", value = "", extra = "") =>
  `<input name="${name}" type="${type}" value="${e(value)}" ${extra}>`;
const choices = (name, rows, label = (row) => row.name, required = true) =>
  `<select name="${name}" ${required ? "required" : ""}><option value="">Choose</option>${rows.map((row) => `<option value="${e(row.id)}">${e(label(row))}</option>`).join("")}</select>`;
const lookup = (rows, id) =>
  rows.find((row) => row.id === id)?.name || "Unavailable";
export async function LiveResults(
  workspace,
  path,
  service = createLiveResultService(),
) {
  const kind = liveResultKind(path, workspace.role),
    schoolId = workspace.schoolId;
  try {
    const needed =
      kind === "schemes"
        ? ["schemes", "components"]
        : kind === "scales"
          ? ["scales", "bands"]
          : kind === "templates"
            ? ["templates"]
            : [
                "batches",
                "reports",
                "offerings",
                "classes",
                "subjects",
                "sessions",
                "terms",
              ];
    const data = Object.fromEntries(
      await Promise.all(
        needed.map(async (key) => [key, await service.list(key, schoolId)]),
      ),
    );
    let html = `<section class="live-workspace"><div class="page-heading"><h1>${title[kind]}</h1></div><p id="result-message" role="alert" aria-live="polite"></p>`;
    if (kind !== "results") {
      html += `<section class="card"><p>Configure a draft, then activate it. Active versions are locked; create a new version for changes.</p>${button("Create version", `data-result-create="${kind}"`)}`;
      for (const row of data[kind]) {
        html += `<article class="card"><h2>${e(row.name)} · Version ${e(row.version)}</h2><p>${e(row.status)}</p>`;
        const childKind = kind === "schemes" ? "components" : "bands";
        if (kind === "schemes")
          html += Table(
            ["Component", "Maximum", "Weight %", "Order", "Actions"],
            data.components
              .filter((c) => c.schemeId === row.id)
              .map((c) => [
                e(c.name),
                e(c.maxScore),
                e(c.weight),
                e(c.sortOrder),
                row.status === "draft"
                  ? button(
                      "Edit",
                      `data-result-edit="components" data-id="${e(c.id)}"`,
                    )
                  : "Locked",
              ]),
          );
        if (kind === "scales")
          html += Table(
            ["From inclusive", "To exclusive*", "Grade", "Remark", "Actions"],
            data.bands
              .filter((c) => c.scaleId === row.id)
              .map((c) => [
                e(c.minimumScore),
                e(c.maximumScore),
                e(c.grade),
                e(c.remark),
                row.status === "draft"
                  ? button(
                      "Edit",
                      `data-result-edit="bands" data-id="${e(c.id)}"`,
                    )
                  : "Locked",
              ]),
          );
        if (row.status === "draft")
          html +=
            (kind !== "templates"
              ? button(
                  kind === "schemes" ? "Add component" : "Add grading band",
                  `data-result-create="${childKind}" data-parent="${e(row.id)}"`,
                )
              : "") +
            button(
              "Activate",
              `data-result-activate="${kind}" data-id="${e(row.id)}"`,
            );
        html += "</article>";
      }
      if (kind === "scales")
        html +=
          "<p>*100 is included in the final band. For integer labels 0–39 and 40–49, enter boundaries 0–40 and 40–50. All bands must cover 0–100 without gaps.</p>";
      if (!data[kind].length)
        html += "<p>No configuration yet. Create your first version.</p>";
      html += "</section>";
    } else {
      const admin = workspace.role === "schoolAdmin";
      if (admin)
        html += `<section class="card"><h2>Set up results</h2><p><a data-link href="/school/settings/academic">Assessments</a> · <a data-link href="/school/settings/grading">Grading</a> · <a data-link href="/school/settings/templates">Templates</a></p>${button("Configure class subject", 'data-result-create="offerings"')}${button("Create subject batch", 'data-result-create="batches"')}</section>`;
      const next = {
        draft: "submitted",
        submitted: "under_review",
        under_review: "approved",
        approved: "published",
      };
      const action = (entity, row) => {
        const status = next[row.status];
        const can =
          admin ||
          (row.status === "draft" &&
            (entity === "batches"
              ? workspace.role === "subjectTeacher"
              : workspace.role === "classTeacher"));
        return status && can
          ? button(
              ({submitted:'Submit',under_review:'Review',approved:'Approve',published:'Publish'})[status],
              `data-result-transition="${entity}" data-id="${e(row.id)}" data-status="${status}"`,
            )
          : "";
      };
      const batches = data.batches.filter((row) =>
        path.endsWith("/published")
          ? row.status === "published"
          : path.endsWith("/submitted")
            ? row.status !== "draft"
            : true,
      );
      html += `<section class="card"><h2>Subject batches</h2>${Table(
        ["Class", "Subject", "Term", "Version", "Status", "Actions"],
        batches.map((row) => {
          const offering = data.offerings.find(
            (item) => item.id === row.offeringId,
          );
          return [
            e(lookup(data.classes, row.classId)),
            e(lookup(data.subjects, offering?.subjectId)),
            e(lookup(data.terms, row.termId)),
            e(row.version),
            e(row.status),
            (row.status === "draft" &&
            (admin || workspace.role === "subjectTeacher")
              ? button("Enter scores", `data-result-scores="${e(row.id)}"`)
              : "") +
              (admin && row.status === "draft"
                ? button("Add student", `data-result-student="${e(row.id)}"`)
                : "") +
              action("batches", row),
          ];
        }),
      )}</section>`;
      if (workspace.role !== "subjectTeacher")
        html += `<section class="card"><h2>Student reports</h2>${Table(
          ["Report", "Class", "Term", "Version", "Status", "Actions"],
          data.reports.filter(row=>!path.endsWith('/published')||row.status==='published').map((row) => [
            e(
              row.enrollment?.student
                ? `${row.enrollment.student.first_name} ${row.enrollment.student.last_name} (${row.enrollment.student.admission_number})`
                : "Student report",
            ),
            e(lookup(data.classes, row.classId)),
            e(lookup(data.terms, row.termId)),
            e(row.version),
            e(row.status),
            action("reports", row) +
              (row.status === "published"
                ? button(
                    "View published result",
                    `data-result-preview="${e(row.id)}"`,
                  )
                : button("Review scores", `data-result-review="${e(row.id)}"`)),
          ]),
        )}<p>Publish subject batches before publishing student reports. Published records remain locked.</p></section>`;
    }
    return { html: html + "</section>", data, kind };
  } catch (error) {
    return {
      html: `<section class="card"><h1>Results could not load</h1><p role="alert">${e(error.message)}</p>${button("Try again", "data-result-retry")}</section>`,
      data: null,
      kind,
    };
  }
}

export function bindLiveResults(workspace, page, rerender) {
  const service = createLiveResultService(),
    schoolId = workspace.schoolId;
  document
    .querySelector("[data-result-retry]")
    ?.addEventListener("click", () => rerender());
  if (!page.data) return;
  const data = page.data;
  const message = (text) => {
    document.querySelector("#result-message").textContent = text;
  };
  const run = async (button, action, refresh = true) => {
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    try {
      await action();
      if (refresh) await rerender();
    } catch (error) {
      message(error.message);
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  };
  const dialog = (name, html, save) =>
    Modal(
      name,
      html + '<p data-result-error role="alert"></p>',
      async (form, modal) => {
        const button = modal.querySelector('[type="submit"]');
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        try {
          await save(Object.fromEntries(form));
          modal.close();
          await rerender();
        } catch (error) {
          modal.querySelector("[data-result-error]").textContent =
            error.message;
        } finally {
          button.disabled = false;
          button.removeAttribute("aria-busy");
        }
      },
    );
  async function create(kind, parent, id) {
    const row = id ? data[kind].find((item) => item.id === id) : {};
    let html = "";
    if (["schemes", "scales", "templates"].includes(kind))
      html =
        field("Name", input("name", "text", "", 'required maxlength="100"')) +
        field(
          "Version",
          input("version", "number", 1, 'required min="1" step="1"'),
        );
    if (kind === "components")
      html =
        field(
          "Name",
          input("name", "text", row.name || "", 'required maxlength="100"'),
        ) +
        field(
          "Maximum score",
          input(
            "maxScore",
            "number",
            row.maxScore || "",
            'required min="0.001" step="0.001"',
          ),
        ) +
        field(
          "Weight %",
          input(
            "weight",
            "number",
            row.weight || "",
            'required min="0.001" max="100" step="0.001"',
          ),
        ) +
        field(
          "Order",
          input(
            "sortOrder",
            "number",
            row.sortOrder ?? 0,
            'required min="0" step="1"',
          ),
        );
    if (kind === "bands")
      html =
        field(
          "Minimum inclusive",
          input(
            "minimumScore",
            "number",
            row.minimumScore ?? 0,
            'required min="0" max="100" step="0.001"',
          ),
        ) +
        field(
          "Maximum exclusive (100 inclusive)",
          input(
            "maximumScore",
            "number",
            row.maximumScore ?? 100,
            'required min="0" max="100" step="0.001"',
          ),
        ) +
        field("Grade", input("grade", "text", row.grade || "", "required")) +
        field("Remark", input("remark", "text", row.remark || ""));
    if (kind === "offerings") {
      const [schemes, scales] = await Promise.all([
        service.list("schemes", schoolId),
        service.list("scales", schoolId),
      ]);
      html =
        field("Session", choices("sessionId", data.sessions)) +
        field("Class", choices("classId", data.classes)) +
        field("Subject", choices("subjectId", data.subjects)) +
        field(
          "Active assessments",
          choices(
            "assessmentSchemeId",
            schemes.filter((r) => r.status === "active"),
            (r) => `${r.name} v${r.version}`,
          ),
        ) +
        field(
          "Active grading",
          choices(
            "gradingScaleId",
            scales.filter((r) => r.status === "active"),
            (r) => `${r.name} v${r.version}`,
          ),
        );
    }
    if (kind === "batches")
      html =
        field(
          "Class subject / session",
          choices(
            "offeringId",
            data.offerings,
            (r) =>
              `${lookup(data.classes, r.classId)} / ${lookup(data.subjects, r.subjectId)} / ${lookup(data.sessions, r.sessionId)}`,
          ),
        ) +
        field(
          "Term",
          choices(
            "termId",
            data.terms,
            (r) => `${r.name} / ${lookup(data.sessions, r.sessionId)}`,
          ),
        );
    dialog(
      id ? "Edit draft configuration" : "Create " + kind,
      html,
      async (values) => {
        for (const key of [
          "version",
          "maxScore",
          "weight",
          "sortOrder",
          "minimumScore",
          "maximumScore",
        ])
          if (key in values) values[key] = Number(values[key]);
        if (values.name) values.name = values.name.trim();
        if (kind === "components" && !id) values.schemeId = parent;
        if (kind === "bands" && !id) values.scaleId = parent;
        if (kind === "batches") {
          const offering = data.offerings.find(
            (r) => r.id === values.offeringId,
          );
          if (
            data.terms.find((r) => r.id === values.termId)?.sessionId !==
            offering.sessionId
          )
            throw Error("Choose a term from the selected subject session.");
          Object.assign(values, {
            sessionId: offering.sessionId,
            classId: offering.classId,
            assessmentSchemeId: offering.assessmentSchemeId,
            gradingScaleId: offering.gradingScaleId,
          });
        }
        if (id) await service.editConfiguration(kind, schoolId, id, values);
        else await service.create(kind, schoolId, values);
      },
    );
  }
  document
    .querySelectorAll("[data-result-create]")
    .forEach((b) =>
      b.addEventListener("click", () =>
        run(b, () => create(b.dataset.resultCreate, b.dataset.parent), false),
      ),
    );
  document
    .querySelectorAll("[data-result-edit]")
    .forEach((b) =>
      b.addEventListener("click", () =>
        create(b.dataset.resultEdit, null, b.dataset.id).catch((error) =>
          message(error.message),
        ),
      ),
    );
  document
    .querySelectorAll("[data-result-activate]")
    .forEach((b) =>
      b.addEventListener("click", () =>
        run(b, () =>
          service.activate(b.dataset.resultActivate, schoolId, b.dataset.id),
        ),
      ),
    );
  document
    .querySelectorAll("[data-result-transition]")
    .forEach((b) =>
      b.addEventListener("click", () =>
        run(b, () =>
          service.transition(
            b.dataset.resultTransition,
            b.dataset.id,
            b.dataset.status,
          ),
        ),
      ),
    );
  document.querySelectorAll("[data-result-student]").forEach((b) =>
    b.addEventListener("click", async () => {
      b.disabled = true;
      try {
        const batch = data.batches.find(
          (r) => r.id === b.dataset.resultStudent,
        );
        const [enrollments, students, templates, academics] = await Promise.all(
          ["enrollments", "students", "templates", "academics"].map((k) =>
            service.list(k, schoolId),
          ),
        );
        const eligible = enrollments.filter(
          (r) =>
            r.classId === batch.classId &&
            r.sessionId === batch.sessionId &&
            r.status === "active",
        );
        dialog(
          "Add student to draft batch",
          field(
            "Enrolled student",
            choices("enrollmentId", eligible, (r) => {
              const student = students.find((s) => s.id === r.studentId);
              return student
                ? `${student.admissionNumber} · ${student.firstName} ${student.lastName}`
                : "Student";
            }),
          ) +
            field(
              "Active report template",
              choices(
                "templateId",
                templates.filter((r) => r.status === "active"),
              ),
            ),
          async (values) => {
            let report = data.reports.find(
              (r) =>
                r.enrollmentId === values.enrollmentId &&
                r.termId === batch.termId &&
                r.version === batch.version,
            );
            if (report && report.status !== "draft")
              throw Error(
                "This student report is already submitted or published.",
              );
            if (!report) {
              report = await service.create("reports", schoolId, {
                ...values,
                sessionId: batch.sessionId,
                classId: batch.classId,
                termId: batch.termId,
              });
              data.reports.push({
                ...report,
                enrollmentId: values.enrollmentId,
                termId: batch.termId,
                version: 1,
                status: "draft",
              });
            }
            if (
              !academics.some(
                (r) =>
                  r.studentResultId === report.id && r.batchId === batch.id,
              )
            )
              await service.create("academics", schoolId, {
                studentResultId: report.id,
                batchId: batch.id,
                sessionId: batch.sessionId,
                classId: batch.classId,
                termId: batch.termId,
                assessmentSchemeId: batch.assessmentSchemeId,
              });
          },
        );
      } catch (error) {
        message(error.message);
      } finally {
        b.disabled = false;
      }
    }),
  );
  document.querySelectorAll("[data-result-scores]").forEach((b) =>
    b.addEventListener("click", async () => {
      b.disabled = true;
      try {
        const batch = data.batches.find((r) => r.id === b.dataset.resultScores);
        const [academics, components, enrollments] = await Promise.all([
          service.list("academics", schoolId, { batchId: batch.id }),
          service.list("components", schoolId, {
            schemeId: batch.assessmentSchemeId,
          }),
          service.list("enrollments", schoolId, {
            classId: batch.classId,
            sessionId: batch.sessionId,
          }),
        ]);
        const [scores, students] = await Promise.all([
          service.list("scores", schoolId, {
            academicResultId: academics.map((row) => row.id),
          }),
          service.list("students", schoolId, {
            id: enrollments.map((row) => row.studentId),
          }),
        ]);
        const rows = academics.filter(
          (r) =>
            r.batchId === batch.id &&
            data.reports.find((report) => report.id === r.studentResultId)
              ?.status === "draft",
        );
        const active = components
          .filter((c) => c.schemeId === batch.assessmentSchemeId && c.active)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        if (!rows.length)
          throw Error(
            "The school administrator must add enrolled students to this draft batch first.",
          );
        const html = rows
          .map((row) => {
            const enrollment = enrollments.find(
              (r) =>
                r.id ===
                data.reports.find((r) => r.id === row.studentResultId)
                  ?.enrollmentId,
            );
            const student = students.find(
              (r) => r.id === enrollment?.studentId,
            );
            return `<fieldset><legend>${e(student ? student.firstName + " " + student.lastName : "Student")}</legend>${active.map((c) => field(c.name + " / " + c.maxScore, input(row.id + ":" + c.id, "number", scores.find((s) => s.academicResultId === row.id && s.componentId === c.id)?.score ?? "", `min="0" max="${Number(c.maxScore)}" step="0.001"`))).join("")}</fieldset>`;
          })
          .join("");
        const modal = dialog(
          "Save draft scores",
          "<p>Blank fields keep existing scores. Save drafts before submitting the batch.</p>" +
            html,
          async (values) => {
            try {
              for (const row of rows)
                await service.saveScores(
                  schoolId,
                  row,
                  active,
                  Object.fromEntries(
                    active.map((c) => [c.id, values[row.id + ":" + c.id]]),
                  ),
                  scores,
                );
            } catch (error) {
              throw Error(
                error.message +
                  " Some draft scores may have saved; reopen the batch to check.",
              );
            }
          },
        );
        modal.querySelector('[type="submit"]').textContent = "Save draft";
      } catch (error) {
        message(error.message);
      } finally {
        b.disabled = false;
      }
    }),
  );
  document.querySelectorAll("[data-result-preview]").forEach((b) =>
    b.addEventListener("click", async () => {
      b.disabled = true;
      try {
        const report = await service.publishedReport(b.dataset.resultPreview);
        const modal = Modal(
          "Published result",
          `<p>${e(report.student.first_name)} ${e(report.student.last_name)} · ${e(report.session.name)} · ${e(report.term.name)}</p>${Table(
            ["Subject", "Total", "Grade", "Remark"],
            report.academics.map((r) => [
              e(r.subject.name),
              e(r.calculation.total),
              e(r.calculation.grade),
              e(r.calculation.remark),
            ]),
          )}`,
          async (_, dialog) => dialog.close(),
        );
        modal.querySelector('[type="submit"]').textContent = "Close";
      } catch (error) {
        message(error.message);
      } finally {
        b.disabled = false;
      }
    }),
  );
  document.querySelectorAll("[data-result-review]").forEach((button) =>
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const rows = await service.list("academics", schoolId, {
          studentResultId: button.dataset.resultReview,
        });
        const totals = await Promise.all(
          rows.map((row) => service.calculation(row.id)),
        );
        const html = Table(
          ["Subject", "Total", "Grade", "Complete"],
          rows.map((row, index) => {
            const batch = data.batches.find((item) => item.id === row.batchId);
            const offering = data.offerings.find(
              (item) => item.id === batch?.offeringId,
            );
            const result = totals[index][0];
            return [
              e(lookup(data.subjects, offering?.subjectId)),
              e(result?.total),
              e(result?.grade || "Pending"),
              result?.complete ? "Yes" : "No",
            ];
          }),
        );
        const modal = Modal(
          "Review academic results",
          html,
          async (_, dialog) => dialog.close(),
        );
        modal.querySelector('[type="submit"]').textContent = "Close";
      } catch (error) {
        message(error.message);
      } finally {
        button.disabled = false;
      }
    }),
  );
}
