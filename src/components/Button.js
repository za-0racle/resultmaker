import { escapeHtml } from "../utils/helpers.js";
import { Icon } from "./Icon.js";
export function Button(
  label,
  { href, action, variant = "primary", icon, type = "button" } = {},
) {
  const contents = `${icon ? Icon(icon) : ""}<span>${escapeHtml(label)}</span>`;
  return href
    ? `<a class="button ${variant}" href="${escapeHtml(href)}" data-link>${contents}</a>`
    : `<button type="${type}" class="button ${variant}" ${action ? `data-action="${escapeHtml(action)}"` : ""}>${contents}</button>`;
}
