import { Brand } from "./Brand.js";
import { Icon } from "./Icon.js";
import { product } from "../data/product.js";

export function PublicFooter() {
  return `<footer class="site-footer"><div class="footer-grid"><div class="footer-about">${Brand()}<p>A clearer result season.<br>More time for the learners who matter.</p><span class="footer-country">Built with Nigerian schools in mind.</span></div><nav aria-label="Product links"><h2>Explore ÈsìAyọ̀</h2><a href="/#features" data-link>Features</a><a href="/#how-it-works" data-link>How it works</a><a href="/school/dashboard" data-link>Demo workspace</a><a href="/pricing" data-link>Plans & pricing</a></nav><nav aria-label="Company links"><h2>Get to know us</h2><a href="/about" data-link>About ÈsìAyọ̀</a><a href="/#faqs" data-link>Common questions</a><a href="/contact" data-link>Contact us</a><a href="/register-school" data-link>Register interest</a></nav><div class="footer-contact"><h2>Let’s talk about your school</h2><a href="mailto:${product.email}">${Icon("mail")}<span>${product.email}</span></a><a href="tel:${product.phoneHref}">${Icon("phone")}<span>${product.phone}</span></a><p>Have a question about results, grading or getting started? Get in touch.</p></div></div><div class="footer-bottom"><span>© 2026 ${product.name}. All rights reserved.</span><span>Made for better school days.</span></div></footer>`;
}
