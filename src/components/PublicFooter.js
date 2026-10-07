import { Brand } from "./Brand.js";
import { Icon } from "./Icon.js";
import { product } from "../data/product.js";

export function PublicFooter() {
  return `<footer class="site-footer"><div class="footer-grid"><div class="footer-about">${Brand()}<p>School results, thoughtfully organised.</p></div><nav aria-label="Explore"><h2>Explore</h2><a href="/about" data-link>About</a><a href="/pricing" data-link>Pricing</a><a href="/#faqs" data-link>FAQ</a></nav><div class="footer-contact"><h2>Contact</h2><a href="mailto:${product.email}">${Icon("mail")}${product.email}</a><a href="tel:${product.phoneHref}">${Icon("phone")}${product.phone}</a></div></div><div class="footer-bottom"><span>${product.copyright}</span></div></footer>`;
}
