import { productName } from "../components/Brand.js";
import { context, setRole } from "./context.js";
import { startRouter, matchRoute, navigate } from "./router.js";
import { SchoolLayout } from "../layouts/SchoolLayout.js";
import { PlatformLayout } from "../layouts/PlatformLayout.js";
import { PublicLayout } from "../layouts/PublicLayout.js";
import { bindStudents } from "../pages/school/Students.js";
import { bindImport } from "../pages/school/Import.js";
import { bindResultEntry } from "../pages/results/ResultEntry.js";
import { bindResultReview } from "../pages/results/ResultReview.js";
import { bindReports } from "../pages/school/Reports.js";
import { bindSettings } from "../pages/school/Settings.js";
import { bindComments } from "../pages/teachers/Dashboard.js";
import { bindPlatform } from "../pages/platform/Platform.js";
import { bindPublic } from "../pages/public/Public.js";
import { EmptyState } from "../components/EmptyState.js";
import { LoadingState } from "../components/LoadingState.js";
import { Button } from "../components/Button.js";
import { toast } from "../components/Toast.js";
import {
  studentForm,
  teacherForm,
  assignmentForm,
  structureForm,
} from "./forms.js";
const roleHome = {
  superAdmin: "/platform",
  schoolAdmin: "/school/dashboard",
  subjectTeacher: "/teacher/dashboard",
  classTeacher: "/class-teacher/dashboard",
};
let renderVersion = 0;
export async function renderApp({ focus } = {}) {
  const version = ++renderVersion,
    app = document.querySelector("#app"),
    route = matchRoute(location.pathname);
  const position = focus
    ? document.getElementById(focus)?.selectionStart
    : null;
  try {
    if (!route) {
      app.innerHTML = PublicLayout(
        EmptyState(
          "This page has not been found",
          "Let’s take you back to familiar ground.",
          Button("Open school workspace", { href: "/school/dashboard" }),
        ),
      );
      return;
    }
    const expectedRole = {
      platform: "superAdmin",
      school: "schoolAdmin",
      teacher: "subjectTeacher",
      "class-teacher": "classTeacher",
    }[route.scope];
    if (expectedRole && context.role !== expectedRole) setRole(expectedRole);
    const content = await route.render(route.params);
    if (version !== renderVersion) return;
    app.innerHTML =
      route.scope === "public"
        ? PublicLayout(content)
        : route.scope === "platform"
          ? PlatformLayout(content, location.pathname)
          : SchoolLayout(content, location.pathname, route.scope);
    document.title = `${document.querySelector("h1")?.textContent || "Workspace"} · ${productName}`;
    if (location.hash) {
      const anchor = document.getElementById(
        decodeURIComponent(location.hash.slice(1)),
      );
      if (anchor)
        requestAnimationFrame(() => anchor.scrollIntoView({ block: "start" }));
    }
    if (focus) {
      const input = document.getElementById(focus);
      input?.focus();
      if (input?.type === "search" && position !== null)
        input.setSelectionRange(position, position);
    }
    const rerender = (opts) => renderApp(opts);
    if (route.kind === "students") bindStudents(rerender);
    if (route.kind === "import") bindImport(rerender);
    if (route.kind === "entry") bindResultEntry(rerender);
    if (route.kind === "review") bindResultReview(rerender);
    if (["reports", "report-student", "broadsheet"].includes(route.kind))
      bindReports(route.kind === "broadsheet" ? "broadsheet" : route.kind);
    if (route.kind === "settings") bindSettings(rerender);
    if (route.kind === "comments") bindComments();
    if (route.scope === "platform") bindPlatform(route.params.id, rerender);
    if (route.scope === "public") bindPublic(route.kind, navigate, setRole);
    document.querySelector("#role-switch")?.addEventListener("change", (e) => {
      setRole(e.target.value);
      navigate(roleHome[e.target.value]);
    });
    document
      .querySelectorAll("[data-assign]")
      .forEach(
        (b) => (b.onclick = () => assignmentForm(b.dataset.assign, rerender)),
      );
    document.querySelectorAll("[data-action]").forEach((button) =>
      button.addEventListener("click", () => {
        const action = button.dataset.action;
        if (action === "add-student") studentForm(rerender);
        if (action === "edit-student") studentForm(rerender, route.params.id);
        if (action === "add-teacher") teacherForm(rerender);
        if (
          ["add-class", "add-subject", "add-session", "add-term"].includes(
            action,
          )
        )
          structureForm(action.slice(4), rerender);
        if (action === "menu") {
          const sidebar = document.querySelector(".sidebar");
          sidebar.classList.toggle("open");
          button.setAttribute(
            "aria-expanded",
            sidebar.classList.contains("open"),
          );
        }
        if (action === "help")
          toast(
            "Start with students and classes, enter scores, then review results. Switch roles to explore each workspace.",
          );
        if (action === "notifications") navigate("/school/results/review");
        if (action === "print") window.print();
      }),
    );
  } catch (error) {
    console.error(error);
    if (version !== renderVersion) return;
    app.innerHTML = PublicLayout(
      EmptyState(
        "Unable to load this view",
        "Please refresh the prototype and try again.",
        Button("Go to home", { href: "/" }),
      ),
    );
  }
}
export function startApp() {
  document.querySelector("#app").innerHTML = LoadingState();
  startRouter(renderApp);
}
