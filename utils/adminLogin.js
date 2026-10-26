// Browser helper for admin login screens: asks the server whether the password is the admin secret. On success the
// secret is kept in sessionStorage (same place adminFetch reads it), so the page never prompts a second time.
export async function adminLoginOk(pw) {
  try {
    const r = await fetch("/api/admin/verify", { method: "POST", headers: { "x-admin-secret": String(pw || "") } });
    if (r.ok) { try { sessionStorage.setItem("pog_admin_secret", String(pw)); } catch {} return true; }
  } catch {}
  return false;
}
