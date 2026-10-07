import { escapeHtml } from "../utils/helpers.js";
export const Breadcrumb = (items) =>
  `<nav class="breadcrumb" aria-label="Breadcrumb">${items.map((item, i) => `${i ? '<span aria-hidden="true">/</span>' : ""}<span>${escapeHtml(item)}</span>`).join("")}</nav>`;
