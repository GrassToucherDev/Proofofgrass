// pages/api/wago-drops/save.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.google_id) return res.status(401).json({ error: "Not authenticated" });

  const { locationId } = req.body;
  if (!locationId) return res.status(400).json({ error: "locationId required" });

  const { error } = await supabase
    .from("wago_drop_saves")
    .upsert({ location_id: locationId, google_id: session.user.google_id },
             { onConflict: "location_id,google_id" });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}