import { product } from "../data/product.js";

export const productName = product.name;
export function Brand() {
  return `<a href="/" data-link class="brand official-brand" aria-label="${productName} &mdash; home"><span class="brand-lockup"><span class="official-logo-frame"><img src="/files/esiayo-logo-navy-lowercase.svg" alt="${productName}" width="1200" height="600" fetchpriority="high"></span><small class="brand-tagline">${product.subtitle}</small></span></a>`;
}
