import { Icon } from "./Icon.js";
import { escapeHtml } from "../utils/helpers.js";
export const EmptyState = (title, description, action = "") =>
  `<div class="empty-state">${Icon("file")}<h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p>${action}</div>`;
