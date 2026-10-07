import { Dashboard } from "../pages/school/Dashboard.js";
import { Students, StudentProfile } from "../pages/school/Students.js";
import {
  Teachers,
  Classes,
  ClassProfile,
  Subjects,
  Academic,
} from "../pages/school/Management.js";
import { Import } from "../pages/school/Import.js";
import { ResultEntry } from "../pages/results/ResultEntry.js";
import { ResultReview } from "../pages/results/ResultReview.js";
import { Reports } from "../pages/school/Reports.js";
import { Settings } from "../pages/school/Settings.js";
import { TeacherDashboard, Comments } from "../pages/teachers/Dashboard.js";
import { Platform } from "../pages/platform/Platform.js";
import { Public } from "../pages/public/Public.js";
const route = (path, scope, render, kind = "") => ({
  path,
  scope,
  render,
  kind,
});
export const routes = [
  route("/workspaces", "public", () => "", "workspaces"),
  route("/student/dashboard", "student", () => ""),
  route("/parent/dashboard", "parent", () => ""),
  ...[
    ["/", "home"],
    ["/about", "about"],
    ["/pricing", "pricing"],
    ["/contact", "contact"],
    ["/login", "login"],
    ["/register-school", "register-school"],
  ].map(([path, kind]) => route(path, "public", () => Public(kind), kind)),
  route("/platform", "platform", () => Platform()),
  route(
    "/platform/schools/:id",
    "platform",
    (p) => Platform("school", p.id),
    "platform-school",
  ),
  ...["schools", "subscriptions", "users", "reports", "settings"].map((kind) =>
    route(`/platform/${kind}`, "platform", () => Platform(kind)),
  ),
  route("/school", "school", Dashboard),
  route("/school/dashboard", "school", Dashboard),
  route("/school/students/import", "school", Import, "import"),
  route(
    "/school/students/:id",
    "school",
    (p) => StudentProfile(p.id),
    "student-profile",
  ),
  route("/school/students", "school", () => Students(), "students"),
  route("/school/classes/:id", "school", (p) => ClassProfile(p.id)),
  route("/school/classes", "school", () => Classes()),
  route("/school/subjects", "school", () => Subjects()),
  route("/school/teachers", "school", Teachers, "teachers"),
  route("/school/academic-sessions", "school", () => Academic("sessions")),
  route("/school/terms", "school", () => Academic("terms")),
  route("/school/results", "school", () => ResultReview(), "review"),
  route("/school/results/entry", "school", () => ResultEntry(), "entry"),
  route(
    "/school/results/review",
    "school",
    () => ResultReview("review"),
    "review",
  ),
  route(
    "/school/results/published",
    "school",
    () => ResultReview("published"),
    "review",
  ),
  route("/school/reports", "school", () => Reports(), "reports"),
  route(
    "/school/reports/student",
    "school",
    () => Reports("student"),
    "report-student",
  ),
  route(
    "/school/reports/broadsheet",
    "school",
    () => Reports("broadsheet"),
    "broadsheet",
  ),
  route("/school/settings", "school", () => Settings(), "settings"),
  ...["profile", "academic", "grading", "templates", "subscription"].map(
    (kind) =>
      route(
        `/school/settings/${kind}`,
        "school",
        () => Settings(kind),
        "settings",
      ),
  ),
  route("/teacher", "teacher", () => TeacherDashboard()),
  route("/teacher/dashboard", "teacher", () => TeacherDashboard()),
  route("/teacher/classes", "teacher", () => Classes(true)),
  route("/teacher/subjects", "teacher", () => Subjects(true)),
  route("/teacher/results", "teacher", () => ResultReview("teacher"), "review"),
  route("/teacher/results/entry", "teacher", () => ResultEntry(true), "entry"),
  route(
    "/teacher/results/submitted",
    "teacher",
    () => ResultReview("submitted"),
    "review",
  ),
  route("/class-teacher", "class-teacher", () => TeacherDashboard(true)),
  route("/class-teacher/dashboard", "class-teacher", () =>
    TeacherDashboard(true),
  ),
  route("/class-teacher/class", "class-teacher", () => Classes(true)),
  route(
    "/class-teacher/students",
    "class-teacher",
    () => Students(true),
    "students",
  ),
  route(
    "/class-teacher/results",
    "class-teacher",
    () => ResultReview("class"),
    "review",
  ),
  route("/class-teacher/comments", "class-teacher", Comments, "comments"),
];
export function matchRoute(pathname) {
  const path = pathname.replace(/\/$/, "") || "/";
  for (const item of routes) {
    const names = [];
    const pattern = item.path.replace(/:([a-z]+)/g, (_, name) => {
      names.push(name);
      return "([^/]+)";
    });
    const match = path.match(new RegExp(`^${pattern}$`));
    if (match)
      return {
        ...item,
        params: Object.fromEntries(
          names.map((name, i) => [name, decodeURIComponent(match[i + 1])]),
        ),
      };
  }
  return null;
}
let onNavigate;
export function navigate(path) {
  history.pushState({}, "", path);
  Promise.resolve(onNavigate?.()).then(() => {
    const target = location.hash ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
    if (target) target.scrollIntoView({ behavior: "instant" });
    else window.scrollTo({ top: 0, behavior: "instant" });
  });
}
export function startRouter(render) {
  onNavigate = render;
  window.addEventListener("popstate", render);
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-link]");
    if (
      !link ||
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    )
      return;
    e.preventDefault();
    navigate(link.getAttribute("href"));
  });
  render();
}
