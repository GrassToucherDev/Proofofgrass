// Server only. WAGO Drops admin secret check: header only (never a URL or body field, which end up in logs),
// compared in constant time, with a small per-network failure throttle.
import crypto from "crypto";

const fails = new Map(); // ip -> { n, t }
const WINDOW_MS = 10 * 60 * 1000, MAX_FAILS = 10;

export function wagoSecretOk(secret, req) {
  const real = process.env.WAGO_ADMIN_SECRET;
  const ip = (req?.headers?.["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const f = fails.get(ip);
  if (f && Date.now() - f.t < WINDOW_MS && f.n >= MAX_FAILS) return false;
  let ok = false;
  if (real && typeof secret === "string" && secret) {
    const a = crypto.createHash("sha256").update(secret).digest();
    const b = crypto.createHash("sha256").update(real).digest();
    ok = crypto.timingSafeEqual(a, b);
  }
  if (!ok) {
    const cur = f && Date.now() - f.t < WINDOW_MS ? f : { n: 0, t: Date.now() };
    cur.n += 1; fails.set(ip, cur);
  }
  return ok;
}
