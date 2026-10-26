// POST { username, location_* }  The ONLY way the app logs a proof/streak. The database function lock_in_streak is no
// longer callable with the public key, so scripts can't hit it directly. Here the server decides who may log:
//   * a SECURED username can only be logged by the Google account that owns it (no impersonation, no burning someone
//     else's shield);
//   * an unsecured username is allowed but throttled per network (a few different usernames a day, an hourly cap).
// Verification is always "self_attested"; the client cannot ask for more.
import crypto from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { adminClient, cleanUsername } from "../../../utils/requireOwner";

const MAX_ATTEMPTS_PER_HOUR = 60;      // per network, any username
const MAX_NEW_USERNAMES_PER_DAY = 5;   // per network, unsecured usernames only (shared Wi-Fi / mobile carriers allowed for)

const num = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) && n >= lo && n <= hi ? Math.round(n * 100) / 100 : null; };
const str = (v, n) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);

function ipHash(req) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
  return crypto.createHash("sha256").update(ip + "|" + (process.env.SUPABASE_SERVICE_ROLE_KEY || "").slice(0, 16)).digest("hex").slice(0, 32);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const username = cleanUsername(req.body?.username);
  if (!/^[\w.\-]{1,64}$/.test(username)) return res.status(400).json({ error: "Invalid username.", code: "bad_username" });
  const db = adminClient();

  // Secured usernames: owner only.
  const { data: claim } = await db.from("username_claims").select("google_id").eq("username", username).maybeSingle();
  if (claim) {
    const session = await getServerSession(req, res, authOptions);
    const gid = session?.user?.google_id;
    if (!gid) return res.status(401).json({ error: "This username is secured. Sign in with Google to log your proof.", code: "not_signed_in" });
    if (gid !== claim.google_id) return res.status(403).json({ error: "This username belongs to another account.", code: "not_owner" });
  }

  // Throttle per network. Fails open if the table isn't there yet, so logging never breaks over bookkeeping.
  const ih = ipHash(req);
  try {
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const dayAgo = new Date(Date.now() - 86400_000).toISOString();
    const { count: hourly } = await db.from("proof_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", ih).gte("created_at", hourAgo);
    if ((hourly ?? 0) >= MAX_ATTEMPTS_PER_HOUR) return res.status(429).json({ error: "Too many attempts from this network. Try again in a bit.", code: "rate_limited" });
    if (!claim) {
      const { data: recent } = await db.from("proof_attempts").select("username").eq("ip_hash", ih).eq("secured", false).gte("created_at", dayAgo).limit(500);
      const others = new Set((recent || []).map((r) => r.username).filter((u) => u !== username));
      if (others.size >= MAX_NEW_USERNAMES_PER_DAY) {
        return res.status(429).json({ error: "Too many different accounts from this network today. Secure your username with Google to keep logging.", code: "too_many_accounts" });
      }
    }
  } catch (e) { console.warn("[proof/log] throttle skipped:", e?.message); }

  // Whitelisted, sanitised parameters only.
  const b = req.body || {};
  const source = ["gps", "manual", "none"].includes(b.p_location_source) ? b.p_location_source : "none";
  const params = { p_username: username, p_tweet_url: null, p_verification: "self_attested", p_location_source: "none" };
  if (source === "gps") {
    const lat = num(b.p_location_lat_rounded, -90, 90), lng = num(b.p_location_lng_rounded, -180, 180);
    if (lat !== null && lng !== null) Object.assign(params, { p_location_source: "gps", p_location_lat_rounded: lat, p_location_lng_rounded: lng, p_location_label: str(b.p_location_label, 120) || "Nearby Region" });
  } else if (source === "manual") {
    const city = str(b.p_location_city, 80);
    if (city) Object.assign(params, { p_location_source: "manual", p_location_city: city, p_location_region: str(b.p_location_region, 80), p_location_country: str(b.p_location_country, 80), p_location_label: str(b.p_location_label, 160) });
  }

  const { data, error } = await db.rpc("lock_in_streak", params);
  try { await db.from("proof_attempts").insert([{ ip_hash: ih, username, secured: !!claim, ok: !error }]); } catch {}
  if (error) { console.error("[proof/log]", error.message); return res.status(500).json({ error: "Streak log failed.", code: "rpc_failed" }); }
  return res.status(200).json({ result: data });
}
