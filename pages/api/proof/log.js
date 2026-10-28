// POST { username, location_* }  The ONLY way the app logs a proof/streak. The database function lock_in_streak is no
// longer callable with the public key, so scripts can't hit it directly. Here the server decides who may log:
//   * a SECURED username can only be logged by the Google account that owns it (no impersonation, no burning someone
//     else's shield);
//   * an unsecured username is allowed but throttled per network (a few different usernames a day, an hourly cap).
// A real photo is required (see below). Verification is always "self_attested"; the client cannot ask for more.
import { adminClient, cleanUsername } from "../../../utils/requireOwner";
import { authorizeProofActor, BUCKET, proofPath, looksLikeImage, isSafeProofUsername } from "../../../utils/proofAccess";
import crypto from "crypto";

// Give the route room to finish on Vercel (the database function does real work at long streaks).
export const config = { maxDuration: 30 };

const MIN_PHOTO_BYTES = 8 * 1024;
const MAX_PHOTO_BYTES = 20 * 1024 * 1024;

const num = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) && n >= lo && n <= hi ? Math.round(n * 100) / 100 : null; };
const str = (v, n) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : null);

async function logProof(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const username = cleanUsername(req.body?.username);
  if (!isSafeProofUsername(username)) return res.status(400).json({ error: "Invalid username.", code: "bad_username" });
  const db = adminClient();

  const who = await authorizeProofActor(req, res, db, username);
  if (!who) return;
  const { claim, ih } = who;

  // A proof needs a real photo: today's upload must exist, be an image, and not be a re-used picture.
  const path = proofPath(username);
  const { data: files } = await db.storage.from(BUCKET).list(username, { search: path.split("/")[1], limit: 5 });
  const file = (files || []).find((f) => f.name === path.split("/")[1]);
  const size = Number(file?.metadata?.size ?? 0);
  if (!file || size < MIN_PHOTO_BYTES || size > MAX_PHOTO_BYTES) {
    return res.status(400).json({ error: "Add your outdoor photo to log your proof.", code: "photo_required" });
  }
  try {
    const { data: blob } = await db.storage.from(BUCKET).download(path);
    const buf = Buffer.from(await blob.arrayBuffer());
    if (!looksLikeImage(buf)) return res.status(400).json({ error: "That file isn't a photo we can read. Try a JPEG or PNG.", code: "photo_invalid" });
    const hash = crypto.createHash("sha256").update(buf).digest("hex");
    const day = new Date().toISOString().slice(0, 10);
    const { data: seen, error: hErr } = await db.from("proof_photo_hashes").select("username,day").eq("hash", hash).maybeSingle();
    if (!hErr) {
      if (seen && (seen.username !== username || String(seen.day).slice(0, 10) !== day)) {
        return res.status(409).json({ error: "That photo was already used for a proof. Take a new one today.", code: "photo_reused" });
      }
      if (!seen) await db.from("proof_photo_hashes").insert([{ hash, username, day }]);
    } else console.warn("[proof/log] photo hash check skipped:", hErr.message);
  } catch (e) {
    console.error("[proof/log] photo check failed:", e?.message);
    return res.status(400).json({ error: "We couldn't read your photo. Please retake it and try again.", code: "photo_invalid" });
  }

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

  // Stop waiting a little before the platform would kill us, so the player gets a real answer and we keep a record.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 24000);
  const t0 = Date.now();
  let data, error;
  try {
    ({ data, error } = await db.rpc("lock_in_streak", params).abortSignal(ctrl.signal));
  } catch (e) {
    error = { message: e?.message || "rpc threw", aborted: true };
  } finally { clearTimeout(timer); }
  const ms = Date.now() - t0;
  try { await db.from("proof_attempts").insert([{ ip_hash: ih, username, secured: !!claim, ok: !error }]); } catch {}
  if (error) {
    const timedOut = !!error.aborted || ctrl.signal.aborted;
    console.error("[proof/log] rpc failed", JSON.stringify({ username, ms, timedOut, message: error.message, code: error.code }));
    if (timedOut) return res.status(504).json({ error: "That took too long. Your proof may still have saved. Check your profile in a minute before trying again.", code: "timeout" });
    return res.status(500).json({ error: "Streak log failed.", code: "rpc_failed" });
  }
  if (ms > 5000) console.warn("[proof/log] slow rpc", JSON.stringify({ username, ms }));
  return res.status(200).json({ result: data });
}

export default async function handler(req, res) {
  try {
    return await logProof(req, res);
  } catch (e) {
    // Anything unexpected still gets a JSON answer, and a line in the server log with the real cause.
    console.error("[proof/log] unhandled", JSON.stringify({ message: e?.message, stack: String(e?.stack || "").split("\n").slice(0, 4).join(" | ") }));
    if (!res.headersSent) return res.status(500).json({ error: "Streak log failed.", code: "server_error" });
  }
}
