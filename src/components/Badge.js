import { escapeHtml } from "../utils/helpers.js";
export function Badge(status) {
  const tone = ["Active", "Approved", "Published", "Completed"].includes(status)
    ? "success"
    : ["Draft", "Inactive", "Upcoming"].includes(status)
      ? "neutral"
      : ["Submitted", "Preview ready"].includes(status)
        ? "info"
        : "warning";
  return `<span class="badge ${tone}"><span></span>${escapeHtml(status)}</span>`;
}
