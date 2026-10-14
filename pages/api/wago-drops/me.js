// pages/api/wago-drops/me.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.google_id) return res.status(401).json({ error: "Not authenticated" });

  const { data, error } = await supabase
    .from("wago_google_accounts")
    .select("google_id, email, display_name, avatar_url, linked_wallet, wallet_linked_at")
    .eq("google_id", session.user.google_id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}