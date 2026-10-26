// Admin-only database writes. The admin pages used to write straight to the database with the public key; now they send
// the same query here, where it needs the admin secret and may only touch the tables and operations listed below.
// Body: { table, op, args, steps: [[method, args], ...] }  or  { rpc, args }
import { isAdminRequest } from "../../../utils/adminApi";
import { adminClient } from "../../../utils/requireOwner";

const TABLES = {
  BurnEvents: ["insert"],
  CommunitySpotlights: ["update", "upsert"],
  ConsumableEvents: ["insert"],
  FeaturedPosts: ["insert", "update", "delete"],
  FightClubStats: ["upsert"],
  FightClubSubmissions: ["update"],
  MarketplacePurchases: ["update"],
  PremiumPurchaseRequests: ["update"],
  Profiles: ["update"],
  ScoreEvents: ["insert"],
  ShieldPurchases: ["update"],
  Streaks: ["update"],
  UserConsumables: ["insert", "update"],
  UserInventory: ["upsert"],
  UserPremiumUnlocks: ["insert"],
  grass_draw_cycles: ["insert", "update"],
  grass_draw_disqualifications: ["insert", "update"],
  grass_draw_rewards: ["update"],
  grass_draw_user_totals: ["update"],
  grass_draw_winners: ["update"],
};
const RPCS = ["recompute_double_burn_progression", "recalculate_draw_totals"];
const STEPS = ["select", "eq", "neq", "gt", "gte", "lt", "lte", "ilike", "like", "in", "is", "not", "or", "match", "order", "limit", "single", "maybeSingle"];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!isAdminRequest(req)) return res.status(401).json({ error: "Admin authorization required" });
  const { table, op, args, steps, rpc } = req.body || {};
  const db = adminClient();
  try {
    if (rpc) {
      if (!RPCS.includes(rpc)) return res.status(403).json({ error: "Function not allowed." });
      const { data, error } = await db.rpc(rpc, args || {});
      return res.status(200).json({ data: data ?? null, error: error ? { message: error.message, code: error.code } : null });
    }
    if (table === "__ping") return res.status(200).json({ ok: true });
    if (!TABLES[table] || !TABLES[table].includes(op)) return res.status(403).json({ error: "Not allowed." });
    let q = db.from(table)[op](...(Array.isArray(args) ? args : []));
    for (const [m, a] of Array.isArray(steps) ? steps : []) {
      if (!STEPS.includes(m)) return res.status(400).json({ error: "Bad query." });
      q = q[m](...(Array.isArray(a) ? a : []));
    }
    const { data, error, count } = await q;
    return res.status(200).json({ data: data ?? null, count: count ?? null, error: error ? { message: error.message, code: error.code, details: error.details } : null });
  } catch (e) {
    return res.status(500).json({ error: "Query failed." });
  }
}
