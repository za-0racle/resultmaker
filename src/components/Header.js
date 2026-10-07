import { Button } from "./Button.js";
import { Icon } from "./Icon.js";
import { context } from "../app/context.js";
import { escapeHtml, initials } from "../utils/helpers.js";
export function Header(scope) {
  return `<header class="topbar"><div class="topbar-left"><button class="icon-button mobile-menu" data-action="menu" aria-label="Toggle navigation" aria-controls="workspace-navigation" aria-expanded="false">${Icon("menu")}</button><span class="workspace-label">${scope === "platform" ? "Platform workspace" : escapeHtml(context.school.name)}</span><span class="environment-tag">Demo workspace</span></div><div class="topbar-right"><a href="/school/academic-sessions" data-link class="session-chip">${Icon("calendar")}<span>${escapeHtml(context.academicSession.name)}<b> · ${escapeHtml(context.term.name)}</b></span></a><button class="notification icon-button" data-action="notifications" aria-label="Recent activity">${Icon("bell")}<i></i></button><span class="avatar teal">${initials(context.user.name)}</span></div></header>`;
}
