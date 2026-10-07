// A hostname selects a tenant context; database membership still grants access.
export function resolveTenantHostname(host, baseDomain = "resultmaker.com") {
  const hostname = new URL(`https://${host}`).hostname.toLowerCase();
  const base = baseDomain.toLowerCase();
  if (["localhost", "127.0.0.1", "[::1]"].includes(hostname))
    return { schoolSlug: null, development: true };
  const suffix = `.${base}`;
  const slug = hostname.endsWith(suffix) ? hostname.slice(0, -suffix.length) : null;
  return {
    schoolSlug: slug && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && !["www", "admin", "api"].includes(slug) ? slug : null,
    development: false,
  };
}
