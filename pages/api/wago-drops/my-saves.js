// pages/api/wago-drops/my-saves.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.google_id) return res.status(401).json({ error: "Not authenticated" });

  const { data, error } = await supabase
    .from("wago_drop_saves")
    .select(`id, saved_at,
             wago_drop_locations ( id, hint, lat, lng, campaign_id,
               wago_drop_campaigns ( name, reward_type, reward_amount ) )`)
    .eq("google_id", session.user.google_id)
    .order("saved_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ saves: data || [] });
}