import { identity } from "../app/auth.js";
import { roleWorkspaces } from "../app/access.js";
import { Brand } from "./Brand.js";
import { Button } from "./Button.js";
import { Icon } from "./Icon.js";
export const Navbar = () =>
  `<header class="public-nav">${Brand()}<button class="public-menu-toggle icon-button" type="button" aria-label="Open navigation" aria-controls="public-navigation" aria-expanded="false">${Icon("menu")}</button><nav id="public-navigation" aria-label="Public navigation"><div class="public-menu-links"><a href="/about" data-link>About</a><a href="/pricing" data-link>Pricing</a><a href="/contact" data-link>Contact</a></div><div class="public-account-actions">${identity.user ? `<a class="button secondary profile-link" href="${identity.active ? roleWorkspaces[identity.active.role].home : "/workspaces"}" data-link aria-label="Open your workspace">${Icon("users")}<span>My workspace</span></a>` : `${Button("Login", { action: "login-modal", variant: "secondary" })}${Button("Register school", { action: "signup-modal" })}`}</div></nav></header>`;

export function bindPublicNavigation() {
  const close = () => {
    const header = document.querySelector(".public-nav");
    header?.classList.remove("menu-open");
    const button = header?.querySelector(".public-menu-toggle");
    button?.setAttribute("aria-expanded", "false");
    button?.setAttribute("aria-label", "Open navigation");
  };
  document.addEventListener("click", (event) => {
    const button = event.target.closest(".public-menu-toggle");
    if (button) {
      const header = button.closest(".public-nav");
      const open = header.classList.toggle("menu-open");
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute(
        "aria-label",
        open ? "Close navigation" : "Open navigation",
      );
    } else if (
      event.target.closest(".public-nav nav a, .public-nav nav button") ||
      !event.target.closest(".public-nav")
    )
      close();
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      document.querySelector(".public-nav.menu-open")
    ) {
      close();
      document.querySelector(".public-menu-toggle")?.focus();
    }
  });
}
