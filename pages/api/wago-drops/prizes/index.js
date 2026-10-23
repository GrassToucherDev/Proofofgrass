import { createClient } from "@supabase/supabase-js";
import { publicPrize, loadSpots, parsePos } from "../../../../utils/prizes";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const { data, error } = await supabase.from("wago_prizes").select("*").eq("status", "active")
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`).order("created_at", { ascending: false }).limit(100);
  if (error) return res.status(200).json({ prizes: [] });
  const { spots, codes } = await loadSpots(supabase, data.map(p => p.id));
  const pos = parsePos(req.query);
  const prizes = data.map(p => publicPrize(p, spots[p.id], codes[p.id], pos))
    .sort((a, b) => (b.remaining > 0) - (a.remaining > 0));
  return res.status(200).json({ prizes });
}
