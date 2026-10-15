// pages/api/wago-drops/my-saves.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.google_id) return res.status(401).json({ error: "Not authenticated" });

  // Fetch saves
  const { data: saves, error } = await supabase
    .from("wago_drop_saves")
    .select("id, saved_at, location_id")
    .eq("google_id", session.user.google_id)
    .order("saved_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  if (!saves?.length) return res.status(200).json({ saves: [] });

  // Fetch locations
  const locationIds = saves.map(s => s.location_id);
  const { data: locations } = await supabase
    .from("wago_drop_locations")
    .select("id, hint, lat, lng, campaign_id")
    .in("id", locationIds);

  // Fetch campaigns
  const campaignIds = [...new Set((locations || []).map(l => l.campaign_id))];
  const { data: campaigns } = await supabase
    .from("wago_drop_campaigns")
    .select("id, name, reward_type, reward_amount")
    .in("id", campaignIds);

  const locMap = {};
  (locations || []).forEach(l => { locMap[l.id] = l; });
  const campMap = {};
  (campaigns || []).forEach(c => { campMap[c.id] = c; });

  const result = saves.map(s => {
    const loc = locMap[s.location_id] || {};
    const camp = campMap[loc.campaign_id] || {};
    return {
      id: s.id,
      saved_at: s.saved_at,
      location_id: s.location_id,
      lat: loc.lat,
      lng: loc.lng,
      hint: loc.hint,
      campaign_id: loc.campaign_id,
      campaign_name: camp.name,
      reward_type: camp.reward_type,
      reward_amount: camp.reward_amount,
    };
  });

  return res.status(200).json({ saves: result });
}