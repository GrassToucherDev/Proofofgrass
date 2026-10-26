// Server only. Shared by /api/proof/upload-url and /api/proof/log.
//   * a SECURED username can only be acted on by the Google account that owns it
//   * everyone is throttled per network (hashed IP); unsecured usernames also get a daily cap on distinct names
import crypto from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../pages/api/auth/[...nextauth]";

export const MAX_ATTEMPTS_PER_HOUR = 60;
export const MAX_NEW_USERNAMES_PER_DAY = 5;
export const BUCKET = "proof-photos";
export const todayUTC = () => new Date().toISOString().slice(0, 10);
export const proofPath = (username, day = todayUTC()) => `${username}/${day}.png`;

export function ipHash(req) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
  return crypto.createHash("sha256").update(ip + "|" + (process.env.SUPABASE_SERVICE_ROLE_KEY || "").slice(0, 16)).digest("hex").slice(0, 32);
}

// Returns { claim, ih } when the caller may act for `username`; otherwise sends the response itself and returns null.
export async function authorizeProofActor(req, res, db, username) {
  const { data: claim } = await db.from("username_claims").select("google_id").eq("username", username).maybeSingle();
  if (claim) {
    const session = await getServerSession(req, res, authOptions);
    const gid = session?.user?.google_id;
    if (!gid) { res.status(401).json({ error: "This username is secured. Sign in with Google to log your proof.", code: "not_signed_in" }); return null; }
    if (gid !== claim.google_id) { res.status(403).json({ error: "This username belongs to another account.", code: "not_owner" }); return null; }
  }
  const ih = ipHash(req);
  try {
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const dayAgo = new Date(Date.now() - 86400_000).toISOString();
    const { count: hourly } = await db.from("proof_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", ih).gte("created_at", hourAgo);
    if ((hourly ?? 0) >= MAX_ATTEMPTS_PER_HOUR) { res.status(429).json({ error: "Too many attempts from this network. Try again in a bit.", code: "rate_limited" }); return null; }
    if (!claim) {
      const { data: recent } = await db.from("proof_attempts").select("username").eq("ip_hash", ih).eq("secured", false).gte("created_at", dayAgo).limit(500);
      const others = new Set((recent || []).map((r) => r.username).filter((u) => u !== username));
      if (others.size >= MAX_NEW_USERNAMES_PER_DAY) {
        res.status(429).json({ error: "Too many different accounts from this network today. Secure your username with Google to keep logging.", code: "too_many_accounts" }); return null;
      }
    }
  } catch (e) { console.warn("[proofAccess] throttle skipped:", e?.message); }
  return { claim, ih };
}

// JPEG / PNG / WebP / HEIC(HEIF) by magic bytes. A proof must be a real image file.
export function looksLikeImage(buf) {
  if (!buf || buf.length < 12) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  if (buf[0] === 0x89 && buf.slice(1, 4).toString() === "PNG") return true;
  if (buf.slice(0, 4).toString() === "RIFF" && buf.slice(8, 12).toString() === "WEBP") return true;
  if (buf.slice(4, 8).toString() === "ftyp") return true;
  return false;
}
