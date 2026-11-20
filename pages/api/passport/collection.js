// GET /api/passport/collection?wallet=<address>
// Reads the wallet's WAGO Origins + Screen Touchers from chain (server-side) and returns only pieces whose
// verified collection matches the configured addresses. Public on-chain data, so no sign-in is needed.
// If the caller is signed in to Proof of Grass AND that account's verified wallet is this wallet, it also
// returns their streak and proof count. Nothing about Proof of Grass is returned otherwise.
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { adminClient } from "../../../utils/requireOwner";
import { passportConfig, fetchHoldings } from "../../../utils/passportServer";
import { SOLANA_ADDRESS_RE } from "../../../utils/passport";

const hits = new Map(); // best-effort per-instance rate limit: 30 requests / minute / IP
function limited(ip) {
  const now = Date.now(), w = (hits.get(ip) || []).filter((t) => now - t < 60000);
  w.push(now); hits.set(ip, w);
  if (hits.size > 5000) hits.clear();
  return w.length > 30;
}

async function linkedActivity(req, res, wallet) {
  try {
    const session = await getServerSession(req, res, authOptions);
    const gid = session?.user?.google_id;
    if (!gid) return null;
    const db = adminClient();
    const { data: claims } = await db.from("username_claims").select("username").eq("google_id", gid);
    const names = (claims || []).map((c) => c.username).filter(Boolean);
    if (!names.length) return null;
    const { data: prof } = await db.from("Profiles").select("username,wallet_address,wallet_verified").in("username", names).eq("wallet_verified", true).eq("wallet_address", wallet).maybeSingle();
    if (!prof) return null;
    const [{ data: s }, { count }] = await Promise.all([
      db.from("Streaks").select("current_streak").eq("username", prof.username).maybeSingle(),
      db.from("Submissions").select("id", { count: "exact", head: true }).eq("username", prof.username).in("status", ["pending", "approved"]),
    ]);
    return { username: prof.username, streak: s?.current_streak ?? 0, proofs: count ?? 0 };
  } catch (e) { console.error("[passport] linked activity", e?.message); return null; }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const wallet = String(req.query.wallet || "");
  if (!SOLANA_ADDRESS_RE.test(wallet)) return res.status(400).json({ error: "Invalid wallet address." });
  const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim();
  if (limited(ip)) return res.status(429).json({ error: "Too many requests. Wait a moment and try again." });

  const cfg = passportConfig();
  if (!cfg.ok) {
    console.error("[passport] not configured; missing:", cfg.missing.join(", ") || "valid collection address");
    return res.status(503).json({ status: "not_configured" });
  }
  try {
    const pieces = await fetchHoldings(wallet, cfg);
    const pog = await linkedActivity(req, res, wallet);
    return res.status(200).json({
      status: "ok",
      origins: pieces.filter((p) => p.collection === "origins"),
      screenTouchers: pieces.filter((p) => p.collection === "screen_touchers"),
      pog,
      checkedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("[passport] holdings lookup failed:", e?.message);
    return res.status(502).json({ status: "lookup_failed", error: "Couldn't read this wallet right now." });
  }
}
