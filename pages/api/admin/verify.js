// POST /api/admin/verify — checks the admin secret (header only). Used by the admin pages' login screens, so the
// password never ships in the browser bundle. Small per-network failure throttle.
import { isAdminRequest } from "../../../utils/adminApi";

const fails = new Map(); // ip -> { n, t }
const WINDOW_MS = 10 * 60 * 1000, MAX_FAILS = 10;

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const f = fails.get(ip);
  if (f && Date.now() - f.t < WINDOW_MS && f.n >= MAX_FAILS) return res.status(429).json({ error: "Too many attempts. Try again later." });
  if (isAdminRequest(req)) { fails.delete(ip); return res.status(200).json({ ok: true }); }
  const cur = f && Date.now() - f.t < WINDOW_MS ? f : { n: 0, t: Date.now() };
  cur.n += 1; fails.set(ip, cur);
  return res.status(401).json({ error: "Wrong password." });
}
