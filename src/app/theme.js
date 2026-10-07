import { Icon } from "../components/Icon.js";

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  try {
    localStorage.setItem("esiayo-theme", theme);
  } catch {}
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.innerHTML = Icon(theme === "dark" ? "sun" : "moon");
    button.setAttribute("aria-label", theme === "dark" ? "Use day theme" : "Use night theme");
    button.setAttribute("title", theme === "dark" ? "Use day theme" : "Use night theme");
  });
}

export function initializeTheme() {
  let theme;
  try {
    theme = localStorage.getItem("esiayo-theme");
  } catch {}
  applyTheme(theme === "dark" || theme === "light" ? theme : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const toggle = document.createElement("button");
  toggle.className = "icon-button theme-toggle theme-toggle-floating";
  toggle.type = "button";
  toggle.dataset.themeToggle = "";
  document.body.append(toggle);
  applyTheme(document.documentElement.dataset.theme);
  document.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("[data-theme-toggle]")) {
      applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    }
  });
}
