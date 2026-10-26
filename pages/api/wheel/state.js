// GET /api/wheel/state — the featured wheel, its current prize pool, a live price quote, stats, and the viewer's meter.
import { adminClient, currentTokenPriceUsd, isWheelTester, sessionIdentity, publicWheel, publicPrizeRow, totalSpins } from "../../../utils/wheel";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const db = adminClient();
  const { googleId, username } = await sessionIdentity(req, res);
  const { data: w } = await db.from("wheels").select("*").eq("featured", true).eq("status", "active").maybeSingle();
  if (!w) return res.status(200).json({ wheel: null });
  const now = Date.now();
  if ((w.starts_at && new Date(w.starts_at) > now) || (w.ends_at && new Date(w.ends_at) < now)) return res.status(200).json({ wheel: null });
  if (w.visibility === "admin" && !isWheelTester(username)) return res.status(200).json({ wheel: null });

  const [{ data: prizes }, { data: stats }, { data: playable }, meter] = await Promise.all([
    db.from("wheel_prizes").select("*").eq("wheel_id", w.id).eq("active", true).order("sort_order").order("created_at"),
    db.rpc("wheel_stats", { p_wheel: w.id }),
    db.rpc("wheel_is_playable", { p_wheel: w.id }),
    googleId ? db.from("wheel_meters").select("count").eq("wheel_id", w.id).eq("google_id", googleId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  let tokens = w.price_mode === "tokens" ? Number(w.price_tokens) : null, tokenPrice = null;
  if (w.price_mode === "usd") {
    try { tokenPrice = await currentTokenPriceUsd(); tokens = Math.ceil(Number(w.price_usd) / tokenPrice); } catch { tokens = null; }
  }
  const lock = tokens == null ? null : Math.round(tokens * w.lock_pct) / 100;
  return res.status(200).json({
    wheel: publicWheel(w),
    playable: !!playable,
    prizes: (prizes || []).filter(p => p.inventory_remaining == null || p.inventory_remaining > 0).map(publicPrizeRow),
    quote: { tokens, usd: w.price_mode === "usd" ? Number(w.price_usd) : null, lock_amount: lock, eco_amount: tokens == null ? null : tokens - lock, token_price_usd: tokenPrice },
    stats: stats || { total_spins: 0, prizes_claimed: 0, locked_amount: 0, queued_amount: 0 },
    meter: googleId && w.meter_enabled ? { count: meter?.data?.count || 0, required: w.meter_spins } : null,
    viewer: { signedIn: !!googleId, username, total_spins: await totalSpins(db, googleId) },
  });
}
