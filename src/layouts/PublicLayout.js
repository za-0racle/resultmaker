import { Navbar } from "../components/Navbar.js";
import { PublicFooter } from "../components/PublicFooter.js";
export const PublicLayout = (content) =>
  `${Navbar()}<main id="main-content" class="public-main" tabindex="-1">${content}</main>${PublicFooter()}`;
