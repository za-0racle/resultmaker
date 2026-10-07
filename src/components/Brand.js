import { Icon } from "./Icon.js";
import { product } from "../data/product.js";

export const productName = product.name;
export function Brand() {
  return `<a href="/" data-link class="brand" aria-label="${productName}"><span class="brand-mark">${Icon("book")}</span><span class="brand-wordmark"><strong>ÈsìAyọ̀</strong><small>the result maker</small></span><i></i></a>`;
}
