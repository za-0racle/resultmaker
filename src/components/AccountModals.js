import {
  Authentication,
  bindAuthentication,
} from "../pages/public/Authentication.js";
import { WorkspacePreview } from "../pages/public/Home.js";
import { refreshIdentity } from "../app/auth.js";
import {
  Registration,
  bindRegistration,
} from "../pages/public/Registration.js";

export function bindAccountModals(navigate) {
  document.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!["login-modal", "signup-modal", "try-demo"].includes(action)) return;
    if (document.querySelector(".account-modal")) return;
    const opener = event.target.closest("button");
    const dialog = document.createElement("dialog");
    dialog.className = `account-modal ${action === "try-demo" ? "demo-modal" : ""}`;
    dialog.setAttribute(
      "aria-label",
      action === "try-demo"
        ? "Try demo"
        : action === "login-modal"
          ? "Login"
          : "Signup",
    );
    dialog.innerHTML =
      '<button type="button" class="icon-button modal-close" aria-label="Close dialog">&times;</button><div class="account-modal-content">Loading…</div>';
    document.body.append(dialog);
    dialog.querySelector(".modal-close").onclick = () => dialog.close();
    dialog.addEventListener("close", () => {
      dialog.remove();
      const focusTarget = opener?.getClientRects().length
        ? opener
        : document.querySelector(".public-menu-toggle");
      focusTarget?.focus();
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          dialog.close();
      }
    });
    dialog.showModal();
    const content = dialog.querySelector(".account-modal-content");
    const go = (path) => {
      dialog.close();
      navigate(path);
    };
    if (action === "try-demo") {
      content.innerHTML = `<h2>Try demo</h2><p>Preview a sample school workspace. This preview uses illustrative records.</p>${WorkspacePreview()}`;
      return;
    }
    if (action === "login-modal") {
      await refreshIdentity();
      if (!dialog.isConnected) return;
      const render = () => {
        content.innerHTML = Authentication();
        bindAuthentication(go, render, dialog);
      };
      render();
      dialog.querySelector("input, [data-workspace], #auth-retry")?.focus();
      return;
    }
    content.innerHTML = Registration();
    bindRegistration(dialog, go);
    dialog.querySelector("input, select")?.focus();
  });
}
