import { escapeHtml } from "../utils/helpers.js";
import { EmptyState } from "./EmptyState.js";
export function Table(columns, rows, { className = "" } = {}) {
  return rows.length
    ? `<div class="table-scroll"><table class="${className}"><thead><tr>${columns.map((c) => `<th scope="col">${escapeHtml(c)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
    : EmptyState(
        "No records found",
        "Try another search or add your first record.",
      );
}
