import { Brand } from "./Brand.js";
import { context } from "../app/context.js";
import { state } from "../app/state.js";
import { roles } from "../utils/constants.js";
import { Icon } from "./Icon.js";
import { escapeHtml, initials } from "../utils/helpers.js";
const schoolNav = [
  ["OVERVIEW", [["Dashboard", "/school/dashboard", "grid"]]],
  [
    "MANAGE SCHOOL",
    [
      ["Students", "/school/students", "users"],
      ["Teachers", "/school/teachers", "users"],
      ["Classes", "/school/classes", "school"],
      ["Subjects", "/school/subjects", "book"],
      ["Academic sessions", "/school/academic-sessions", "calendar"],
      ["Terms", "/school/terms", "calendar"],
    ],
  ],
  [
    "RESULTS & INSIGHTS",
    [
      ["Results", "/school/results", "file"],
      ["Reports", "/school/reports", "chart"],
      ["Imports", "/school/students/import", "upload"],
    ],
  ],
  ["WORKSPACE", [["Settings", "/school/settings", "settings"]]],
];
const platformNav = [
  [
    "PLATFORM",
    [
      ["Overview", "/platform", "grid"],
      ["Schools", "/platform/schools", "school"],
      ["Subscriptions", "/platform/subscriptions", "file"],
      ["Users", "/platform/users", "users"],
      ["Reports", "/platform/reports", "chart"],
      ["Settings", "/platform/settings", "settings"],
    ],
  ],
];
const teacherNav = [
  [
    "TEACHING",
    [
      ["Dashboard", "/teacher/dashboard", "grid"],
      ["My classes", "/teacher/classes", "school"],
      ["My subjects", "/teacher/subjects", "book"],
      ["Results", "/teacher/results", "file"],
      ["Enter scores", "/teacher/results/entry", "plus"],
      ["Submitted results", "/teacher/results/submitted", "check"],
    ],
  ],
];
const classNav = [
  [
    "MY CLASS",
    [
      ["Dashboard", "/class-teacher/dashboard", "grid"],
      ["Assigned class", "/class-teacher/class", "school"],
      ["Students", "/class-teacher/students", "users"],
      ["Result review", "/class-teacher/results", "file"],
      ["Teacher comments", "/class-teacher/comments", "book"],
    ],
  ],
];
export function Sidebar(scope, path) {
  const pending = state.results.filter(
    (r) =>
      r.schoolId === context.school.id &&
      ["Submitted", "Under Review"].includes(r.status),
  ).length;
  const groups =
    scope === "platform"
      ? platformNav
      : scope === "teacher"
        ? teacherNav
        : scope === "class-teacher"
          ? classNav
          : schoolNav;
  const active = (href) =>
    path === href ||
    (href === "/school/results" && path.startsWith(href)) ||
    (href === "/school/settings" && path.startsWith(href)) ||
    (href === "/school/students" &&
      path.startsWith(href) &&
      !path.endsWith("/import"));
  return `<aside class="sidebar" id="workspace-navigation">${Brand()}<div class="school-switch"><span class="school-monogram">${scope === "platform" ? "EA" : initials(context.school.name)}</span><div><strong>${scope === "platform" ? "ÈsìAyọ̀ platform" : escapeHtml(context.school.name)}</strong><span>${scope === "platform" ? "Platform administrator" : "School workspace"}</span></div>${Icon("chevron")}</div><nav aria-label="Main navigation">${groups.map(([label, links]) => `<div class="nav-group"><p>${label}</p>${links.map(([title, href, icon]) => `<a href="${href}" data-link class="nav-item ${active(href) ? "active" : ""}">${Icon(icon)}<span>${title}</span>${title === "Results" ? `<small>${pending}</small>` : ""}</a>`).join("")}</div>`).join("")}</nav><div class="sidebar-bottom"><div class="help-card">${Icon("spark")}<strong>A little help goes a long way.</strong><p>Explore your demo workspace.</p><button data-action="help">Getting started ${Icon("arrow")}</button></div><label class="role-label" for="role-switch">PREVIEW AS</label><select id="role-switch">${Object.entries(
    roles,
  )
    .map(
      ([key, label]) =>
        `<option value="${key}" ${context.role === key ? "selected" : ""}>${label}</option>`,
    )
    .join(
      "",
    )}</select><a href="/login" data-link class="sidebar-user"><span class="avatar">${initials(context.user.name)}</span><span><strong>${escapeHtml(context.user.name)}</strong><small>${roles[context.role]}</small></span>${Icon("logout")}</a></div></aside>`;
}
