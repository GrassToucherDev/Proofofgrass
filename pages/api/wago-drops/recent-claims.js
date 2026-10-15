// pages/api/wago-drops/recent-claims.js
// Returns the last N claims with campaign name + reward info (no hint, no coords)
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const limit = Math.min(Number(req.query.limit) || 20, 50);

  const { data: claims, error } = await supabase
    .from("wago_drop_claims")
    .select(`
      id,
      claimed_at,
      wago_drop_locations (
        id,
        campaign_id,
        wago_drop_campaigns (
          name,
          reward_type,
          reward_amount
        )
      )
    `)
    .order("claimed_at", { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });

  const result = (claims || []).map(c => {
    const loc      = c.wago_drop_locations;
    const campaign = loc?.wago_drop_campaigns;
    return {
      id:            c.id,
      claimed_at:    c.claimed_at,
      campaign_name: campaign?.name         || "Mystery Drop",
      reward_type:   campaign?.reward_type  || "touchgrass",
      reward_amount: campaign?.reward_amount || 0,
    };
  });

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ claims: result });
}