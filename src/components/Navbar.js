import { Brand } from "./Brand.js";
import { Button } from "./Button.js";
export const Navbar = () =>
  `<header class="public-nav">${Brand()}<nav aria-label="Public navigation"><a href="/#features" data-link>Features</a><a href="/about" data-link>About</a><a href="/pricing" data-link>Pricing</a><a href="/contact" data-link>Contact</a>${Button("Log in", { href: "/login", variant: "secondary" })}${Button("Explore workspace", { href: "/school/dashboard" })}</nav></header>`;
