// Local browser verification only. This module is never imported by the production app.
import { matchRoute, startRouter } from "/src/app/router.js";
import { setRole } from "/src/app/context.js";
import { SchoolLayout } from "/src/layouts/SchoolLayout.js";
import { PlatformLayout } from "/src/layouts/PlatformLayout.js";
import { PublicLayout } from "/src/layouts/PublicLayout.js";
import { bindStudents } from "/src/pages/school/Students.js";
import { bindImport } from "/src/pages/school/Import.js";
import { bindResultEntry } from "/src/pages/results/ResultEntry.js";
import { bindResultReview } from "/src/pages/results/ResultReview.js";
import { bindReports } from "/src/pages/school/Reports.js";
import { bindSettings } from "/src/pages/school/Settings.js";
import { bindComments } from "/src/pages/teachers/Dashboard.js";
import { bindPlatform } from "/src/pages/platform/Platform.js";
import {
  studentForm,
  teacherForm,
  assignmentForm,
  structureForm,
} from "/src/app/forms.js";
let version = 0;
window.previewRender = async (path) => {
  history.replaceState({}, "", path);
  const current = ++version;
  const route = matchRoute(location.pathname);
  if (!route) return;
  const role = {
    school: "schoolAdmin",
    teacher: "subjectTeacher",
    "class-teacher": "classTeacher",
    platform: "superAdmin",
  }[route.scope];
  if (role) setRole(role);
  const content = await route.render(route.params);
  if (version !== current) return;
  document.querySelector("#app").innerHTML =
    route.scope === "public"
      ? PublicLayout(content)
      : route.scope === "platform"
        ? PlatformLayout(content, location.pathname)
        : SchoolLayout(content, location.pathname, route.scope);
  const render = () =>
    window.previewRender(location.pathname + location.search);
  if (route.kind === "students") bindStudents(render);
  if (route.kind === "import") bindImport(render);
  if (route.kind === "entry") bindResultEntry(render);
  if (route.kind === "review") bindResultReview(render);
  if (["reports", "report-student", "broadsheet"].includes(route.kind))
    bindReports(route.kind === "broadsheet" ? "broadsheet" : route.kind);
  if (route.kind === "settings") bindSettings(render);
  if (route.kind === "comments") bindComments();
  if (route.scope === "platform") bindPlatform(route.params.id, render);
  document
    .querySelectorAll("[data-assign]")
    .forEach(
      (b) => (b.onclick = () => assignmentForm(b.dataset.assign, render)),
    );
  document.querySelectorAll("[data-action]").forEach((b) =>
    b.addEventListener("click", () => {
      const action = b.dataset.action;
      if (action === "add-student") studentForm(render);
      if (action === "edit-student") studentForm(render, route.params.id);
      if (action === "add-teacher") teacherForm(render);
      if (
        ["add-class", "add-subject", "add-session", "add-term"].includes(action)
      )
        structureForm(action.slice(4), render);
      if (action === "menu")
        document.querySelector(".sidebar").classList.toggle("open");
    }),
  );
};
startRouter(() => window.previewRender(location.pathname + location.search));
