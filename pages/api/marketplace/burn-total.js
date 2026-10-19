// GET /api/marketplace/burn-total — total $TOUCHGRASS spent in the marketplace, across everyone.
// Server-side on purpose: the browser's Supabase key can only see rows RLS lets it see, which is why
// the old client-side sum showed 0. Source of truth is the MarketplacePurchases ledger.
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    let total = 0, orders = 0;
    const PAGE = 1000;                       // PostgREST returns at most 1000 rows per request
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await sb.from("MarketplacePurchases")
        .select("touchgrass_paid")
        .eq("status", "approved")
        .order("created_at", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      for (const r of data || []) { total += parseFloat(r.touchgrass_paid) || 0; orders += 1; }
      if (!data || data.length < PAGE) break;
    }
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({ total, orders });
  } catch (e) {
    console.error("[burn-total]", e);
    return res.status(500).json({ error: "Couldn't load total" });
  }
}
