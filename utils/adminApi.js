// Server-side admin check for API routes. Admin UIs send the secret in `x-admin-secret`.
// Accepts ADMIN_API_SECRET, or WAGO_ADMIN_SECRET if that's what you already have set.
// Fails closed: with neither env var set, nothing is authorised.
import { timingSafeEqual } from "crypto";

export function isAdminRequest(req) {
  const given = String(req.headers["x-admin-secret"] || "");
  if (!given) return false;
  for (const expected of [process.env.ADMIN_API_SECRET, process.env.WAGO_ADMIN_SECRET]) {
    if (!expected) continue;
    const a = Buffer.from(given), b = Buffer.from(expected);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}
