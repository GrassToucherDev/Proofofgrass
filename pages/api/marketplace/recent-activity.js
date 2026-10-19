// GET /api/marketplace/recent-activity — the latest real marketplace purchases for the "Live Activity" strip.
// Server-side so it isn't limited by what the browser's key can read. Only username, item and time are returned
// (never wallet addresses or transaction signatures).
import { createClient } from "@supabase/supabase-js";
import { MARKET_ITEM_NAMES } from "../../../utils/marketplaceCatalog";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { data, error } = await sb.from("MarketplacePurchases")
      .select("username,item_id,item_name,created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    const items = (data || []).map(r => ({
      username: String(r.username || "").replace(/^@/, ""),
      item: MARKET_ITEM_NAMES[r.item_id] || r.item_name || r.item_id,
      item_id: r.item_id,
      at: r.created_at,
    }));
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");
    return res.status(200).json({ items });
  } catch (e) {
    console.error("[recent-activity]", e);
    return res.status(500).json({ error: "Couldn't load activity" });
  }
}
