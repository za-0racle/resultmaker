import { product } from "../data/product.js";
import { Sidebar } from "../components/Sidebar.js";
import { Header } from "../components/Header.js";
export function SchoolLayout(content, path, scope = "school", live = null) {
  return `${Sidebar(scope, path, live)}<div class="workspace">${Header(scope, live)}<main id="main-content" tabindex="-1">${content}</main><footer class="workspace-footer"><span>${product.copyright}</span><span>${live ? product.subtitle : 'Built for better school days <span class="footer-dot"></span> Frontend prototype'}</span></footer></div>`;
}
