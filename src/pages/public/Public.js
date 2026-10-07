import { Home } from "./Home.js";
import { product } from "../../data/product.js";
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { Icon } from "../../components/Icon.js";
import { field } from "../shared.js";
import { toast } from "../../components/Toast.js";
export function Public(kind = "home") {
  if (kind === "home") return Home();
  if (kind === "about")
    return `<section class="public-hero"><span class="eyebrow">BUILT AROUND YOUR SCHOOL</span><h1>A little clarity.<br>A lot of potential.</h1><p>ÈsìAyọ̀ helps school administrators and teachers manage academic records together. Each school gets its own workspace, with a flexible curriculum and a clear result workflow.</p>${Button("See it in action", { href: "/school/dashboard", icon: "arrow" })}</section>`;
  if (kind === "pricing")
    return `<section class="public-intro"><span class="eyebrow">GROW AT YOUR OWN PACE</span><h1>A plan for every school.</h1><p>Illustrative plans for the prototype. Pricing and payments will be confirmed in Phase 2.</p></section><div class="public-features">${[
      ["Starter", "A strong foundation"],
      ["Professional", "Space to do more"],
      ["Enterprise", "Built for bigger communities"],
    ]
      .map(([name, desc]) =>
        Card(
          `<h2>${name}</h2><p>${desc}</p><h3>Pricing coming soon</h3><ul class="plan-features"><li>Dedicated school workspace</li><li>Student and teacher records</li><li>Result workflow and reports</li></ul>${Button("Register interest", { href: "/register-school", variant: name === "Professional" ? "primary" : "secondary" })}`,
        ),
      )
      .join("")}</div>`;
  const login = kind === "login",
    register = kind === "register-school";
  return `<div class="public-form-layout"><div><span class="eyebrow">${login ? "WELCOME BACK" : register ? "YOUR NEXT CHAPTER" : "LET’S TALK"}</span><h1>${login ? "Good school days<br>start here." : register ? "Your school.<br>Your workspace." : "We’re here<br>to help."}</h1><p>${login ? "Choose a demo workspace to explore. Real authentication is planned for Phase 2." : register ? "Preview the school registration flow. No account or workspace will be created." : "Preview a contact form. Messages are not sent in this frontend prototype."}</p>${!login && !register ? `<div class="public-contact-details"><a href="mailto:${product.email}">${Icon("mail")} ${product.email}</a><a href="tel:${product.phoneHref}">${Icon("phone")} ${product.phone}</a></div>` : ""}</div>${Card(`<form id="public-form"><h2>${login ? "Explore ÈsìAyọ̀" : register ? "Register your school" : "Contact ÈsìAyọ̀"}</h2>${register ? field("School name", '<input name="school" required autocomplete="organization">') : ""}${!login ? field("Your name", '<input name="name" required autocomplete="name">') : ""}${field("Email address", '<input type="email" name="email" required autocomplete="email">')}${login ? field("Demo role", '<select name="role"><option value="schoolAdmin">School Admin</option><option value="superAdmin">Super Admin</option><option value="subjectTeacher">Subject Teacher</option><option value="classTeacher">Class Teacher</option></select>') : register ? field("Preferred workspace slug", '<input name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="your-school" required>') : field("Message", '<textarea name="message" rows="4" required></textarea>')}<p class="helper-text">Frontend demo only. No authentication or external submission.</p>${Button(login ? "Open demo workspace" : register ? "Preview registration" : "Preview message", { type: "submit", icon: "arrow" })}</form>`, "public-form")}</div>`;
}
export function bindPublic(kind, navigate, setRole) {
  document.querySelector("#public-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (kind === "login") {
      const role = new FormData(e.target).get("role");
      setRole(role);
      navigate(
        {
          superAdmin: "/platform",
          schoolAdmin: "/school/dashboard",
          subjectTeacher: "/teacher/dashboard",
          classTeacher: "/class-teacher/dashboard",
        }[role],
      );
    } else
      toast(
        kind === "register-school"
          ? "Registration preview complete. No account was created."
          : "Message preview complete. Nothing was sent.",
      );
  });
}
