import { liveResultKind } from "../utils/liveResultRoutes.js";
import {
  LiveAcademic,
  bindLiveAcademic,
  academicKind,
} from "../pages/school/LiveAcademic.js";
import { productName } from "../components/Brand.js";
import { Navbar, bindPublicNavigation } from "../components/Navbar.js";
import { bindAccountModals } from "../components/AccountModals.js";
import { identity, refreshIdentity, clearIdentity } from "./auth.js";
import { roleWorkspaces, canAccessScope } from "./access.js";
import { authService } from "../services/authService.js";
import {
  Authentication,
  WorkspacePicker,
  LiveWorkspace,
  bindAuthentication,
} from "../pages/public/Authentication.js";
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
    if (
      route.kind === "login" ||
      route.kind === "workspaces" ||
      route.scope !== "public"
    ) {
      if (!identity.user || !app.querySelector(".live-workspace"))
        app.innerHTML = LoadingState();
      else {
        app.setAttribute("aria-busy", "true");
        app.querySelector(".route-progress")?.remove();
        app.insertAdjacentHTML(
          "beforeend",
          '<div class="route-progress" role="status">Loading page...</div>',
        );
      }
      await refreshIdentity();
      if (version !== renderVersion) return;
      if (route.scope !== "public" && !identity.user && !identity.error) {
        history.replaceState({}, "", "/login");
        return renderApp();
      }
      if (
        route.scope !== "public" &&
        identity.active &&
        !canAccessScope(identity.active, route.scope)
      ) {
        history.replaceState({}, "", roleWorkspaces[identity.active.role].home);
        return renderApp();
      }
      const academicPage =
        identity.active?.role === "schoolAdmin" &&
        academicKind(location.pathname)
          ? await LiveAcademic(identity.active, location.pathname)
          : null;
      const resultsModule =
        identity.active &&
        liveResultKind(location.pathname, identity.active.role)
          ? await import("../pages/results/LiveResults.js")
          : null;
      const resultPage = resultsModule
        ? await resultsModule.LiveResults(identity.active, location.pathname)
        : null;
      const workspaceContent =
        identity.requiresPasswordChange || identity.error || !identity.user
          ? Authentication()
          : route.scope !== "public" && identity.active
            ? resultPage
              ? resultPage.html
              : academicPage
                ? `<section class="live-workspace"><div class="page-heading"><h1>${{ sessions: "Academic sessions", terms: "Terms", classes: "Classes", subjects: "Subjects", students: "Students", profile: "Student profile" }[academicKind(location.pathname)]}</h1></div>${academicPage.html}</section>`
                : await LiveWorkspace(location.pathname)
            : WorkspacePicker();
      if (version !== renderVersion) return;
      const live = {
        workspace: identity.active,
        user: identity.user,
        workspaces: identity.workspaces,
      };
      app.innerHTML =
        route.scope !== "public" && identity.active && !identity.error
          ? route.scope === "platform"
            ? PlatformLayout(workspaceContent, location.pathname, live)
            : SchoolLayout(
                workspaceContent,
                location.pathname,
                route.scope,
                live,
              )
          : PublicLayout(workspaceContent);
      document.title = `Your workspace · ${productName}`;
      bindAuthentication(navigate, renderApp);
      if (resultPage)
        resultsModule.bindLiveResults(identity.active, resultPage, renderApp);
      if (academicPage)
        bindLiveAcademic(identity.active, academicPage.data, renderApp);
      document
        .querySelector('[data-action="menu"]')
        ?.addEventListener("click", (event) => {
          const sidebar = document.querySelector(".sidebar");
          sidebar.classList.toggle("open");
          event.currentTarget.setAttribute(
            "aria-expanded",
            String(sidebar.classList.contains("open")),
          );
        });
      document
        .querySelector(".live-sidebar-close")
        ?.addEventListener("click", closeLiveNavigation);
      return;
    }
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
    if (route.scope === "public") bindPublic(route.kind);
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
  } finally {
    if (version === renderVersion) {
      app.removeAttribute("aria-busy");
      app.querySelector(".route-progress")?.remove();
    }
  }
}
export function startApp() {
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLiveNavigation();
  });
  bindPublicNavigation();
  bindAccountModals(navigate);
  document.querySelector("#app").innerHTML = LoadingState();
  try {
    authService.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        clearIdentity();
        setTimeout(() => renderApp(), 0);
      }
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED")
        setTimeout(() => renderApp(), 0);
    });
  } catch {
    /* The login page explains unavailable configuration. */
  }
  startRouter(renderApp);
  refreshIdentity().then(() => {
    if (matchRoute(location.pathname)?.scope === "public") {
      const navbar = document.querySelector(".public-nav");
      if (navbar) navbar.outerHTML = Navbar();
    }
  });
}

function closeLiveNavigation() {
  const sidebar = document.querySelector(".live-sidebar.open");
  if (!sidebar) return;
  sidebar.classList.remove("open");
  const toggle = document.querySelector('[data-action="menu"]');
  toggle?.setAttribute("aria-expanded", "false");
  toggle?.focus();
}
