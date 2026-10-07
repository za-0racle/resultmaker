import {
  pageHeader,
  filters,
  schoolRows,
  className,
  subjectName,
} from "../shared.js";
import { ReportPreview } from "../results/ReportPreview.js";
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { Table } from "../../components/Table.js";
import { Icon } from "../../components/Icon.js";
import { escapeHtml } from "../../utils/helpers.js";
const types = [
  [
    "Individual student result",
    "A clear view of one student’s term.",
    "/school/reports/student",
    "file",
  ],
  [
    "Class broadsheet",
    "Bring every student’s results together.",
    "/school/reports/broadsheet",
    "grid",
  ],
  [
    "Subject performance",
    "Explore strengths across your curriculum.",
    "/school/reports?view=subject",
    "book",
  ],
  [
    "Class performance",
    "Compare progress within your classes.",
    "/school/reports?view=class",
    "school",
  ],
  [
    "Result statistics",
    "See the bigger academic picture.",
    "/school/reports?view=statistics",
    "chart",
  ],
];
export function Reports(kind = "overview") {
  const query = new URLSearchParams(location.search),
    view = query.get("view");
  if (kind === "student")
    return `${pageHeader("Student report preview", "A replaceable report component for the final design.", Button("Print preview", { action: "print", variant: "secondary", icon: "download" }), "Reports")}${Card(
      `<div class="filter-bar"><label class="field"><span>Student</span><select id="report-student">${schoolRows(
        "students",
      )
        .map(
          (s) =>
            `<option value="${s.id}" ${s.id === query.get("student") ? "selected" : ""}>${escapeHtml(s.name)}</option>`,
        )
        .join("")}</select></label></div>`,
    )}${ReportPreview(query.get("student"))}`;
  if (kind === "broadsheet")
    return `${pageHeader("Class broadsheet", "Prototype overview. Aggregation uses locally saved result records.", Button("Back to reports", { href: "/school/reports", variant: "secondary" }), "Reports")}${Card(`${filters(true)}<div id="report-output"></div>`)}`;
  return `${pageHeader("Reports & insights", "Turn academic records into meaningful perspective.", "", "Results & insights")}${Card(filters(true))}<div class="report-type-grid">${types.map(([title, desc, href, icon]) => `<a href="${href}" data-link class="card report-type"><span class="stat-icon mint">${Icon(icon)}</span><h2>${title}</h2><p>${desc}</p><span class="text-link">Explore report ${Icon("arrow")}</span></a>`).join("")}</div>${view ? Card(`<div class="card-header"><h2>${view === "subject" ? "Subject performance" : view === "class" ? "Class performance" : "Result statistics"}</h2><span class="environment-tag">Mock data</span></div><div id="report-output"></div>`) : ""}`;
}
export function bindReports(kind) {
  document.querySelector("#report-student")?.addEventListener("change", (e) => {
    history.replaceState(
      {},
      "",
      `/school/reports/student?student=${e.target.value}`,
    );
    document.querySelector(".report-card").outerHTML = ReportPreview(
      e.target.value,
    );
  });
  const output = document.querySelector("#report-output");
  if (!output) return;
  const update = () => {
    const values = Object.fromEntries(
      [...document.querySelectorAll(".filter-bar select")].map((s) => [
        s.name,
        s.value,
      ]),
    );
    const results = schoolRows("results").filter(
      (r) =>
        (!values.classId || r.classId === values.classId) &&
        (!values.subjectId || r.subjectId === values.subjectId) &&
        (!values.termId || r.termId === values.termId) &&
        (!values.sessionId || r.sessionId === values.sessionId) &&
        (!values.section ||
          schoolRows("classes").find((c) => c.id === r.classId)?.section ===
            values.section),
    );
    if (kind === "broadsheet") {
      const students = schoolRows("students").filter(
        (s) =>
          (!values.classId || s.classId === values.classId) &&
          (!values.section ||
            schoolRows("classes").find((c) => c.id === s.classId)?.section ===
              values.section),
      );
      output.innerHTML = Table(
        ["Student", "Class", "Subject batches", "Average saved score"],
        students.map((s) => {
          const scored = results.filter(
            (r) => r.classId === s.classId && r.scores[s.id],
          );
          const totals = scored.map((r) =>
            Object.values(r.scores[s.id]).reduce(
              (a, v) => a + Number(v || 0),
              0,
            ),
          );
          return [
            escapeHtml(s.name),
            className(s.classId),
            scored.length,
            totals.length
              ? Math.round(totals.reduce((a, v) => a + v, 0) / totals.length)
              : "—",
          ];
        }),
      );
    } else
      output.innerHTML = Table(
        ["Subject", "Class", "Status", "Completion"],
        results.map((r) => [
          subjectName(r.subjectId),
          className(r.classId),
          escapeHtml(r.status),
          `${r.completion}%`,
        ]),
      );
  };
  document
    .querySelectorAll(".filter-bar select")
    .forEach((s) => s.addEventListener("change", update));
  update();
}
