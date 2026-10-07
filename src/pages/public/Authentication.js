import { ChangePassword, bindChangePassword } from "./ChangePassword.js";
import {
  identity,
  refreshIdentity,
  chooseWorkspace,
  clearIdentity,
} from "../../app/auth.js";
import { roleWorkspaces, workspaceKey } from "../../app/access.js";
import { authService } from "../../services/authService.js";
import { escapeHtml } from "../../utils/helpers.js";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import {
  WorkspaceAccess,
  bindWorkspaceAccess,
} from "../shared/WorkspaceAccess.js";
import { workspaceService } from "../../services/workspaceService.js";

export function Authentication() {
  if (identity.requiresPasswordChange) return ChangePassword();
  if (identity.error)
    return `<section class="public-intro"><h1>Access could not be verified</h1><p role="alert">${escapeHtml(identity.error)}</p><button class="button primary" id="auth-retry">Try again</button><button class="button secondary" id="auth-logout">Sign out</button></section>`;
  if (identity.user) return WorkspacePicker();
  return `<div class="public-form-layout"><div><span class="eyebrow">WELCOME BACK</span><h1>Sign in to your workspace.</h1><p>Use the email and password provided for your account. Your assigned school and role determine your access.</p></div><section class="card public-form"><form id="auth-login"><h2>Sign in</h2><div class="field"><label for="login-email">Email address</label><input id="login-email" type="email" name="email" required autocomplete="username"></div><div class="field"><label for="login-password">Password</label><div class="password-control"><input id="login-password" type="password" name="password" required autocomplete="current-password"><button id="password-toggle" class="password-toggle" type="button" aria-label="Show password" aria-controls="login-password" aria-pressed="false">${Icon("eye")}</button></div></div><p id="auth-message" role="alert" aria-live="polite"></p>${Button("Sign in", { type: "submit" })}<p class="helper-text">Need an account or a password reset? Contact your school administrator.</p></form></section></div>`;
}
export function WorkspacePicker() {
  return `<section class="public-intro"><h1>${identity.workspaces.length ? "Choose your workspace" : "No active workspace assigned"}</h1><p>Signed in as ${escapeHtml(identity.user.email)}.</p>${identity.workspaces.length ? `<div class="public-features">${identity.workspaces.map((workspace) => `<button class="button secondary" data-workspace="${escapeHtml(workspaceKey(workspace))}">${escapeHtml(workspace.school?.name || "ÈsìAyọ̀ platform")} · ${escapeHtml(roleWorkspaces[workspace.role].label)}</button>`).join("")}</div>` : "<p>Your administrator needs to assign an active school membership or platform permission. You cannot choose an unassigned role.</p>"}${identity.onboardingError ? `<p role="alert">${escapeHtml(identity.onboardingError)}</p><form id="school-onboarding-retry" class="card"><h2>Complete school registration</h2><label class="field">School name<input name="school" required maxlength="200" value="${escapeHtml(identity.user.user_metadata?.onboarding_school_name)}"></label><label class="field">School workspace address<input name="slug" required minlength="2" maxlength="63" pattern="[a-z0-9]+(-[a-z0-9]+)*" value="${escapeHtml(identity.user.user_metadata?.onboarding_school_slug)}"></label><button class="button primary" type="submit">Create my school workspace</button></form>` : ""}<button class="button secondary" id="auth-logout">Sign out</button><p id="auth-message" role="alert"></p></section>`;
}
export async function LiveWorkspace(path = location.pathname) {
  const workspace = identity.active;
  const role = roleWorkspaces[workspace.role];
  const home =
    path === role.home ||
    (workspace.role === "schoolAdmin" && path === "/school");
  const titles = {
    schools: "Schools",
    subscriptions: "Subscriptions",
    users: "Users",
    reports: "Reports",
    settings: "Settings",
    teachers: "Teachers",
    classes: "Classes",
    subjects: "Subjects",
    students: "Students",
    results: "Results",
    entry: "Enter scores",
    submitted: "Submitted results",
    comments: "Teacher comments",
    class: "Assigned class",
    terms: "Terms",
    "academic-sessions": "Academic sessions",
    import: "Import students",
  };
  const segment = path.split("/").filter(Boolean).at(-1);
  const title = home
    ? workspace.role === "superAdmin"
      ? "Platform dashboard"
      : workspace.school?.name || "Your dashboard"
    : titles[segment] || "Workspace";
  const connected =
    home ||
    (workspace.role === "superAdmin"
      ? path === "/platform/schools"
      : workspace.role === "schoolAdmin"
        ? ["/school/classes", "/school/subjects", "/school/teachers"].includes(
            path,
          )
        : [
            "/teacher/classes",
            "/teacher/subjects",
            "/class-teacher/class",
          ].includes(path));
  const access = connected
    ? await WorkspaceAccess(workspace)
    : `<section class="card live-unavailable"><h2>${escapeHtml(title)} is not connected yet</h2><p>Your workspace access is active. This section will become available when its live data service is connected.</p>${Button("Back to dashboard", { href: role.home, variant: "secondary" })}</section>`;
  return `<section class="live-workspace"><div class="page-heading"><div><span class="eyebrow">${escapeHtml(role.label)}</span><h1>${escapeHtml(title)}</h1><p>Welcome, ${escapeHtml(identity.user.user_metadata?.display_name || identity.user.email)}.</p></div></div>${access || '<section class="card live-unavailable"><h2>Your workspace is connected</h2><p>Your account is active. Academic records will appear here as their live services are connected.</p></section>'}<p id="auth-message" role="alert"></p></section>`;
}
export function bindAuthentication(navigate, rerender, root = document) {
  if (identity.requiresPasswordChange) bindChangePassword(navigate);
  if (identity.active) bindWorkspaceAccess(identity.active, rerender);
  root
    .querySelector("#school-onboarding-retry")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget,
        button = form.querySelector("button"),
        data = new FormData(form);
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      try {
        await workspaceService.registerSchool(
          String(data.get("school")).trim(),
          String(data.get("slug")).trim(),
        );
        await refreshIdentity();
        navigate(
          identity.active
            ? roleWorkspaces[identity.active.role].home
            : "/workspaces",
        );
      } catch (error) {
        root.querySelector("#auth-message").textContent = error.message;
      } finally {
        button.disabled = false;
        button.removeAttribute("aria-busy");
      }
    });
  root.querySelector("#password-toggle")?.addEventListener("click", (event) => {
    const button = event.currentTarget;
    const input = root.querySelector("#login-password");
    const visible = input.type === "password";
    input.type = visible ? "text" : "password";
    button.setAttribute(
      "aria-label",
      visible ? "Hide password" : "Show password",
    );
    button.setAttribute("aria-pressed", String(visible));
    button.innerHTML = Icon(visible ? "eyeOff" : "eye");
  });
  const message = (value) => {
    const target = root.querySelector("#auth-message");
    if (target) target.textContent = value;
  };
  root
    .querySelector("#auth-login")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('[type="submit"]');
      const data = new FormData(form);
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      message("Signing in…");
      try {
        await authService.signIn(
          String(data.get("email")).trim(),
          String(data.get("password")),
        );
        form.reset();
        await refreshIdentity();
        navigate(
          identity.active
            ? roleWorkspaces[identity.active.role].home
            : "/workspaces",
        );
      } catch {
        message(
          "Sign-in failed. Check your email and password, confirm your email if required, and try again.",
        );
      } finally {
        button.disabled = false;
        button.removeAttribute("aria-busy");
      }
    });
  root.querySelectorAll("[data-workspace]").forEach((button) =>
    button.addEventListener("click", async () => {
      const key = button.dataset.workspace;
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      await refreshIdentity();
      try {
        const workspace = chooseWorkspace(key);
        navigate(roleWorkspaces[workspace.role].home);
      } catch {
        message(
          "That workspace is no longer available. Refresh and contact your administrator.",
        );
        button.disabled = false;
        button.removeAttribute("aria-busy");
      }
    }),
  );
  root
    .querySelector("#auth-retry")
    ?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      await refreshIdentity();
      rerender();
      button.disabled = false;
      button.removeAttribute("aria-busy");
    });
  root
    .querySelector("#auth-logout")
    ?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      clearIdentity();
      try {
        await authService.signOut();
        navigate("/login");
      } catch {
        message("Sign-out could not be completed. Please retry.");
      } finally {
        button.disabled = false;
        button.removeAttribute("aria-busy");
      }
    });
}
