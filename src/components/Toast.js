import { escapeHtml } from "../utils/helpers.js";
export function toast(message, type = "success") {
  const region = document.querySelector("#toasts");
  const element = document.createElement("div");
  element.className = `toast ${type}`;
  element.setAttribute("role", type === "error" ? "alert" : "status");
  element.innerHTML = escapeHtml(message);
  region.append(element);
  setTimeout(() => element.remove(), 4200);
}
