import { schoolSlug } from "../../utils/schoolSlug.js";
import { authService } from "../../services/authService.js";
import { identity, refreshIdentity } from "../../app/auth.js";
import { roleWorkspaces } from "../../app/access.js";
import { Icon } from "../../components/Icon.js";

export function Registration({ school = true } = {}) {
  return `<h2>${school ? "Register your school" : "Create your account"}</h2><p>Register your school and its administrator account. You can create teacher accounts from your school workspace.</p><form id="signup-form"><fieldset id="signup-school-fields" ${school ? "" : "hidden disabled"}><legend>School details</legend><div class="field"><label for="signup-school">School name</label><input id="signup-school" name="school" required maxlength="200" autocomplete="organization"></div></fieldset><div class="field"><label for="signup-name">Full name</label><input id="signup-name" name="name" required maxlength="150" autocomplete="name"></div><div class="field"><label for="signup-email">Email address</label><input id="signup-email" name="email" type="email" required autocomplete="email"></div><div class="field"><label for="signup-password">Password</label><div class="password-control"><input id="signup-password" name="password" type="password" required minlength="8" autocomplete="new-password"><button class="password-toggle" type="button" aria-label="Show password" aria-controls="signup-password" aria-pressed="false">${Icon("eye")}</button></div><small>Use at least 8 characters.</small></div><p id="signup-message" role="status" aria-live="polite"></p><button class="button primary" type="submit">Signup</button></form>`;
}
export function bindRegistration(root, navigate) {
  const form = root.querySelector("#signup-form");
  if (!form) return;
  form.querySelector(".password-toggle").addEventListener("click", (event) => {
    const button = event.currentTarget,
      input = form.querySelector("#signup-password"),
      visible = input.type === "password";
    input.type = visible ? "text" : "password";
    button.setAttribute(
      "aria-label",
      visible ? "Hide password" : "Show password",
    );
    button.setAttribute("aria-pressed", String(visible));
    button.innerHTML = Icon(visible ? "eyeOff" : "eye");
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form),
      button = form.querySelector('[type="submit"]'),
      message = form.querySelector("#signup-message");
    const school = { name: String(data.get("school")).trim(), slug: schoolSlug(String(data.get("school")).trim()) };
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    message.textContent = "Creating your account…";
    try {
      const result = await authService.signUp(
        String(data.get("email")).trim(),
        String(data.get("password")),
        String(data.get("name")).trim(),
        school,
      );
      form.reset();
      if (result.session) {
        await refreshIdentity();
        navigate(
          identity.active
            ? roleWorkspaces[identity.active.role].home
            : "/workspaces",
        );
      } else
        message.textContent = school
          ? "Check your email for a confirmation link. Then log in to create your school and receive its administrator workspace."
          : "Check your email for a confirmation link. After confirming, log in. Your school administrator will assign your classes, subjects and role.";
    } catch (error) {
      message.textContent =
        "Signup could not be completed. Check your details and try again, or contact your administrator.";
    } finally {
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  });
}
