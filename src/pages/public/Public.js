import { PricingPlans, bindPricingPlans } from "../../components/PricingPlans.js";
import { Registration, bindRegistration } from "./Registration.js";
import { navigate } from "../../app/router.js";
import { Home } from "./Home.js";
import { Authentication } from "./Authentication.js";
import { product } from "../../data/product.js";
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { Icon } from "../../components/Icon.js";
import { field } from "../shared.js";
import { toast } from "../../components/Toast.js";
export function Public(kind = "home") {
  if (kind === "login") return Authentication();
  if (kind === "home") return Home();
  if (kind === "register-school")
    return `<div class="public-form-layout"><div><span class="eyebrow">YOUR SCHOOL WORKSPACE</span><h1>Register your school.</h1><p>Confirm your email to receive administrator access to your own school. Your teachers will receive only the classes and subjects you assign.</p></div><section class="card public-form">${Registration({ school: true })}</section></div>`;
  if (kind === "about")
    return `<section class="public-hero"><span class="eyebrow">BUILT AROUND YOUR SCHOOL</span><h1>A little clarity.<br>A lot of potential.</h1><p>ÈsìAyọ̀ helps school administrators and teachers manage academic records together. Each school gets its own workspace, with a flexible curriculum and a clear result workflow.</p>${Button("See it in action", { action: "try-demo", icon: "arrow" })}</section>`;
  if (kind === "pricing") return `<section class="public-intro"><h1>A plan for every school.</h1><p>Choose student-based pricing for each term, or discuss a tailored plan.</p></section>${PricingPlans()}`;
  const login = kind === "login",
    register = kind === "register-school";
  return `<div class="public-form-layout"><div><span class="eyebrow">${login ? "WELCOME BACK" : register ? "YOUR NEXT CHAPTER" : "LET’S TALK"}</span><h1>${login ? "Good school days<br>start here." : register ? "Your school.<br>Your workspace." : "We’re here<br>to help."}</h1><p>${login ? "Choose a demo workspace to explore. Real authentication is planned for Phase 2." : register ? "Preview the school registration flow. No account or workspace will be created." : "Preview a contact form. Messages are not sent in this frontend prototype."}</p>${!login && !register ? `<div class="public-contact-details"><a href="mailto:${product.email}">${Icon("mail")} ${product.email}</a><a href="tel:${product.phoneHref}">${Icon("phone")} ${product.phone}</a></div>` : ""}</div>${Card(`<form id="public-form"><h2>${login ? "Explore ÈsìAyọ̀" : register ? "Register your school" : "Contact ÈsìAyọ̀"}</h2>${register ? field("School name", '<input name="school" required autocomplete="organization">') : ""}${!login ? field("Your name", '<input name="name" required autocomplete="name">') : ""}${field("Email address", '<input type="email" name="email" required autocomplete="email">')}${login ? field("Demo role", '<select name="role"><option value="schoolAdmin">School Admin</option><option value="superAdmin">Super Admin</option><option value="subjectTeacher">Subject Teacher</option><option value="classTeacher">Class Teacher</option></select>') : register ? field("Preferred workspace slug", '<input name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="your-school" required>') : field("Message", '<textarea name="message" rows="4" required></textarea>')}<p class="helper-text">Frontend demo only. No authentication or external submission.</p>${Button(login ? "Open demo workspace" : register ? "Preview registration" : "Preview message", { type: "submit", icon: "arrow" })}</form>`, "public-form")}</div>`;
}
export function bindPublic(kind) {
  if (kind === "home" || kind === "pricing") bindPricingPlans();
  if (kind === "register-school") {
    bindRegistration(document, navigate);
    return;
  }
  document.querySelector("#public-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (kind !== "login")
      toast(
        kind === "register-school"
          ? "Registration preview complete. No account was created."
          : "Message preview complete. Nothing was sent.",
      );
  });
}

