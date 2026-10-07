import { escapeHtml } from "../utils/helpers.js";
export function Modal(title, content, onSubmit) {
  const dialog = document.createElement("dialog");
  dialog.className = "modal";
  dialog.innerHTML = `<form method="dialog"><div class="card-header"><h2>${escapeHtml(title)}</h2><button type="button" class="icon-button" aria-label="Close dialog">&times;</button></div>${content}<div class="modal-actions"><button type="button" class="button secondary" data-cancel>Cancel</button><button type="submit" class="button primary">Save changes</button></div></form>`;
  document.body.append(dialog);
  dialog
    .querySelectorAll("[data-cancel],.icon-button")
    .forEach((b) => (b.onclick = () => dialog.close()));
  dialog.addEventListener("close", () => dialog.remove());
  dialog.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    await onSubmit(new FormData(e.target), dialog);
  });
  dialog.showModal();
  return dialog;
}
