// Browser helper for admin pages: fetch() that sends the admin secret the API routes require.
// The secret is asked for once per browser tab session and kept in sessionStorage only.
const KEY = "pog_admin_secret";
function getSecret(force) {
  try {
    let s = force ? null : sessionStorage.getItem(KEY);
    if (!s) {
      s = window.prompt("Admin secret (ADMIN_API_SECRET):") || "";
      if (s) sessionStorage.setItem(KEY, s);
    }
    return s;
  } catch { return ""; }
}
export async function adminFetch(url, opts = {}) {
  const go = (force) => fetch(url, {
    ...opts,
    headers: { ...(opts.headers || {}), "x-admin-secret": getSecret(force) },
  });
  let r = await go(false);
  if (r.status === 401) {
    try { sessionStorage.removeItem(KEY); } catch {}
    r = await go(true);
  }
  return r;
}
