export const escapeHtml = (value = "") =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
export const initials = (name) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
export const uid = () => crypto.randomUUID();
export function getTenantFromHostname(
  hostname = window.location.hostname,
  developmentTenant = "greenfield",
) {
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  )
    return { slug: developmentTenant, development: true };
  const parts = hostname.toLowerCase().split(".");
  return {
    slug:
      parts.length === 3 &&
      parts.slice(1).join(".") === "resultmaker.com" &&
      parts[0] !== "www"
        ? parts[0]
        : null,
  };
}
