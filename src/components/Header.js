import { Button } from "./Button.js";
import { Icon } from "./Icon.js";
import { context } from "../app/context.js";
import { escapeHtml, initials } from "../utils/helpers.js";
import { roleWorkspaces } from "../app/access.js";
export function Header(scope, live = null) {
  if (live) {
    const name = live.user.user_metadata?.display_name || live.user.email;
    return `<header class="topbar"><div class="topbar-left"><button class="icon-button mobile-menu" data-action="menu" aria-label="Toggle navigation" aria-controls="workspace-navigation" aria-expanded="false">${Icon("menu")}</button><span class="workspace-label">${escapeHtml(live.workspace.school?.name || "ÈsìAyọ̀ platform")}</span><span class="environment-tag">${escapeHtml(roleWorkspaces[live.workspace.role].label)}</span></div><div class="topbar-right"><span class="account-name">${escapeHtml(name)}</span><span class="avatar teal">${escapeHtml(initials(name))}</span></div></header>`;
  }
  return `<header class="topbar"><div class="topbar-left"><button class="icon-button mobile-menu" data-action="menu" aria-label="Toggle navigation" aria-controls="workspace-navigation" aria-expanded="false">${Icon("menu")}</button><span class="workspace-label">${scope === "platform" ? "Platform workspace" : escapeHtml(context.school.name)}</span><span class="environment-tag">Demo workspace</span></div><div class="topbar-right"><a href="/school/academic-sessions" data-link class="session-chip">${Icon("calendar")}<span>${escapeHtml(context.academicSession.name)}<b> · ${escapeHtml(context.term.name)}</b></span></a><button class="notification icon-button" data-action="notifications" aria-label="Recent activity">${Icon("bell")}<i></i></button><span class="avatar teal">${initials(context.user.name)}</span></div></header>`;
}
