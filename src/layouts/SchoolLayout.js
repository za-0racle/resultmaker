import { Sidebar } from "../components/Sidebar.js";
import { Header } from "../components/Header.js";
export function SchoolLayout(content, path, scope = "school") {
  return `${Sidebar(scope, path)}<div class="workspace">${Header(scope)}<main id="main-content" tabindex="-1">${content}</main><footer class="workspace-footer"><span>© 2026 ÈsìAyọ̀</span><span>Built for better school days <span class="footer-dot"></span> Frontend prototype</span></footer></div>`;
}
